import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { savePushToken, getDb, deactivatePushToken, trackSubscriptionClick, trackActiveUser, getActiveUserCount, getDailyActiveUserCount, getSubscriptionClickCount, getSubscriptionClicks } from "../db";
import { recipeImages } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { GoogleAuth } from "google-auth-library";
import * as fs from "fs";
import * as pushStore from "../push-store";
import * as recipeImageStore from "../recipe-image-store";
import { sendExpoPushNotifications } from "../expo-push";

// ===== FCM V1 API Direct Send =====
let _fcmAccessToken: string | null = null;
let _fcmTokenExpiry = 0;
async function getFCMAccessToken(): Promise<string | null> {
  try {
    if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken;
    
    let authConfig: any;
    
    // Try environment variable first (for Render deployment)
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (serviceAccountBase64) {
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const credentials = JSON.parse(serviceAccountJson);
      authConfig = {
        credentials,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      };
    } else {
      // Fallback to file (for local development)
      const serviceAccountPath = path.join(process.cwd(), 'server', 'firebase-service-account.json');
      if (!fs.existsSync(serviceAccountPath)) {
        console.error('[FCM] Service account file not found and FIREBASE_SERVICE_ACCOUNT_BASE64 not set');
        return null;
      }
      authConfig = {
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      };
    }
    
    const auth = new GoogleAuth(authConfig);
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    _fcmAccessToken = tokenResponse.token || null;
    _fcmTokenExpiry = Date.now() + 55 * 60 * 1000;
    console.log('[FCM] Got access token, expires in 55 min');
    return _fcmAccessToken;
  } catch (e) {
    console.error('[FCM] Failed to get access token:', e);
    return null;
  }
}

async function sendPushViaFCM(tokens: string[], title: string, body: string, dbDeactivate?: (token: string) => Promise<void>) {
  const expoTokens = tokens.filter((token) => /^(Exponent|Expo)PushToken\[/.test(token));
  const fcmTokens = tokens.filter((token) => token.startsWith('fcm:'));
  let successCount = 0;
  let failCount = 0;

  // Send Expo tokens, then inspect tickets and receipts instead of treating HTTP acceptance as delivery.
  if (expoTokens.length > 0) {
    try {
      const expoResult = await sendExpoPushNotifications({
        tokens: expoTokens,
        title,
        body,
        deactivate: dbDeactivate,
      });
      successCount += expoResult.successCount;
      failCount += expoResult.failCount;
    } catch (err) {
      console.error('[Push] Expo send failed:', err);
      failCount += expoTokens.length;
    }
  }

  // Send FCM tokens via Firebase FCM V1 API directly
  if (fcmTokens.length > 0) {
    const accessToken = await getFCMAccessToken();
    if (!accessToken) {
      failCount += fcmTokens.length;
      console.error('[Push] No FCM access token available');
    } else {
      const projectId = 'awafiyat';
      for (const token of fcmTokens) {
        const rawToken = token.startsWith('fcm:') ? token.substring(4) : token;
        try {
          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token: rawToken,
                  notification: { title, body },
                  android: {
                    priority: 'normal',
                    notification: {
                      sound: 'default',
                      channel_id: 'admin_updates',
                    },
                  },
                  data: { type: 'admin_notification' },
                },
              }),
            }
          );
          const result = await response.json();
          if (response.ok) {
            successCount++;
            console.log('[Push] FCM V1 sent successfully:', result.name);
          } else {
            failCount++;
            console.warn('[Push] FCM V1 error:', JSON.stringify(result));
            // Auto-deactivate UNREGISTERED tokens
            const errorCode = result?.error?.details?.[0]?.errorCode;
            if ((errorCode === 'UNREGISTERED' || result?.error?.status === 'NOT_FOUND') && dbDeactivate) {
              await dbDeactivate(token);
              console.log('[Push] Deactivated unregistered FCM token:', token.substring(0, 25));
            }
          }
        } catch (error) {
          failCount++;
          console.error('[Push] FCM V1 failed for token:', rawToken?.substring(0, 20), error);
        }
      }
    }
  }

  console.log(`[Push] Total: ${tokens.length} (${expoTokens.length} Expo + ${fcmTokens.length} FCM), success: ${successCount}, fail: ${failCount}`);
  return { successCount, failCount, sentCount: tokens.length };
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    const dbUrl = process.env.DATABASE_URL || "";
    const dbType = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")
      ? "postgres"
      : dbUrl.startsWith("mysql://")
        ? "mysql"
        : "unknown";
    res.json({ ok: true, timestamp: Date.now(), db_type: dbType });
  });
  app.get("/api/db-test", async (_req, res) => {
    try {
      const { Pool } = await import("pg");
      const dbUrl = process.env.DATABASE_URL || "";
      const useSSL = dbUrl.includes("dpg-") || dbUrl.includes("render.com") || dbUrl.includes("sslmode=require");
      const pool = new Pool({ connectionString: dbUrl, ssl: useSSL ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000 });
      const result = await pool.query("SELECT current_database() AS db");
      await pool.end();
      res.json({ ok: true, database: result.rows[0].db, ssl: useSSL });
    } catch (err: any) {
      res.status(503).json({ ok: false, error: "Database connection failed", code: err.code || "DB_CONNECTION_FAILED" });
    }
  });

  // Serve landing page at root /
  const __filename_local = fileURLToPath(import.meta.url);
  const __dirname_local = path.dirname(__filename_local);
  const landingCandidates = [
    path.resolve(__dirname_local, "../public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "server/public"),
  ];
  let landingHtml = "";
  for (const candidate of landingCandidates) {
    const htmlPath = path.join(candidate, "index.html");
    if (fs.existsSync(htmlPath)) {
      landingHtml = fs.readFileSync(htmlPath, "utf-8");
      console.log(`[Landing] Serving from: ${candidate}`);
      break;
    }
  }
  if (landingHtml) {
    app.get("/", (_req, res) => res.type("html").send(landingHtml));
    app.get("/index.html", (_req, res) => res.type("html").send(landingHtml));
  }

  // Serve admin panel - read HTML into memory and serve directly
  const fs2 = fs;
  const __filename_local2 = __filename_local;
  const __dirname_local2 = __dirname_local;
  const adminCandidates = [
    path.resolve(__dirname_local, "../admin"),
    path.resolve(__dirname_local, "admin"),
    path.resolve(process.cwd(), "dist/admin"),
    path.resolve(process.cwd(), "server/admin"),
  ];
  let adminDir = adminCandidates[3];
  for (const candidate of adminCandidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      adminDir = candidate;
      break;
    }
  }
  console.log(`[Admin] Serving admin panel from: ${adminDir}`);
  // Read admin HTML into memory at startup so it works regardless of static file serving issues
  let adminHtml = "<h1>Admin panel not found</h1>";
  try {
    adminHtml = fs.readFileSync(path.join(adminDir, "index.html"), "utf-8");
    console.log(`[Admin] HTML loaded successfully (${adminHtml.length} bytes)`);
  } catch (e) {
    console.error(`[Admin] Failed to load index.html:`, e);
  }
  // Serve admin HTML directly from memory
  // Use /api/admin-panel path so it works on production (platform only proxies /api/* to server)
  // Also keep /admin for local dev convenience
  app.get("/api/admin-panel", (_req, res) => {
    res.type("html").send(adminHtml);
  });
  app.get("/api/admin-panel/", (_req, res) => {
    res.type("html").send(adminHtml);
  });
  app.get("/admin", (_req, res) => {
    res.type("html").send(adminHtml);
  });
  app.get("/admin/", (_req, res) => {
    res.type("html").send(adminHtml);
  });

  // ==================== ADMIN REST API ====================
  const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'awafiyat2025';

  // Admin auth middleware
  function adminAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const token = authHeader.replace('Basic ', '').replace('Bearer ', '');
      const decoded = Buffer.from(token, 'base64').toString();
      const [user, pass] = decoded.split(':');
      if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
      return res.status(401).json({ error: 'Invalid credentials' });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Admin login
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      res.json({ success: true, token, name: 'زكريا صلاح' });
    } else {
      res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة' });
    }
  });

  // Import admin db functions
  const adminDb = await import('../db');

  // Dashboard stats
  app.get('/api/admin/dashboard', adminAuth, async (_req, res) => {
    try {
      const stats = await adminDb.getDashboardStats();
      const countryStats = await adminDb.getUsersByCountry();
      const dailyStats = await adminDb.getDailyStats(30);
      res.json({ ...stats, countryStats, dailyStats });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Users
  app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = await adminDb.getAllUsers(limit, offset);
      const total = await adminDb.getUserCount();
      res.json({ users, total });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/users/:id/status', adminAuth, async (req, res) => {
    try {
      await adminDb.updateUserStatus(parseInt(req.params.id), req.body.isActive);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/users/:id/role', adminAuth, async (req, res) => {
    try {
      await adminDb.updateUserRole(parseInt(req.params.id), req.body.role);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Subscriptions
  app.get('/api/admin/subscriptions', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const subs = await adminDb.getAllSubscriptions(limit, offset);
      const activeCount = await adminDb.getActiveSubscriptionCount();
      res.json({ subscriptions: subs, activeCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Promo codes
  app.get('/api/admin/promo-codes', adminAuth, async (_req, res) => {
    try {
      const codes = await adminDb.getAllPromoCodes();
      res.json(codes);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/promo-codes', adminAuth, async (req, res) => {
    try {
      await adminDb.createPromoCode({
        code: req.body.code.toUpperCase(),
        maxUses: req.body.maxUses || 100,
        durationDays: req.body.durationDays || 30,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/promo-codes/:id/toggle', adminAuth, async (req, res) => {
    try {
      await adminDb.togglePromoCode(parseInt(req.params.id), req.body.isActive);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Feedback
  app.get('/api/admin/feedback', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const feedbackList = await adminDb.getAllFeedback(limit, offset);
      const total = await adminDb.getFeedbackCount();
      res.json({ feedback: feedbackList, total });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/feedback/:id', adminAuth, async (req, res) => {
    try {
      await adminDb.updateFeedbackStatus(parseInt(req.params.id), req.body.status, req.body.adminNote);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Notifications
  app.get('/api/admin/notifications', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const notifs = pushStore.isPostgresPushStoreEnabled()
        ? await pushStore.getPostgresAdminNotifications(limit, offset)
        : await adminDb.getAllNotifications(limit, offset);
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/notifications/send', adminAuth, async (req, res) => {
    try {
      const { title, body, targetType, targetValue } = req.body;
      if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) {
        return res.status(400).json({ error: "title and body are required" });
      }

      const normalizedTargetType: "all" | "country" = targetType === "country" ? "country" : "all";
      let tokenRows: Array<{ token: string }> = [];

      if (pushStore.isPostgresPushStoreEnabled()) {
        tokenRows = normalizedTargetType === "country" && targetValue
          ? await pushStore.getPostgresPushTokensByCountry(String(targetValue))
          : await pushStore.getPostgresActivePushTokens();
      } else {
        tokenRows = normalizedTargetType === "country" && targetValue
          ? await adminDb.getPushTokensByCountry(String(targetValue))
          : await adminDb.getActivePushTokens();
      }

      const tokens = [...new Set(tokenRows.map((row) => row.token))];
      const notificationInput = {
        title: title.trim(),
        body: body.trim(),
        targetType: normalizedTargetType,
        targetValue: targetValue ? String(targetValue) : null,
        sentCount: tokens.length,
      };
      const notifId = pushStore.isPostgresPushStoreEnabled()
        ? await pushStore.createPostgresAdminNotification(notificationInput)
        : await adminDb.createNotification(notificationInput);

      // Expo/FCM ينفذان التسليم في الخلفية؛ التطبيق لا يطلب Full Screen Intent لهذا النوع.
      let successCount = 0;
      let failCount = 0;
      if (tokens.length > 0) {
        console.log('[Push] Sending to', tokens.length, 'registered devices');
        const deactivateToken = pushStore.isPostgresPushStoreEnabled()
          ? pushStore.deactivatePostgresPushToken
          : deactivatePushToken;
        const result = await sendPushViaFCM(tokens, notificationInput.title, notificationInput.body, deactivateToken);
        successCount = result.successCount;
        failCount = result.failCount;
        if (notifId) {
          if (pushStore.isPostgresPushStoreEnabled()) {
            await pushStore.updatePostgresNotificationCounts(notifId, tokens.length, successCount, failCount);
          } else {
            await adminDb.updateNotificationCounts(notifId, tokens.length, successCount, failCount);
          }
        }
      }

      res.json({ success: true, sentCount: tokens.length, successCount, failCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== RECIPES API ====================
  const recipesApi = await import('../admin/recipes-api');

  const loadRecipeImageOverrides = async (): Promise<Record<string, string>> => {
    if (recipeImageStore.isPostgresRecipeImageStoreEnabled()) {
      // Preserve images uploaded by older releases before they used a durable table.
      const legacyUploadedImages = Object.fromEntries(
        recipesApi
          .getAllRecipes()
          .filter((recipe) =>
            typeof recipe.image === 'string' &&
            recipe.image.startsWith('https://') &&
            recipe.image.includes('/recipe-images/'),
          )
          .map((recipe) => [recipe.id, recipe.image as string]),
      );
      await recipeImageStore.seedPostgresRecipeImages(legacyUploadedImages);
      return recipeImageStore.getPostgresRecipeImages();
    }

    const db = await getDb();
    if (!db) return {};
    const dbImages = await db.select().from(recipeImages);
    return Object.fromEntries(dbImages.map((image) => [image.recipeId, image.imageUrl]));
  };

  app.get('/api/admin/recipes', adminAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string) || '';
      const category = (req.query.category as string) || '';
      const origin = (req.query.origin as string) || '';
      let recipes = recipesApi.getAllRecipes();
      if (search) recipes = recipes.filter(r => r.name.includes(search) || r.description.includes(search));
      if (category) recipes = recipes.filter(r => r.category === category);
      if (origin) recipes = recipes.filter(r => (r.origin || 'general') === origin);
      const total = recipes.length;
      const offset = (page - 1) * limit;
      const imageOverrides = await loadRecipeImageOverrides();
      const paginated = recipes.slice(offset, offset + limit).map((recipe) => ({
        ...recipe,
        image: imageOverrides[recipe.id] ?? recipe.image,
        customImageUrl: imageOverrides[recipe.id] ?? null,
      }));
      res.json({ recipes: paginated, total, page, totalPages: Math.ceil(total / limit) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/recipes/stats', adminAuth, async (_req, res) => {
    try {
      const stats = recipesApi.getRecipeStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/recipes/:id', adminAuth, async (req, res) => {
    try {
      const recipes = recipesApi.getAllRecipes();
      const recipe = recipes.find(r => r.id === req.params.id);
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
      const imageOverrides = await loadRecipeImageOverrides();
      const customImageUrl = imageOverrides[recipe.id] ?? null;
      res.json({
        ...recipe,
        image: customImageUrl ?? recipe.image,
        customImageUrl,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/recipes', adminAuth, async (req, res) => {
    try {
      const success = recipesApi.addRecipe(req.body);
      if (success) res.json({ success: true });
      else res.status(500).json({ error: 'Failed to add recipe' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/recipes/:id', adminAuth, async (req, res) => {
    try {
      const success = recipesApi.updateRecipe(req.params.id, req.body);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Recipe not found' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/recipes/:id', adminAuth, async (req, res) => {
    try {
      const success = recipesApi.deleteRecipe(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Recipe not found' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== IMAGE UPLOAD ====================
  app.post('/api/admin/upload-image', adminAuth, async (req, res) => {
    try {
      const { imageData, fileName, contentType, recipeId } = req.body;
      if (!imageData || !fileName) {
        return res.status(400).json({ error: 'imageData and fileName are required' });
      }
      // imageData is base64 encoded
      const buffer = Buffer.from(imageData, 'base64');
      const { storagePut } = await import('../storage');
      const fileKey = `recipe-images/${fileName}`;
      const { url } = await storagePut(fileKey, buffer, contentType || 'image/jpeg');
      console.log('[Upload] Image uploaded successfully:', url);
      
      // Save the override atomically when the dashboard sends a recipeId.
      if (recipeId) {
        if (recipeImageStore.isPostgresRecipeImageStoreEnabled()) {
          await recipeImageStore.savePostgresRecipeImage(String(recipeId), url);
        } else {
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          const existing = await db.select().from(recipeImages).where(eq(recipeImages.recipeId, String(recipeId)));
          if (existing.length > 0) {
            await db.update(recipeImages).set({ imageUrl: url }).where(eq(recipeImages.recipeId, String(recipeId)));
          } else {
            await db.insert(recipeImages).values({ recipeId: String(recipeId), imageUrl: url });
          }
        }
        console.log('[Upload] Recipe image override saved for:', recipeId);
      }
      
      res.json({ success: true, url });
    } catch (e: any) {
      console.error('[Upload] Failed to upload image:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Save recipe image URL to DB (called when updating recipe with image)
  app.post('/api/admin/recipe-image', adminAuth, async (req, res) => {
    try {
      const { recipeId, imageUrl } = req.body;
      if (!recipeId || !imageUrl) {
        return res.status(400).json({ error: 'recipeId and imageUrl are required' });
      }
      if (recipeImageStore.isPostgresRecipeImageStoreEnabled()) {
        await recipeImageStore.savePostgresRecipeImage(String(recipeId), String(imageUrl));
      } else {
        const db = await getDb();
        if (!db) return res.status(500).json({ error: 'Database not available' });
        const existing = await db.select().from(recipeImages).where(eq(recipeImages.recipeId, String(recipeId)));
        if (existing.length > 0) {
          await db.update(recipeImages).set({ imageUrl: String(imageUrl) }).where(eq(recipeImages.recipeId, String(recipeId)));
        } else {
          await db.insert(recipeImages).values({ recipeId: String(recipeId), imageUrl: String(imageUrl) });
        }
      }
      res.json({ success: true, recipeId, imageUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== PUBLIC RECIPE IMAGES API ====================
  // Returns admin-uploaded overrides only. Built-in/category images stay inside the app.
  app.get('/api/recipes/images', async (_req, res) => {
    try {
      const imageMap = await loadRecipeImageOverrides();

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Awafiyat-Recipe-Images-Version', '5');
      res.json(imageMap);
    } catch (e: any) {
      console.error('[Images] Failed to load recipe image overrides:', e);
      res.status(500).json({ error: 'Failed to load recipe image overrides' });
    }
  });

  // ==================== CONTENT MANAGEMENT ====================
  app.get('/api/admin/content', adminAuth, async (_req, res) => {
    try {
      const content = recipesApi.getContent();
      res.json(content);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/content', adminAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      const success = recipesApi.updateContent(key, value);
      if (success) res.json({ success: true });
      else res.status(500).json({ error: 'Failed to update content' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== EXPORT DATA ====================
  app.get('/api/admin/export/users', adminAuth, async (_req, res) => {
    try {
      const allUsers = await adminDb.getAllUsers(10000, 0);
      const csv = ['الاسم,البريد,الدولة,الدور,الحالة,تاريخ التسجيل,آخر دخول'];
      for (const u of allUsers) {
        csv.push(`"${u.name||''}","${u.email||''}","${u.country||''}","${u.role}","${u.isActive?'فعال':'معطل'}","${u.createdAt}","${u.lastSignedIn}"`);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send('\uFEFF' + csv.join('\n'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/export/subscriptions', adminAuth, async (_req, res) => {
    try {
      const allSubs = await adminDb.getAllSubscriptions(10000, 0);
      const csv = ['المعرف,المستخدم,الخطة,الحالة,كود الترويج,تاريخ البدء,تاريخ الانتهاء'];
      for (const s of allSubs) {
        csv.push(`"${s.id}","${s.userId||''}","${s.plan}","${s.status}","${s.promoCode||''}","${s.startDate}","${s.endDate||""}"`);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
      res.send('\uFEFF' + csv.join('\n'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/export/recipes', adminAuth, async (_req, res) => {
    try {
      const recipes = recipesApi.getAllRecipes();
      const csv = ['المعرف,الاسم,التصنيف,الأصل,الصعوبة,وقت التحضير,وقت الطبخ,السعرات,الحصص'];
      for (const r of recipes) {
        csv.push(`"${r.id}","${r.name}","${r.category}","${r.origin||'general'}","${r.difficulty}","${r.prepTime}","${r.cookTime}","${r.calories}","${r.servings}"`);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=recipes.csv');
      res.send('\uFEFF' + csv.join('\n'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== USER API ====================
  // Auto-register guest user (no OAuth needed)
  app.post('/api/user/register-guest', async (req, res) => {
    try {
      const { deviceId, name, country, platform: clientPlatform } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      const db = (await import('../db')).getDb;
      const dbInstance = await db();
      if (!dbInstance) return res.status(500).json({ error: 'DB not available' });

      const { users } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      // Check if guest already exists
      const existing = await dbInstance.select().from(users).where(eq(users.openId, `guest_${deviceId}`)).limit(1);
      if (existing.length > 0) {
        // Update last signed in
        await dbInstance.update(users).set({ lastSignedIn: new Date(), name: name || existing[0].name, country: country || existing[0].country }).where(eq(users.openId, `guest_${deviceId}`));
        return res.json({ success: true, userId: existing[0].id, isNew: false });
      }

      // Create new guest user
      const result = await dbInstance.insert(users).values({
        openId: `guest_${deviceId}`,
        name: name || 'مستخدم عافيات',
        loginMethod: 'guest',
        role: 'user',
        country: country || 'iraq',
        isActive: true,
      });

      const newUserId = (result as any)[0].insertId;
      console.log('[Guest] New guest registered:', { deviceId, userId: newUserId });
      res.json({ success: true, userId: newUserId, isNew: true });
    } catch (e: any) {
      console.error('[Guest] Failed to register guest:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Register push token
  app.post('/api/user/push-token', async (req, res) => {
    try {
      const { token, userId, platform: clientPlatform, country, deviceId } = req.body;
      if (typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ error: "Token is required" });
      }

      const normalizedToken = token.trim();
      const isExpoToken = /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(normalizedToken);
      const isFcmToken = normalizedToken.startsWith("fcm:") && normalizedToken.length > 8;
      if (!isExpoToken && !isFcmToken) {
        return res.status(400).json({ error: "Unsupported push token format" });
      }

      // Detect platform from user-agent or client param
      const ua = req.headers['user-agent'] || '';
      let detectedPlatform: 'ios' | 'android' | 'web' = 'android';
      if (clientPlatform === 'ios' || ua.includes('iPhone') || ua.includes('iPad')) detectedPlatform = 'ios';
      else if (clientPlatform === 'web') detectedPlatform = 'web';

      const parsedUserId = Number(userId);
      const normalizedUserId = Number.isSafeInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
      if (pushStore.isPostgresPushStoreEnabled()) {
        await pushStore.savePostgresPushToken({
          token: normalizedToken,
          userId: normalizedUserId,
          platform: detectedPlatform,
          country: typeof country === "string" ? country.slice(0, 64) : null,
          deviceId: typeof deviceId === "string" ? deviceId.slice(0, 255) : null,
        });
      } else {
        await savePushToken({
          token: normalizedToken,
          userId: normalizedUserId,
          platform: detectedPlatform,
        });
      }

      console.log('[Push] Token registered successfully for platform:', detectedPlatform);
      res.json({ success: true, message: 'Push token registered' });
    } catch (e: any) {
      console.error('[Push] Failed to register push token:', e);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  // Admin: List all push tokens (for debugging)
  app.get('/api/admin/push-tokens-list', adminAuth, async (_req, res) => {
    try {
      const tokens = pushStore.isPostgresPushStoreEnabled()
        ? await pushStore.getPostgresActivePushTokens()
        : await adminDb.getActivePushTokens();
      res.json({ tokens, count: tokens.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/push-health', adminAuth, async (_req, res) => {
    try {
      if (!pushStore.isPostgresPushStoreEnabled()) {
        return res.json({ ok: true, database: "mysql" });
      }
      res.json(await pushStore.getPostgresPushStoreStatus());
    } catch (e: any) {
      res.status(503).json({ ok: false, error: "Push store unavailable" });
    }
  });

  // Admin: Delete test push tokens while preserving valid Expo/FCM registrations.
  app.delete('/api/admin/push-tokens-cleanup', adminAuth, async (_req, res) => {
    try {
      if (pushStore.isPostgresPushStoreEnabled()) {
        const deleted = await pushStore.cleanupPostgresPushTokens();
        const remaining = await pushStore.getPostgresActivePushTokens();
        return res.json({ success: true, deleted, remaining: remaining.length });
      }

      const db = (await import('../db')).getDb;
      const dbInstance = await db();
      if (!dbInstance) return res.status(500).json({ error: 'DB not available' });
      const { sql } = await import('drizzle-orm');
      await dbInstance.execute(sql`DELETE FROM push_tokens WHERE token LIKE 'test%'`);
      const remaining = await adminDb.getActivePushTokens();
      res.json({ success: true, remaining: remaining.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== SUBSCRIPTION CLICK TRACKING ====================
  // Called from app when user taps subscribe button
  app.post('/api/user/subscription-click', async (req, res) => {
    try {
      const { userId, deviceId, country, plan, source } = req.body;
      await trackSubscriptionClick({ userId, deviceId, country, plan, source });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== ACTIVE USER TRACKING ====================
  // Called from app on app open/foreground
  app.post('/api/user/heartbeat', async (req, res) => {
    try {
      const { userId, deviceId, platform: clientPlatform } = req.body;
      if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
      const ua = req.headers['user-agent'] || '';
      let detectedPlatform: 'ios' | 'android' | 'web' = 'android';
      if (clientPlatform === 'ios' || ua.includes('iPhone') || ua.includes('iPad')) detectedPlatform = 'ios';
      else if (clientPlatform === 'web') detectedPlatform = 'web';
      await trackActiveUser({ userId, deviceId, platform: detectedPlatform });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get active user stats
  app.get('/api/admin/active-users', adminAuth, async (_req, res) => {
    try {
      const last15min = await getActiveUserCount(15);
      const last60min = await getActiveUserCount(60);
      const today = await getDailyActiveUserCount();
      res.json({ last15min, last60min, today });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get subscription click stats
  app.get('/api/admin/subscription-clicks', adminAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const count = await getSubscriptionClickCount(days);
      const clicks = await getSubscriptionClicks(days);
      res.json({ count, clicks });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);

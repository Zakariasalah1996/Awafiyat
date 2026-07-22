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
  const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
  const fcmTokens = tokens.filter(t => !t.startsWith('ExponentPushToken'));
  let successCount = 0;
  let failCount = 0;

  // Send ExponentPushToken via Expo Push API (legacy fallback)
  if (expoTokens.length > 0) {
    const messages = expoTokens.map((token: string) => ({
      to: token, sound: 'default', title, body,
      priority: 'high', channelId: 'meals',
      data: { type: 'admin_notification' },
    }));
    try {
      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      const pushData = await pushRes.json();
      if (pushData.data) {
        for (let i = 0; i < pushData.data.length; i++) {
          const ticket = pushData.data[i];
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            failCount++;
            console.warn('[Push] Expo ticket error:', ticket);
            // Deactivate invalid tokens
            if (ticket.details?.error === 'DeviceNotRegistered' && dbDeactivate) {
              await dbDeactivate(expoTokens[i]);
              console.log('[Push] Deactivated unregistered Expo token:', expoTokens[i].substring(0, 25));
            }
          }
        }
      }
    } catch (err) {
      console.error('[Push] Expo fetch error:', err);
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
                    priority: 'high',
                    notification: {
                      sound: 'default',
                      channel_id: 'meals',
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
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    res.json({ ok: true, timestamp: Date.now(), db_prefix: dbUrl.substring(0, 20), db_type: dbUrl.startsWith('postgresql') ? 'postgres' : dbUrl.startsWith('mysql') ? 'mysql' : 'unknown' });
  });
  app.get("/api/db-test", async (_req, res) => {
    try {
      const { Pool } = await import('pg');
      const dbUrl = process.env.DATABASE_URL || '';
      const useSSL = dbUrl.includes('dpg-') || dbUrl.includes('render.com') || dbUrl.includes('sslmode=require');
      const pool = new Pool({ connectionString: dbUrl, ssl: useSSL ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000 });
      const result = await pool.query('SELECT NOW() as now, current_database() as db');
      await pool.end();
      res.json({ ok: true, time: result.rows[0].now, db: result.rows[0].db, ssl: useSSL, url_prefix: dbUrl.substring(0, 40) });
    } catch (err: any) {
      res.json({ ok: false, error: err.message, code: err.code, url_prefix: (process.env.DATABASE_URL || '').substring(0, 40) });
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

  // Serve app-ads.txt for AdMob verification
  const publicCandidates = [
    path.resolve(__dirname_local, "../public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "server/public"),
  ];
  for (const candidate of publicCandidates) {
    const adsPath = path.join(candidate, "app-ads.txt");
    if (fs.existsSync(adsPath)) {
      const adsContent = fs.readFileSync(adsPath, "utf-8");
      app.get("/app-ads.txt", (_req, res) => res.type("text/plain").send(adsContent));
      console.log(`[app-ads.txt] Serving from: ${candidate}`);
      break;
    }
  }

  // Serve privacy.html
  for (const candidate of publicCandidates) {
    const privacyPath = path.join(candidate, "privacy.html");
    if (fs.existsSync(privacyPath)) {
      const privacyContent = fs.readFileSync(privacyPath, "utf-8");
      app.get("/privacy", (_req, res) => res.type("html").send(privacyContent));
      app.get("/privacy.html", (_req, res) => res.type("html").send(privacyContent));
      console.log(`[Privacy] Serving from: ${candidate}`);
      break;
    }
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
      const notifs = await adminDb.getAllNotifications(limit, offset);
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/notifications/send', adminAuth, async (req, res) => {
    try {
      const { title, body, targetType, targetValue } = req.body;
      let tokens: string[] = [];

      if (targetType === 'all') {
        const allTokens = await adminDb.getActivePushTokens();
        tokens = allTokens.map((t: any) => t.token);
      } else if (targetType === 'country' && targetValue) {
        const countryTokens = await adminDb.getPushTokensByCountry(targetValue);
        tokens = countryTokens.map((t: any) => t.token);
      }

      const notifId = await adminDb.createNotification({
        title, body, targetType: targetType || 'all', targetValue, sentCount: tokens.length,
      });

      // Send via FCM V1 API (direct) + Expo Push API (fallback for ExponentPushToken)
      let successCount = 0, failCount = 0;
      if (tokens.length > 0) {
        console.log('[Push] Sending to', tokens.length, 'tokens:', tokens.map(t => t.substring(0, 25) + '...'));
        const result = await sendPushViaFCM(tokens, title, body, deactivatePushToken);
        successCount = result.successCount;
        failCount = result.failCount;
        if (notifId) {
          await adminDb.updateNotificationCounts(notifId, tokens.length, successCount, failCount);
        }
      }

      res.json({ success: true, sentCount: tokens.length, successCount, failCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== RECIPES API ====================
  const recipesApi = await import('../admin/recipes-api');

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
      const paginated = recipes.slice(offset, offset + limit);
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
      res.json(recipe);
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
      
      // Also save to DB if recipeId is provided
      if (recipeId) {
        try {
          const db = await getDb();
          if (db) {
            const existing = await db.select().from(recipeImages).where(eq(recipeImages.recipeId, recipeId));
            if (existing.length > 0) {
              await db.update(recipeImages).set({ imageUrl: url }).where(eq(recipeImages.recipeId, recipeId));
            } else {
              await db.insert(recipeImages).values({ recipeId, imageUrl: url });
            }
            console.log('[Upload] Image URL saved to DB for recipe:', recipeId);
          }
        } catch (dbErr) {
          console.error('[Upload] Failed to save image URL to DB:', dbErr);
        }
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
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database not available' });
      
      const existing = await db.select().from(recipeImages).where(eq(recipeImages.recipeId, recipeId));
      if (existing.length > 0) {
        await db.update(recipeImages).set({ imageUrl }).where(eq(recipeImages.recipeId, recipeId));
      } else {
        await db.insert(recipeImages).values({ recipeId, imageUrl });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== PUBLIC RECIPE IMAGES API ====================
  // Public endpoint - returns recipe image URLs from DB first, then fallback to code file
  app.get('/api/recipes/images', async (_req, res) => {
    try {
      const imageMap: Record<string, string> = {};
      
      // 1. Get images from code file (fallback/default)
      const recipes = recipesApi.getAllRecipes();
      for (const r of recipes) {
        if (r.image && r.image.trim()) {
          imageMap[r.id] = r.image;
        }
      }
      
      // 2. Override with DB images (these are the user-uploaded ones that persist)
      try {
        const db = await getDb();
        if (db) {
          const dbImages = await db.select().from(recipeImages);
          for (const img of dbImages) {
            imageMap[img.recipeId] = img.imageUrl;
          }
        }
      } catch (dbErr) {
        console.error('[Images] Failed to load DB images:', dbErr);
      }
      
      res.json(imageMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
      const { token, userId, platform: clientPlatform } = req.body;
      console.log('[Push] Received push-token registration request:', { token: token?.substring(0, 30) + '...', userId, platform: clientPlatform });
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Detect platform from user-agent or client param
      const ua = req.headers['user-agent'] || '';
      let detectedPlatform: 'ios' | 'android' | 'web' = 'android';
      if (clientPlatform === 'ios' || ua.includes('iPhone') || ua.includes('iPad')) detectedPlatform = 'ios';
      else if (clientPlatform === 'web') detectedPlatform = 'web';

      // Register push token in database (userId is now optional)
      await savePushToken({
        token,
        userId: userId || null,
        platform: detectedPlatform,
      });

      console.log('[Push] Token registered successfully:', token.substring(0, 30) + '...', 'platform:', detectedPlatform);
      res.json({ success: true, message: 'Push token registered' });
    } catch (e: any) {
      console.error('[Push] Failed to register push token:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: List all push tokens (for debugging)
  app.get('/api/admin/push-tokens-list', adminAuth, async (_req, res) => {
    try {
      const tokens = await adminDb.getActivePushTokens();
      res.json({ tokens, count: tokens.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Delete invalid/test push tokens
  app.delete('/api/admin/push-tokens-cleanup', adminAuth, async (_req, res) => {
    try {
      const db = (await import('../db')).getDb;
      const dbInstance = await db();
      if (!dbInstance) return res.status(500).json({ error: 'DB not available' });
      const { sql } = await import('drizzle-orm');
      // Delete test tokens AND old ExponentPushToken entries (they no longer work)
      const deleteResult = await dbInstance.execute(
        sql`DELETE FROM push_tokens WHERE token LIKE 'test%' OR token LIKE 'ExponentPushToken%'`
      );
      const remaining = await adminDb.getActivePushTokens();
      res.json({ success: true, message: 'Cleaned up invalid and old Expo tokens', remaining: remaining.length });
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

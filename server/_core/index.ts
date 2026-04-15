import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

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

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Serve admin panel static files
  const adminDir = path.resolve(process.cwd(), "server/admin");
  app.use("/admin", express.static(adminDir));
  app.get("/admin", (_req, res) => {
    res.sendFile(path.join(adminDir, "index.html"));
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

      // Send via Expo Push API
      let successCount = 0, failCount = 0;
      if (tokens.length > 0) {
        const messages = tokens.map((token: string) => ({
          to: token, sound: 'default', title, body, data: { type: 'admin_notification' },
        }));
        try {
          const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
          const pushData = await pushRes.json();
          if (pushData.data) {
            for (const ticket of pushData.data) {
              if (ticket.status === 'ok') successCount++; else failCount++;
            }
          }
        } catch (err) {
          failCount = tokens.length;
        }
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

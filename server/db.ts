// Fix SSL self-signed certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { eq, desc, sql, and, count } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users,
  pushTokens, InsertPushToken,
  subscriptions, InsertSubscription,
  promoCodes, InsertPromoCode,
  feedback, InsertFeedback,
  notifications, InsertNotification,
  dailyStats, InsertDailyStat,
  subscriptionClicks, InsertSubscriptionClick,
  activeUserSessions, InsertActiveUserSession,
} from "../drizzle/schema";

// ==================== DATABASE CONNECTION ====================

function createDbConnection(): MySql2Database | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] DATABASE_URL not set - database features disabled");
    return null;
  }
  try {
    // Parse the URL to extract host info for logging
    const hostMatch = dbUrl.match(/@([^/]+)/);
    const host = hostMatch?.[1] ?? 'unknown';
    console.log(`[Database] Initializing MySQL connection (host: ${host})`);
    
    const pool = mysql.createPool({
      uri: dbUrl,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000,
    });
    
    return drizzle(pool);
  } catch (error: any) {
    console.error("[Database] Failed to initialize:", error.message);
    return null;
  }
}

// Single shared instance - created once at module load
const _db: MySql2Database | null = createDbConnection();

export function getDb(): MySql2Database | null {
  return _db;
}

// ==================== AUTO SCHEMA CREATION ====================
// Ensures all required tables exist on startup (for Render deployments where migrations may not have been run)
let _schemaEnsured = false;
let _schemaPromise: Promise<void> | null = null;

export async function ensureDatabaseSchema(): Promise<void> {
  if (_schemaEnsured) return;
  if (!_db) return;
  if (_schemaPromise) return _schemaPromise;
  _schemaPromise = (async () => {
    try {
      console.log('[Database] Ensuring schema tables exist...');
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return;
      const conn = await mysql.createConnection({ uri: dbUrl, ssl: { rejectUnauthorized: false } });
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`openId\` varchar(64) NOT NULL,
          \`name\` text,
          \`email\` varchar(320),
          \`loginMethod\` varchar(64),
          \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
          \`country\` varchar(32),
          \`isActive\` boolean NOT NULL DEFAULT true,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`users_id\` PRIMARY KEY (\`id\`),
          CONSTRAINT \`users_openId_unique\` UNIQUE (\`openId\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`push_tokens\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`userId\` int,
          \`token\` varchar(512) NOT NULL,
          \`platform\` enum('ios','android','web') NOT NULL,
          \`isActive\` boolean NOT NULL DEFAULT true,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`push_tokens_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`subscriptions\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`userId\` int,
          \`plan\` enum('free','monthly','yearly','promo') NOT NULL DEFAULT 'free',
          \`status\` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
          \`promoCode\` varchar(64),
          \`startDate\` timestamp NOT NULL DEFAULT (now()),
          \`endDate\` timestamp,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`subscriptions_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`promo_codes\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`code\` varchar(64) NOT NULL,
          \`maxUses\` int NOT NULL DEFAULT 1,
          \`currentUses\` int NOT NULL DEFAULT 0,
          \`durationDays\` int NOT NULL DEFAULT 30,
          \`isActive\` boolean NOT NULL DEFAULT true,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`expiresAt\` timestamp,
          CONSTRAINT \`promo_codes_id\` PRIMARY KEY (\`id\`),
          CONSTRAINT \`promo_codes_code_unique\` UNIQUE (\`code\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`feedback\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`userId\` int,
          \`userName\` varchar(255),
          \`type\` enum('bug','suggestion','complaint','praise','other') NOT NULL DEFAULT 'suggestion',
          \`message\` text NOT NULL,
          \`rating\` int,
          \`status\` enum('new','read','resolved','archived') NOT NULL DEFAULT 'new',
          \`adminNote\` text,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`feedback_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`notifications\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`title\` varchar(255) NOT NULL,
          \`body\` text NOT NULL,
          \`targetType\` enum('all','country','user') NOT NULL DEFAULT 'all',
          \`targetValue\` varchar(255),
          \`sentBy\` int,
          \`sentCount\` int NOT NULL DEFAULT 0,
          \`successCount\` int NOT NULL DEFAULT 0,
          \`failCount\` int NOT NULL DEFAULT 0,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`notifications_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`daily_stats\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`date\` varchar(10) NOT NULL,
          \`newUsers\` int NOT NULL DEFAULT 0,
          \`activeUsers\` int NOT NULL DEFAULT 0,
          \`newSubscriptions\` int NOT NULL DEFAULT 0,
          \`feedbackCount\` int NOT NULL DEFAULT 0,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`daily_stats_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`recipe_images\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`recipeId\` varchar(64) NOT NULL,
          \`imageUrl\` text NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`recipe_images_id\` PRIMARY KEY (\`id\`),
          CONSTRAINT \`recipe_images_recipeId_unique\` UNIQUE (\`recipeId\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`subscription_clicks\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`userId\` int,
          \`deviceId\` varchar(128),
          \`country\` varchar(32),
          \`plan\` varchar(32),
          \`source\` varchar(64),
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`subscription_clicks_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`active_user_sessions\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`userId\` int,
          \`deviceId\` varchar(128),
          \`platform\` enum('ios','android','web') NOT NULL,
          \`lastActiveAt\` timestamp NOT NULL DEFAULT (now()),
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`active_user_sessions_id\` PRIMARY KEY (\`id\`)
        )
      `);
      
      await conn.end();
      _schemaEnsured = true;
      console.log('[Database] Schema tables ensured successfully');
    } catch (error: any) {
      _schemaPromise = null;
      console.error('[Database] Failed to ensure schema:', error.message);
    }
  })();
  return _schemaPromise;
}

// ==================== USERS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  if (!_db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.country !== undefined) {
      values.country = user.country;
      updateSet.country = user.country;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await _db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  if (!_db) return undefined;
  const result = await _db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit = 100, offset = 0) {
  if (!_db) return [];
  return _db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function getUserCount() {
  if (!_db) return 0;
  const result = await _db.select({ count: count() }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  if (!_db) throw new Error("Database not available");
  await _db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  if (!_db) throw new Error("Database not available");
  await _db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUsersByCountry() {
  if (!_db) return [];
  return _db.select({
    country: users.country,
    count: count(),
  }).from(users).groupBy(users.country);
}

// ==================== PUSH TOKENS ====================

export async function savePushToken(data: InsertPushToken) {
  if (!_db) throw new Error("Database not available");
  const existing = await _db.select().from(pushTokens).where(eq(pushTokens.token, data.token)).limit(1);
  if (existing.length > 0) {
    await _db.update(pushTokens).set({ userId: data.userId, platform: data.platform, isActive: true }).where(eq(pushTokens.token, data.token));
  } else {
    await _db.insert(pushTokens).values(data);
  }
}

export async function getActivePushTokens() {
  if (!_db) return [];
  return _db.select().from(pushTokens).where(eq(pushTokens.isActive, true));
}

export async function getPushTokensByUserId(userId: number) {
  if (!_db) return [];
  return _db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
}

export async function getPushTokensByCountry(country: string) {
  if (!_db) return [];
  return _db.select({ token: pushTokens.token, platform: pushTokens.platform })
    .from(pushTokens)
    .innerJoin(users, eq(pushTokens.userId, users.id))
    .where(and(eq(users.country, country), eq(pushTokens.isActive, true)));
}

export async function deactivatePushToken(token: string) {
  if (!_db) return;
  await _db.update(pushTokens).set({ isActive: false }).where(eq(pushTokens.token, token));
}

// ==================== SUBSCRIPTIONS ====================

export async function createSubscription(data: InsertSubscription) {
  if (!_db) throw new Error("Database not available");
  await _db.insert(subscriptions).values(data);
}

export async function getAllSubscriptions(limit = 100, offset = 0) {
  if (!_db) return [];
  return _db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset);
}

export async function getActiveSubscriptionCount() {
  if (!_db) return 0;
  const result = await _db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  return Number(result[0]?.count ?? 0);
}

export async function getUserSubscription(userId: number) {
  if (!_db) return undefined;
  const result = await _db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function cancelUserSubscription(userId: number) {
  if (!_db) throw new Error("Database not available");
  await _db.update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
}

// ==================== PROMO CODES ====================

export async function createPromoCode(data: InsertPromoCode) {
  if (!_db) throw new Error("Database not available");
  await _db.insert(promoCodes).values(data);
}

export async function getAllPromoCodes() {
  if (!_db) return [];
  return _db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCodeByCode(code: string) {
  if (!_db) return undefined;
  const result = await _db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementPromoCodeUse(id: number) {
  if (!_db) throw new Error("Database not available");
  await _db.update(promoCodes).set({ currentUses: sql`${promoCodes.currentUses} + 1` }).where(eq(promoCodes.id, id));
}

export async function togglePromoCode(id: number, isActive: boolean) {
  if (!_db) throw new Error("Database not available");
  await _db.update(promoCodes).set({ isActive }).where(eq(promoCodes.id, id));
}

// ==================== FEEDBACK ====================

export async function createFeedback(data: InsertFeedback) {
  if (!_db) throw new Error("Database not available");
  await _db.insert(feedback).values(data);
}

export async function getAllFeedback(limit = 100, offset = 0) {
  if (!_db) return [];
  return _db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(limit).offset(offset);
}

export async function getFeedbackCount() {
  if (!_db) return 0;
  const result = await _db.select({ count: count() }).from(feedback);
  return Number(result[0]?.count ?? 0);
}

export async function updateFeedbackStatus(id: number, status: "new" | "read" | "resolved" | "archived", adminNote?: string) {
  if (!_db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (adminNote !== undefined) updateData.adminNote = adminNote;
  await _db.update(feedback).set(updateData).where(eq(feedback.id, id));
}

// ==================== NOTIFICATIONS ====================

export async function createNotification(data: InsertNotification): Promise<number | undefined> {
  if (!_db) throw new Error("Database not available");
  const result = await _db.insert(notifications).values(data);
  return result[0]?.insertId;
}

export async function getAllNotifications(limit = 50, offset = 0) {
  if (!_db) return [];
  return _db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
}

export async function updateNotificationCounts(id: number, sentCount: number, successCount: number, failCount: number) {
  if (!_db) throw new Error("Database not available");
  await _db.update(notifications).set({ sentCount, successCount, failCount }).where(eq(notifications.id, id));
}

// ==================== DAILY STATS ====================

export async function upsertDailyStat(data: InsertDailyStat) {
  if (!_db) throw new Error("Database not available");
  const existing = await _db.select().from(dailyStats).where(eq(dailyStats.date, data.date!)).limit(1);
  if (existing.length > 0) {
    await _db.update(dailyStats).set(data).where(eq(dailyStats.date, data.date!));
  } else {
    await _db.insert(dailyStats).values(data);
  }
}

export async function getDailyStats(days = 30) {
  if (!_db) return [];
  return _db.select().from(dailyStats).orderBy(desc(dailyStats.date)).limit(days);
}

export async function getDashboardStats() {
  if (!_db) return { totalUsers: 0, activeSubscriptions: 0, newFeedback: 0, totalNotifications: 0, freeSubscriptions: 0, monthlySubscriptions: 0, yearlySubscriptions: 0, promoSubscriptions: 0 };
  const [userCount] = await _db.select({ count: count() }).from(users);
  const [subCount] = await _db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  const [fbCount] = await _db.select({ count: count() }).from(feedback).where(eq(feedback.status, "new"));
  const [notifCount] = await _db.select({ count: count() }).from(notifications);
  const [freeCount] = await _db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "free")));
  const [monthlyCount] = await _db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "monthly")));
  const [yearlyCount] = await _db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "yearly")));
  const [promoCount] = await _db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "promo")));
  return {
    totalUsers: Number(userCount?.count ?? 0),
    activeSubscriptions: Number(subCount?.count ?? 0),
    newFeedback: Number(fbCount?.count ?? 0),
    totalNotifications: Number(notifCount?.count ?? 0),
    freeSubscriptions: Number(freeCount?.count ?? 0),
    monthlySubscriptions: Number(monthlyCount?.count ?? 0),
    yearlySubscriptions: Number(yearlyCount?.count ?? 0),
    promoSubscriptions: Number(promoCount?.count ?? 0),
  };
}

// ==================== SUBSCRIPTION CLICKS ====================

export async function trackSubscriptionClick(data: InsertSubscriptionClick) {
  if (!_db) return;
  try {
    await _db.insert(subscriptionClicks).values(data);
  } catch (error) {
    console.error("[Database] Failed to track subscription click:", error);
  }
}

export async function getSubscriptionClicks(days = 30) {
  if (!_db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  return _db.select().from(subscriptionClicks).where(
    sql`${subscriptionClicks.createdAt} >= ${since}`
  ).orderBy(desc(subscriptionClicks.createdAt));
}

export async function getSubscriptionClickCount(days = 30) {
  if (!_db) return 0;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await _db.select({ count: count() }).from(subscriptionClicks).where(
    sql`${subscriptionClicks.createdAt} >= ${since}`
  );
  return Number(result[0]?.count ?? 0);
}

// ==================== ACTIVE USERS ====================

export async function trackActiveUser(data: InsertActiveUserSession) {
  if (!_db) return;
  try {
    // Upsert based on deviceId
    if (data.deviceId) {
      const existing = await _db.select().from(activeUserSessions).where(eq(activeUserSessions.deviceId, data.deviceId!)).limit(1);
      if (existing.length > 0) {
        await _db.update(activeUserSessions).set({ lastActiveAt: new Date(), userId: data.userId }).where(eq(activeUserSessions.deviceId, data.deviceId!));
        return;
      }
    }
    await _db.insert(activeUserSessions).values(data);
  } catch (error) {
    console.error("[Database] Failed to track active user:", error);
  }
}

export async function getActiveUserCount(minutes = 15) {
  if (!_db) return 0;
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);
  const result = await _db.select({ count: count() }).from(activeUserSessions).where(
    sql`${activeUserSessions.lastActiveAt} >= ${since}`
  );
  return Number(result[0]?.count ?? 0);
}

export async function getDailyActiveUserCount() {
  if (!_db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await _db.select({ count: count() }).from(activeUserSessions).where(
    sql`${activeUserSessions.lastActiveAt} >= ${today}`
  );
  return Number(result[0]?.count ?? 0);
}

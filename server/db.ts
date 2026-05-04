// Fix SSL self-signed certificate issue with Render PostgreSQL
// Must be set before any pg connection is created
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { eq, desc, sql, and, count } from "drizzle-orm";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser, users,
  pushTokens, InsertPushToken,
  subscriptions, InsertSubscription,
  promoCodes, InsertPromoCode,
  feedback, InsertFeedback,
  notifications, InsertNotification,
  dailyStats, InsertDailyStat,
} from "../drizzle/schema";

// ==================== DATABASE CONNECTION ====================
// Create connection at module load time (not lazy) to avoid esbuild ESM issues

function createDbConnection(): NodePgDatabase | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] DATABASE_URL not set - database features disabled");
    return null;
  }
  try {
    const useSSL = dbUrl.includes('render.com') ||
      dbUrl.includes('sslmode=require') ||
      dbUrl.includes('dpg-') ||
      dbUrl.includes('postgres.render.com') ||
      dbUrl.includes('neon.tech') ||
      dbUrl.includes('supabase');
    console.log(`[Database] Initializing PostgreSQL connection (SSL: ${useSSL}, host: ${dbUrl.split('@')[1]?.split('/')[0] ?? 'unknown'})`);
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[Database] Pool error:', err.message);
    });
    return drizzle(pool);
  } catch (error: any) {
    console.error("[Database] Failed to initialize:", error.message);
    return null;
  }
}

// Single shared instance - created once at module load
const _db: NodePgDatabase | null = createDbConnection();

export function getDb(): NodePgDatabase | null {
  return _db;
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
    await _db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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

// ==================== SUBSCRIPTIONS ====================

export async function createSubscription(data: InsertSubscription) {
  if (!_db) throw new Error("Database not available");
  const result = await _db.insert(subscriptions).values(data).returning({ id: subscriptions.id });
  return result[0]?.id;
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

export async function createNotification(data: InsertNotification) {
  if (!_db) throw new Error("Database not available");
  const result = await _db.insert(notifications).values(data).returning({ id: notifications.id });
  return result[0]?.id;
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

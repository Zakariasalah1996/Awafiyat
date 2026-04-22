import { eq, desc, sql, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  pushTokens, InsertPushToken,
  subscriptions, InsertSubscription,
  promoCodes, InsertPromoCode,
  feedback, InsertFeedback,
  notifications, InsertNotification,
  dailyStats, InsertDailyStat,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
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
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count ?? 0;
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUsersByCountry() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    country: users.country,
    count: count(),
  }).from(users).groupBy(users.country);
}

// ==================== PUSH TOKENS ====================

export async function savePushToken(data: InsertPushToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token)).limit(1);
  if (existing.length > 0) {
    await db.update(pushTokens).set({ userId: data.userId, platform: data.platform, isActive: true }).where(eq(pushTokens.token, data.token));
  } else {
    await db.insert(pushTokens).values(data);
  }
}

export async function getActivePushTokens() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(eq(pushTokens.isActive, true));
}

export async function getPushTokensByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
}

export async function getPushTokensByCountry(country: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ token: pushTokens.token, platform: pushTokens.platform })
    .from(pushTokens)
    .innerJoin(users, eq(pushTokens.userId, users.id))
    .where(and(eq(users.country, country), eq(pushTokens.isActive, true)));
}

// ==================== SUBSCRIPTIONS ====================

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(data);
  return result[0]?.insertId;
}

export async function getAllSubscriptions(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset);
}

export async function getActiveSubscriptionCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  return result[0]?.count ?? 0;
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function cancelUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
}

// ==================== PROMO CODES ====================

export async function createPromoCode(data: InsertPromoCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(promoCodes).values(data);
}

export async function getAllPromoCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementPromoCodeUse(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoCodes).set({ currentUses: sql`${promoCodes.currentUses} + 1` }).where(eq(promoCodes.id, id));
}

export async function togglePromoCode(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoCodes).set({ isActive }).where(eq(promoCodes.id, id));
}

// ==================== FEEDBACK ====================

export async function createFeedback(data: InsertFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(feedback).values(data);
}

export async function getAllFeedback(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(limit).offset(offset);
}

export async function getFeedbackCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(feedback);
  return result[0]?.count ?? 0;
}

export async function updateFeedbackStatus(id: number, status: "new" | "read" | "resolved" | "archived", adminNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (adminNote !== undefined) updateData.adminNote = adminNote;
  await db.update(feedback).set(updateData).where(eq(feedback.id, id));
}

// ==================== NOTIFICATIONS ====================

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0]?.insertId;
}

export async function getAllNotifications(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
}

export async function updateNotificationCounts(id: number, sentCount: number, successCount: number, failCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ sentCount, successCount, failCount }).where(eq(notifications.id, id));
}

// ==================== DAILY STATS ====================

export async function upsertDailyStat(data: InsertDailyStat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(dailyStats).where(eq(dailyStats.date, data.date!)).limit(1);
  if (existing.length > 0) {
    await db.update(dailyStats).set(data).where(eq(dailyStats.date, data.date!));
  } else {
    await db.insert(dailyStats).values(data);
  }
}

export async function getDailyStats(days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyStats).orderBy(desc(dailyStats.date)).limit(days);
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeSubscriptions: 0, newFeedback: 0, totalNotifications: 0, freeSubscriptions: 0, monthlySubscriptions: 0, yearlySubscriptions: 0, promoSubscriptions: 0 };
  const [userCount] = await db.select({ count: count() }).from(users);
  const [subCount] = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  const [fbCount] = await db.select({ count: count() }).from(feedback).where(eq(feedback.status, "new"));
  const [notifCount] = await db.select({ count: count() }).from(notifications);
  // Subscription breakdown by plan
  const [freeCount] = await db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "free")));
  const [monthlyCount] = await db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "monthly")));
  const [yearlyCount] = await db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "yearly")));
  const [promoCount] = await db.select({ count: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.plan, "promo")));
  return {
    totalUsers: userCount?.count ?? 0,
    activeSubscriptions: subCount?.count ?? 0,
    newFeedback: fbCount?.count ?? 0,
    totalNotifications: notifCount?.count ?? 0,
    freeSubscriptions: freeCount?.count ?? 0,
    monthlySubscriptions: monthlyCount?.count ?? 0,
    yearlySubscriptions: yearlyCount?.count ?? 0,
    promoSubscriptions: promoCount?.count ?? 0,
  };
}

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const platformEnum = pgEnum("platform", ["ios", "android", "web"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "monthly", "yearly", "promo"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled"]);
export const feedbackTypeEnum = pgEnum("feedback_type", ["bug", "suggestion", "complaint", "praise", "other"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["new", "read", "resolved", "archived"]);
export const notificationTargetEnum = pgEnum("notification_target", ["all", "country", "user"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  country: varchar("country", { length: 32 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Push notification tokens for sending notifications to users.
 */
export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  token: varchar("token", { length: 512 }).notNull(),
  platform: platformEnum("platform").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

/**
 * Subscriptions table for managing user subscriptions and promo codes.
 */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  plan: subscriptionPlanEnum("plan").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  promoCode: varchar("promoCode", { length: 64 }),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Promo codes for free trial distribution.
 */
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  maxUses: integer("maxUses").default(1).notNull(),
  currentUses: integer("currentUses").default(0).notNull(),
  durationDays: integer("durationDays").default(30).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

/**
 * User feedback and suggestions.
 */
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  userName: varchar("userName", { length: 255 }),
  type: feedbackTypeEnum("type").default("suggestion").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"),
  status: feedbackStatusEnum("status").default("new").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

/**
 * Notification history - tracks all sent notifications.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  targetType: notificationTargetEnum("targetType").default("all").notNull(),
  targetValue: varchar("targetValue", { length: 255 }),
  sentBy: integer("sentBy"),
  sentCount: integer("sentCount").default(0).notNull(),
  successCount: integer("successCount").default(0).notNull(),
  failCount: integer("failCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * App analytics - daily stats.
 */
export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  newUsers: integer("newUsers").default(0).notNull(),
  activeUsers: integer("activeUsers").default(0).notNull(),
  newSubscriptions: integer("newSubscriptions").default(0).notNull(),
  feedbackCount: integer("feedbackCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyStat = typeof dailyStats.$inferSelect;
export type InsertDailyStat = typeof dailyStats.$inferInsert;

/**
 * Recipe images - stores image URLs for recipes (persisted in DB, not in code files).
 * This ensures images survive deployments and code updates.
 */
export const recipeImages = pgTable("recipe_images", {
  id: serial("id").primaryKey(),
  recipeId: varchar("recipeId", { length: 64 }).notNull().unique(),
  imageUrl: text("imageUrl").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RecipeImage = typeof recipeImages.$inferSelect;
export type InsertRecipeImage = typeof recipeImages.$inferInsert;

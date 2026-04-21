import { z } from "zod";
import { GoogleAuth } from "google-auth-library";
import * as path from "path";
import * as fs from "fs";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getAllUsers, getUserCount, updateUserStatus, updateUserRole, getUsersByCountry,
  savePushToken, getActivePushTokens, getPushTokensByCountry,
  createSubscription, getAllSubscriptions, getActiveSubscriptionCount, getUserSubscription,
  createPromoCode, getAllPromoCodes, getPromoCodeByCode, incrementPromoCodeUse, togglePromoCode,
  createFeedback, getAllFeedback, getFeedbackCount, updateFeedbackStatus,
  createNotification, getAllNotifications, updateNotificationCounts,
  getDailyStats, getDashboardStats,
} from "./db";

// Helper: get FCM V1 access token using Service Account
let _fcmAccessToken: string | null = null;
let _fcmTokenExpiry = 0;
async function getFCMAccessToken(): Promise<string | null> {
  try {
    if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken;
    const serviceAccountPath = path.join(process.cwd(), 'server', 'firebase-service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('[FCM] Service account file not found:', serviceAccountPath);
      return null;
    }
    const auth = new GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    _fcmAccessToken = tokenResponse.token || null;
    _fcmTokenExpiry = Date.now() + 55 * 60 * 1000;
    return _fcmAccessToken;
  } catch (e) {
    console.error('[FCM] Failed to get access token:', e);
    return null;
  }
}

// Helper: send push notification via FCM V1 API + Expo Push API
async function sendExpoPushNotifications(tokens: string[], title: string, body: string) {
  const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
  const fcmRawTokens = tokens.filter(t => !t.startsWith('ExponentPushToken'));
  let successCount = 0;
  let failCount = 0;

  // Send ExponentPushToken via Expo Push API
  if (expoTokens.length > 0) {
    const messages = expoTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: { type: "admin_notification" },
    }));
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
        });
        const data = await response.json();
        if (data.data) {
          for (const ticket of data.data) {
            if (ticket.status === "ok") successCount++;
            else { failCount++; console.warn("[Push] Expo ticket error:", ticket); }
          }
        }
      } catch (error) {
        failCount += chunk.length;
        console.error("[Push] Failed to send Expo batch:", error);
      }
    }
  }

  // Send raw FCM tokens via FCM V1 API
  if (fcmRawTokens.length > 0) {
    const accessToken = await getFCMAccessToken();
    if (!accessToken) {
      failCount += fcmRawTokens.length;
      console.error('[Push] No FCM access token available');
    } else {
      const projectId = 'awafiyat';
      for (const token of fcmRawTokens) {
        const rawToken = token.startsWith('fcm:') ? token.replace('fcm:', '') : token;
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
                  android: { priority: 'high', notification: { sound: 'default' } },
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
            console.warn('[Push] FCM V1 error:', result);
          }
        } catch (error) {
          failCount++;
          console.error('[Push] FCM V1 failed for token:', rawToken, error);
        }
      }
    }
  }

  console.log(`[Push] Sent: ${tokens.length} total (${expoTokens.length} Expo + ${fcmRawTokens.length} FCM), success: ${successCount}, fail: ${failCount}`);
  return { successCount, failCount, sentCount: tokens.length };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // AI-powered fridge recipe suggestions
  fridge: router({
    suggest: publicProcedure
      .input(
        z.object({
          ingredients: z.string().min(1),
          healthCondition: z.string().default("none"),
          mealType: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const healthNote =
          input.healthCondition !== "none"
            ? `المستخدم يعاني من ${
                input.healthCondition === "diabetes"
                  ? "السكري (قلل السكريات والكربوهيدرات)"
                  : input.healthCondition === "hypertension"
                    ? "ضغط الدم (قلل الأملاح)"
                    : input.healthCondition === "obesity"
                      ? "السمنة (قلل الدهون والسعرات)"
                      : "الكوليسترول (قلل الدهون المشبعة)"
              }. يجب أن تكون الوصفة مناسبة لحالته الصحية.`
            : "";

        const mealNote = input.mealType
          ? `نوع الوجبة المطلوبة: ${input.mealType}.`
          : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت طباخ عراقي محترف ومتخصص بالمطبخ العراقي والعربي. مهمتك اقتراح وصفات عراقية أصيلة وواقعية بناءً على المكونات المتوفرة.

القواعد:
1. اقترح وصفة واحدة فقط بناءً على المكونات المتوفرة
2. الوصفة يجب أن تكون عراقية أو عربية أصيلة وواقعية
3. استخدم اللهجة العراقية الودودة في الشرح
4. كن مختصراً وسريعاً - لا تكتب مقدمات طويلة
5. إذا سألك المستخدم عن شيء غير الطبخ، قل: "عيني، أنا هنا بس حتى أساعدج بالطبخ والوصفات الصحية من اللي موجود بثلاجتج، تدللين بأي سؤال عن الأكل!"
6. ${healthNote}
7. ${mealNote}

أجب بالتنسيق التالي:
🍽️ **اسم الأكلة**

⏱️ الوقت: (المدة التقريبية)

📝 **المكونات:**
- (قائمة المكونات مع الكميات التقريبية)

👩‍🍳 **الطريقة:**
1. (خطوات مختصرة وواضحة)

💡 **نصيحة صحية:** (نصيحة قصيرة مرتبطة بالوصفة)

ألف عافية على قلبكم! 😊`,
            },
            {
              role: "user",
              content: `المكونات الموجودة عندي: ${input.ingredients}`,
            },
          ],
        });

        return {
          suggestion:
            response.choices[0]?.message?.content ||
            "عذراً، لم أستطع اقتراح وصفة. حاول مرة أخرى!",
        };
      }),
  }),

  // ==================== PUSH TOKEN REGISTRATION ====================
  pushToken: router({
    register: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        platform: z.enum(["ios", "android", "web"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) return { success: false, error: "Not authenticated" };
        await savePushToken({ userId, token: input.token, platform: input.platform });
        return { success: true };
      }),
  }),

  // ==================== FEEDBACK ====================
  feedback: router({
    submit: publicProcedure
      .input(z.object({
        type: z.enum(["bug", "suggestion", "complaint", "praise", "other"]).default("suggestion"),
        message: z.string().min(1),
        rating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createFeedback({
          userId: ctx.user?.id,
          userName: ctx.user?.name ?? "مجهول",
          type: input.type,
          message: input.message,
          rating: input.rating,
        });
        return { success: true };
      }),
  }),

  // ==================== PROMO CODE REDEMPTION ====================
  promo: router({
    redeem: publicProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) return { success: false, error: "يجب تسجيل الدخول أولاً" };

        const promo = await getPromoCodeByCode(input.code.toUpperCase());
        if (!promo) return { success: false, error: "الكود غير صحيح" };
        if (!promo.isActive) return { success: false, error: "الكود منتهي الصلاحية" };
        if (promo.currentUses >= promo.maxUses) return { success: false, error: "تم استخدام الكود بالكامل" };
        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { success: false, error: "الكود منتهي الصلاحية" };

        // Check if user already has active subscription
        const existingSub = await getUserSubscription(userId);
        if (existingSub) return { success: false, error: "لديك اشتراك فعال بالفعل" };

        // Create subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + promo.durationDays);
        await createSubscription({
          userId,
          plan: "promo",
          status: "active",
          promoCode: promo.code,
          endDate,
        });

        // Increment promo usage
        await incrementPromoCodeUse(promo.id);

        return { success: true, endDate: endDate.toISOString(), durationDays: promo.durationDays };
      }),
  }),

  // ==================== ADMIN PANEL ====================
  admin: router({
    // Dashboard stats
    dashboard: publicProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
      const stats = await getDashboardStats();
      const countryStats = await getUsersByCountry();
      const dailyStatsData = await getDailyStats(30);
      return { ...stats, countryStats, dailyStats: dailyStatsData };
    }),

    // Users management
    users: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          const usersList = await getAllUsers(input?.limit ?? 100, input?.offset ?? 0);
          const total = await getUserCount();
          return { users: usersList, total };
        }),
      toggleStatus: publicProcedure
        .input(z.object({ userId: z.number(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          await updateUserStatus(input.userId, input.isActive);
          return { success: true };
        }),
      changeRole: publicProcedure
        .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          await updateUserRole(input.userId, input.role);
          return { success: true };
        }),
    }),

    // Subscriptions management
    subscriptions: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          const subs = await getAllSubscriptions(input?.limit ?? 100, input?.offset ?? 0);
          const activeCount = await getActiveSubscriptionCount();
          return { subscriptions: subs, activeCount };
        }),
    }),

    // Promo codes management
    promoCodes: router({
      list: publicProcedure.query(async ({ ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
        return getAllPromoCodes();
      }),
      create: publicProcedure
        .input(z.object({
          code: z.string().min(3).max(64),
          maxUses: z.number().min(1).default(1),
          durationDays: z.number().min(1).default(30),
          expiresAt: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          await createPromoCode({
            code: input.code.toUpperCase(),
            maxUses: input.maxUses,
            durationDays: input.durationDays,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          });
          return { success: true };
        }),
      toggle: publicProcedure
        .input(z.object({ id: z.number(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          await togglePromoCode(input.id, input.isActive);
          return { success: true };
        }),
    }),

    // Feedback management
    feedback: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          const feedbackList = await getAllFeedback(input?.limit ?? 100, input?.offset ?? 0);
          const total = await getFeedbackCount();
          return { feedback: feedbackList, total };
        }),
      updateStatus: publicProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["new", "read", "resolved", "archived"]),
          adminNote: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          await updateFeedbackStatus(input.id, input.status, input.adminNote);
          return { success: true };
        }),
    }),

    // Notifications management - SEND TO USERS
    notifications: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");
          return getAllNotifications(input?.limit ?? 50, input?.offset ?? 0);
        }),
      send: publicProcedure
        .input(z.object({
          title: z.string().min(1),
          body: z.string().min(1),
          targetType: z.enum(["all", "country", "user"]).default("all"),
          targetValue: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Unauthorized");

          // Get target tokens
          let tokens: string[] = [];
          if (input.targetType === "all") {
            const allTokens = await getActivePushTokens();
            tokens = allTokens.map((t) => t.token);
          } else if (input.targetType === "country" && input.targetValue) {
            const countryTokens = await getPushTokensByCountry(input.targetValue);
            tokens = countryTokens.map((t) => t.token);
          }

          // Save notification record
          const notifId = await createNotification({
            title: input.title,
            body: input.body,
            targetType: input.targetType,
            targetValue: input.targetValue,
            sentBy: ctx.user?.id,
            sentCount: tokens.length,
          });

          // Send push notifications
          if (tokens.length > 0) {
            const result = await sendExpoPushNotifications(tokens, input.title, input.body);
            if (notifId) {
              await updateNotificationCounts(notifId, result.sentCount, result.successCount, result.failCount);
            }
            return { success: true, ...result };
          }

          return { success: true, sentCount: 0, successCount: 0, failCount: 0 };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;

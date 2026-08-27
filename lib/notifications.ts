import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "@/constants/oauth";
import { getDeviceId, getGuestUserId } from "@/lib/guest-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام الإشعارات الجديد - expo-notifications فقط
// بدون expo-alarm-module
// ============================================================

// === أنواع الأصوات ===
export type VoiceGender = "female" | "male";

const VOICE_SOUND_FILE: Record<VoiceGender, string> = {
  female: "notification_female.mp3",
  male: "notification_male.mp3",
};

// === مفاتيح التخزين ===
const VOICE_GENDER_KEY = "@notification_voice_gender";
const PUSH_TOKEN_KEY = "expo_push_token";

// === معرّفات القنوات والفئات ===
const CHANNEL_FEMALE = "meal_reminder_female";
const CHANNEL_MALE = "meal_reminder_male";
const CATEGORY_ID = "meal_alarm";

// === معرّفات الأزرار ===
export const ACTION_VIEW_RECIPE = "VIEW_RECIPE";
export const ACTION_DISMISS = "DISMISS";

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// === إدارة صوت الإشعار ===
export async function getVoiceGender(): Promise<VoiceGender> {
  try {
    const saved = await AsyncStorage.getItem(VOICE_GENDER_KEY);
    if (saved === "male" || saved === "female") return saved;
  } catch {}
  return "female"; // الافتراضي: امرأة
}

export async function setVoiceGender(gender: VoiceGender): Promise<void> {
  await AsyncStorage.setItem(VOICE_GENDER_KEY, gender);
}

// === إعداد القنوات والفئات ===
/**
 * إنشاء قنوات الإشعارات (Android 8+) وفئة الأزرار التفاعلية
 * يجب استدعاؤها مرة واحدة عند بدء التطبيق
 */
export async function setupNotificationChannelsAndCategories(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    if (Platform.OS === "android") {
      // قناة صوت المرأة - أولوية قصوى
      await Notifications.setNotificationChannelAsync(CHANNEL_FEMALE, {
        name: "تذكير الوجبات - صوت امرأة",
        description: "تذكير بأوقات إعداد الوجبات بصوت امرأة",
        importance: Notifications.AndroidImportance.MAX,
        sound: VOICE_SOUND_FILE.female,
        vibrationPattern: [0, 500, 200, 500],
        enableVibrate: true,
        enableLights: true,
        lightColor: "#4A7C59",
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // قناة صوت الرجل - أولوية قصوى
      await Notifications.setNotificationChannelAsync(CHANNEL_MALE, {
        name: "تذكير الوجبات - صوت رجل",
        description: "تذكير بأوقات إعداد الوجبات بصوت رجل",
        importance: Notifications.AndroidImportance.MAX,
        sound: VOICE_SOUND_FILE.male,
        vibrationPattern: [0, 500, 200, 500],
        enableVibrate: true,
        enableLights: true,
        lightColor: "#4A7C59",
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // قناة التسوق
      await Notifications.setNotificationChannelAsync("shopping", {
        name: "تذكير التسوق",
        importance: Notifications.AndroidImportance.DEFAULT,
      });

      // قناة التحفيز
      await Notifications.setNotificationChannelAsync("motivation", {
        name: "تحفيز وتشجيع",
        importance: Notifications.AndroidImportance.DEFAULT,
      });

      // إشعارات لوحة التحكم: قناة عادية لا تطلب إيقاظ الشاشة أو تجاوز عدم الإزعاج.
      await Notifications.setNotificationChannelAsync("admin_updates", {
        name: "تحديثات ألف عافيات",
        description: "رسائل وتنبيهات عامة من إدارة التطبيق",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        enableVibrate: true,
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }

    // إنشاء فئة الأزرار التفاعلية (تعمل على Android و iOS)
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_VIEW_RECIPE,
        buttonTitle: "عرض الوصفة 📖",
        options: {
          opensAppToForeground: true,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_DISMISS,
        buttonTitle: "إيقاف",
        options: {
          opensAppToForeground: true,
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);

    console.log("[Notifications] Channels and categories set up successfully");
  } catch (e) {
    console.warn("[Notifications] Setup channels/categories failed:", e);
  }
}

// === رسائل التذكير ===
const MEAL_LABEL: Record<string, string> = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
};

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

// رسائل لطيفة بدون كلمة "صحي"
const MEAL_MESSAGES: Record<string, string[]> = {
  breakfast: [
    "عزيزي الشيف، حان وقت إعداد الفطور! هل أنت مستعد؟",
    "صباح الخير! حان وقت تحضير فطور لذيذ",
    "يلا نبدأ يومنا بفطور رائع!",
  ],
  lunch: [
    "عزيزي الشيف، حان وقت إعداد الغداء! هل أنت مستعد؟",
    "حان وقت الغداء! يلا نحضّر شي لذيذ",
    "وقت الغداء! شنو رأيك نطبخ اليوم؟",
  ],
  dinner: [
    "عزيزي الشيف، حان وقت إعداد العشاء! هل أنت مستعد؟",
    "مساء الخير! حان وقت تحضير عشاء خفيف ولذيذ",
    "وقت العشاء! يلا نحضّر شي حلو",
  ],
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === جدولة إشعار وجبة ===
/**
 * جدولة إشعار تذكير بوجبة - يعمل حتى لو التطبيق مغلق
 * يستخدم DAILY trigger للتكرار اليومي
 * يعرض إشعار بأولوية قصوى (heads-up) مع صوت مخصص وأزرار تفاعلية
 */
export async function scheduleMealReminder(
  mealType: "breakfast" | "lunch" | "dinner",
  hour: number,
  minute: number,
  recipeId?: string,
  recipeName?: string
): Promise<string | null> {
  try {
    // إلغاء الإشعارات السابقة لهذا النوع
    await cancelMealReminder(mealType);

    // حفظ بيانات المنبه في AsyncStorage
    await AsyncStorage.setItem(
      `@alarm_data_${mealType}`,
      JSON.stringify({ mealType, hour, minute, recipeId: recipeId || "", recipeName: recipeName || "" })
    );

    // اختيار الصوت حسب تفضيل المستخدم
    const voiceGender = await getVoiceGender();
    const soundFile = VOICE_SOUND_FILE[voiceGender];
    const channelId = voiceGender === "male" ? CHANNEL_MALE : CHANNEL_FEMALE;

    // اختيار رسالة عشوائية
    const messages = MEAL_MESSAGES[mealType] || MEAL_MESSAGES.breakfast;
    const body = recipeName
      ? `${getRandomItem(messages)}\nالوصفة: ${recipeName}`
      : getRandomItem(messages);

    const label = MEAL_LABEL[mealType];
    const emoji = MEAL_EMOJI[mealType];

    // جدولة الإشعار
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} حان وقت ${label}!`,
        body,
        sound: soundFile,
        data: {
          type: "meal_reminder",
          mealType,
          recipeId: recipeId || "",
          recipeName: recipeName || "",
        },
        categoryIdentifier: CATEGORY_ID,
        priority: "max",
        ...(Platform.OS === "android" && { channelId }),
        // iOS: interruptionLevel for high priority
        ...(Platform.OS === "ios" && { interruptionLevel: "timeSensitive" as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === "android" && { channelId }),
      },
    });

    console.log(`[Notifications] Meal reminder scheduled: ${mealType} at ${hour}:${String(minute).padStart(2, "0")} (id: ${id}, voice: ${voiceGender})`);
    return id;
  } catch (e) {
    console.warn("[Notifications] Schedule meal reminder failed:", e);
    return null;
  }
}

/**
 * جدولة جميع منبهات الوجبات بناءً على الجدول المحفوظ
 */
export async function scheduleAllMealReminders(
  mealTimes: { breakfast: string; lunch: string; dinner: string },
  todayMeals?: {
    breakfast?: { recipeId: string; recipeName: string } | null;
    lunch?: { recipeId: string; recipeName: string } | null;
    dinner?: { recipeId: string; recipeName: string } | null;
  }
): Promise<void> {
  try {
    const mealTypes = ["breakfast", "lunch", "dinner"] as const;

    for (const mealType of mealTypes) {
      const timeStr = mealTimes[mealType];
      const [hourStr, minuteStr] = timeStr.split(":");
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      const meal = todayMeals?.[mealType];
      await scheduleMealReminder(mealType, hour, minute, meal?.recipeId, meal?.recipeName);
    }

    console.log("[Notifications] All meal reminders scheduled successfully");
  } catch (e) {
    console.warn("[Notifications] Failed to schedule all meal reminders:", e);
  }
}

/**
 * إلغاء إشعار وجبة محددة
 */
export async function cancelMealReminder(mealType: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.mealType === mealType) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (e) {
    console.warn("[Notifications] Cancel meal reminder failed:", e);
  }
}

/**
 * إعادة جدولة جميع المنبهات (عند تغيير الصوت مثلاً)
 * يحذف كل الإشعارات المجدولة ويعيد جدولتها بالإعدادات الجديدة
 */
export async function refreshAllAlarms(): Promise<void> {
  try {
    const mealTypes = ["breakfast", "lunch", "dinner"] as const;

    for (const mealType of mealTypes) {
      const data = await AsyncStorage.getItem(`@alarm_data_${mealType}`);
      if (data) {
        const { hour, minute, recipeId, recipeName } = JSON.parse(data);
        await scheduleMealReminder(mealType, hour, minute, recipeId, recipeName);
        console.log(`[Notifications] Refreshed: ${mealType} at ${hour}:${minute}`);
      }
    }

    console.log("[Notifications] All alarms refreshed");
  } catch (e) {
    console.warn("[Notifications] refreshAllAlarms failed:", e);
  }
}

// === إشعارات أخرى ===

const MOTIVATION_MESSAGES = [
  { title: "عافيات تهتم بك! 💚", body: "تذكّري: صحتك أمانة، حافظي عليها بالغذاء المتوازن" },
  { title: "نصيحة اليوم 🌿", body: "اشربي كمية كافية من الماء اليوم، جسمك يحتاج 8 أكواب على الأقل" },
  { title: "كيف حالك اليوم؟ 😊", body: "لا تنسي تصفح الوصفات الجديدة، لدينا أطباق رائعة!" },
];

export async function scheduleShoppingReminder(
  items: string[],
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    const itemsList = items.slice(0, 5).join("، ");
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "حان وقت التسوق! 🛒",
        body: `لا تنسي شراء: ${itemsList}${items.length > 5 ? " وغيرها..." : ""}`,
        data: { type: "shopping" },
        ...(Platform.OS === "android" && { channelId: "shopping" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch (e) {
    console.warn("[Notifications] Shopping reminder failed:", e);
    return null;
  }
}

export async function scheduleDailyMotivation(): Promise<string | null> {
  try {
    const msg = getRandomItem(MOTIVATION_MESSAGES);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { type: "motivation" },
        ...(Platform.OS === "android" && { channelId: "motivation" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
      },
    });
    return id;
  } catch (e) {
    console.warn("[Notifications] Daily motivation failed:", e);
    return null;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("[Notifications] Cancel all failed:", e);
  }
}

// === Push Token Management ===

export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;

    // Method 1: Expo Push token tied to the immutable EAS project.
    // This avoids requiring a Firebase service-account secret on our server.
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error("EAS projectId is missing from app configuration");
      }
      console.log("[Push] Trying Expo token with configured projectId...");
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      if (tokenData.data) {
        console.log("[Push] Got Expo token:", tokenData.data?.substring(0, 35) + "...");
        return tokenData.data;
      }
    } catch (e1) {
      console.warn("[Push] Expo token failed:", (e1 as Error)?.message);
    }

    // Method 2: native token fallback when Expo Push is unavailable.
    try {
      console.log("[Push] Trying native device token fallback...");
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      const nativeToken = deviceToken.data as string;
      if (nativeToken) {
        console.log("[Push] Got native token:", nativeToken.substring(0, 35) + "...");
        return Platform.OS === "android" ? `fcm:${nativeToken}` : nativeToken;
      }
    } catch (e2) {
      console.warn("[Push] Native token failed:", (e2 as Error)?.message);
    }

    console.error("[Push] All token methods failed");
    return null;
  } catch (e) {
    console.error("[Push] Failed to get push token:", e);
    return null;
  }
}

export async function registerPushToken(token: string, userId?: string): Promise<boolean> {
  try {
    const apiBase = getApiBaseUrl();
    const url = apiBase ? `${apiBase}/api/user/push-token` : "/api/user/push-token";
    const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

    let finalUserId = userId || null;
    if (!finalUserId) {
      const guestId = await getGuestUserId();
      if (guestId) finalUserId = guestId.toString();
    }

    const deviceId = await getDeviceId();
    let country = "iraq";
    try {
      const profileJson =
        (await AsyncStorage.getItem("@awafiyat_user_profile")) ??
        (await AsyncStorage.getItem("user_profile"));
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        if (typeof profile.country === "string" && profile.country.trim()) {
          country = profile.country.trim();
        }
      }
    } catch {}

    console.log("[Push] Registering token at:", url, "platform:", platform, "userId:", finalUserId);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: finalUserId, platform, deviceId, country }),
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const payload = await response.json();
        errorMessage = payload?.error || errorMessage;
      } catch {}
      throw new Error(`Push token registration failed (${response.status}): ${errorMessage}`);
    }

    console.log("Push token registered successfully:", token.substring(0, 20) + "...");
    return true;
  } catch (e) {
    console.error("Failed to register push token:", e);
    return false;
  }
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  try {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      onNotificationReceived?.(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onNotificationResponse?.(response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch (e) {
    console.warn("Notification listeners not available:", e);
    return () => {};
  }
}

export async function getSavedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    // إعداد القنوات والفئات أولاً
    await setupNotificationChannelsAndCategories();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log("[Push] Current permission status:", existingStatus);

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[Push] After request, status:", finalStatus);
    }

    if (finalStatus === "granted") {
      // Try to get token with retries (5 attempts with increasing delay)
      let token: string | null = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`[Push] Getting push token, attempt ${attempt}/5...`);
        try {
          token = await getExpoPushToken();
        } catch (tokenErr) {
          console.warn(`[Push] Attempt ${attempt} threw:`, (tokenErr as Error)?.message);
        }
        if (token) break;
        // Increasing delay: 1s, 2s, 3s, 4s, 5s
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }

      if (token) {
        try {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          console.log("[Push] Token saved to AsyncStorage:", token.substring(0, 30) + "...");
        } catch (saveErr) {
          console.warn("[Push] Failed to save token to AsyncStorage:", saveErr);
        }
        const registered = await registerPushToken(token);
        if (registered) {
          console.log("[Push] Token registered successfully with server");
        } else {
          console.warn("[Push] Token saved locally; server registration will retry on startup");
        }
      } else {
        console.error("[Push] FAILED: Could not get push token after 5 attempts");
        console.error("[Push] This means the device cannot receive push notifications");
      }
    } else {
      console.warn("[Push] Permission not granted:", finalStatus);
    }

    return finalStatus === "granted";
  } catch (e) {
    console.error("[Push] requestNotificationPermissions error:", e);
    return false;
  }
}

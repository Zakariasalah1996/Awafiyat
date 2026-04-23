import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "@/constants/oauth";
import { getGuestUserId } from "@/lib/guest-auth";

// expo-alarm-module - منبه أصلي على مستوى النظام (يعمل حتى لو التطبيق مغلق)
let NativeAlarm: {
  scheduleAlarm: (params: any) => void;
  stopAlarm: () => void;
  removeAlarm: (uid: string) => void;
  removeAllAlarms: () => void;
} | null = null;

try {
  if (Platform.OS === "android") {
    const mod = require("expo-alarm-module");
    NativeAlarm = {
      scheduleAlarm: mod.scheduleAlarm || mod.default?.scheduleAlarm,
      stopAlarm: mod.stopAlarm || mod.default?.stopAlarm,
      removeAlarm: mod.removeAlarm || mod.default?.removeAlarm,
      removeAllAlarms: mod.removeAllAlarms || mod.default?.removeAllAlarms,
    };
  }
} catch (e) {
  console.warn("[Alarm] expo-alarm-module not available:", e);
}

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

// Fusha motivational messages
const BREAKFAST_MESSAGES = [
  "حان وقت الفطور، لا تنسي أن تبدئي يومك بوجبة صحية",
  "هل أعددتِ فطورك؟ صحتك أولاً",
  "لا تخرجي من المنزل دون فطور",
];

const LUNCH_MESSAGES = [
  "لا تنسي وجبة الغداء، جسمك يحتاج إلى الطاقة",
  "هيا نختر وصفة لذيذة وصحية، عافية مقدماً",
  "غداء صحي يعني يوماً سعيداً",
];

const DINNER_MESSAGES = [
  "عشاء خفيف وصحي هو الأفضل قبل النوم",
  "لا تنسي عشاءك، واحرصي أن يكون خفيفاً",
  "وجبة خفيفة ولذيذة تجعل نومك هادئاً",
];

const MOTIVATION_MESSAGES = [
  { title: "عافيات تهتم بك! 💚", body: "تذكّري: صحتك أمانة، حافظي عليها بالغذاء الصحي" },
  { title: "نصيحة اليوم 🌿", body: "اشربي كمية كافية من الماء اليوم، جسمك يحتاج 8 أكواب على الأقل" },
  { title: "كيف حالك اليوم؟ 😊", body: "لا تنسي تصفح الوصفات الجديدة، لدينا أطباق رائعة!" },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
};

// Get push token for backend notifications
// Strategy: Always use FCM token directly (via getDevicePushTokenAsync) for reliable delivery
// This bypasses Expo Push Service entirely and sends via Firebase FCM V1 API
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;

    // PRIMARY: Get native device push token (FCM on Android, APNs on iOS)
    // This is the most reliable method - works with any build type
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      const fcmToken = deviceToken.data as string;
      if (fcmToken) {
        console.log("[Push] Got native FCM token:", fcmToken?.substring(0, 30) + "...");
        // Prefix with fcm: so server knows to use FCM V1 API directly
        return `fcm:${fcmToken}`;
      }
    } catch (e1) {
      console.warn("[Push] Native FCM token failed:", (e1 as Error)?.message);
    }

    // FALLBACK: Try Expo push token (only works if Expo Push Service is configured)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (projectId) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log("[Push] Got Expo token (fallback):", tokenData.data?.substring(0, 30) + "...");
        return tokenData.data;
      } catch (e2) {
        console.warn("[Push] Expo token also failed:", (e2 as Error)?.message);
      }
    }

    console.error("[Push] All token methods failed");
    return null;
  } catch (e) {
    console.error("[Push] Failed to get push token:", e);
    return null;
  }
}

// Register push token with backend
export async function registerPushToken(token: string, userId?: string): Promise<void> {
  try {
    const apiBase = getApiBaseUrl();
    const url = apiBase ? `${apiBase}/api/user/push-token` : "/api/user/push-token";
    const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
    
    // Try to get guest user ID if no userId provided
    let finalUserId = userId || null;
    if (!finalUserId) {
      const guestId = await getGuestUserId();
      if (guestId) finalUserId = guestId.toString();
    }
    
    console.log("[Push] Registering token at:", url, "platform:", platform, "userId:", finalUserId);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: finalUserId, platform }),
    });

    if (!response.ok) {
      console.error("Failed to register push token:", response.statusText);
      return;
    }

    console.log("Push token registered successfully:", token.substring(0, 20) + "...");
  } catch (e) {
    console.error("Failed to register push token:", e);
  }
}

// Setup notification listeners
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
    console.warn("Notification listeners not available in Expo Go. This is normal.", e);
    return () => {};
  }
}

// Store token in AsyncStorage to avoid re-fetching every time
const PUSH_TOKEN_KEY = "expo_push_token";

export async function getSavedPushToken(): Promise<string | null> {
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    if (Platform.OS === "android") {
      // قناة الوجبات - صوت إشعار لطيف + اهتزاز خفيف
      await Notifications.setNotificationChannelAsync("meals", {
        name: "تذكير الوجبات",
        description: "تذكير لطيف بأوقات إعداد الوجبات",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 500, 300],
        lightColor: "#4A7C59",
        sound: "notification.mp3",
        enableVibrate: true,
        enableLights: true,
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync("shopping", {
        name: "تذكير التسوق",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync("motivation", {
        name: "تحفيز وتشجيع",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === "granted") {
      // Try to get token with retries
      let token: string | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[Push] Getting push token, attempt ${attempt}/3...`);
        token = await getExpoPushToken();
        if (token) break;
        // Wait before retry
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }

      if (token) {
        // Save token locally
        try {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        } catch {}
        await registerPushToken(token);
        console.log("[Push] Token registered successfully after permissions granted");
      } else {
        console.warn("[Push] Could not get push token after 3 attempts");
      }
    }

    return finalStatus === "granted";
  } catch (e) {
    console.warn("Notification permissions not available in Expo Go. This is normal.", e);
    return false;
  }
}

/**
 * جدولة منبه وجبة (منبه فقط - بدون إشعار)
 * المنبه يعمل عبر expo-alarm-module (يرن حتى لو التطبيق مغلق)
 * عند فتح التطبيق تظهر شاشة المنبه الجميلة بالعربي (عرض الوصفة + إيقاف)
 * يُستدعى عند حفظ جدول الطبخ
 */
export async function scheduleMealReminder(
  mealType: "breakfast" | "lunch" | "dinner",
  hour: number,
  minute: number,
  recipeId?: string,
  recipeName?: string
): Promise<string | null> {
  try {
    // إلغاء المنبهات السابقة لهذا النوع
    await cancelMealReminder(mealType);

    const label = MEAL_LABEL[mealType];

    // حفظ بيانات المنبه في AsyncStorage ليستخدمها AlarmContext عند الرنين
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(`@alarm_data_${mealType}`, JSON.stringify({
        mealType,
        hour,
        minute,
        recipeId: recipeId || "",
        recipeName: recipeName || "",
      }));
    } catch {}

    // المنبه الأصلي (expo-alarm-module) - يرن فوق كل شيء حتى لو التطبيق مغلق
    // عند الرنين يفتح التطبيق تلقائياً ← تظهر شاشة المنبه الجميلة بالعربي
    if (Platform.OS === "android" && NativeAlarm?.scheduleAlarm) {
      try {
        const alarmDate = new Date();
        alarmDate.setHours(hour, minute, 0, 0);
        // إذا الوقت مضى اليوم، اجعله غداً
        if (alarmDate.getTime() <= Date.now()) {
          alarmDate.setDate(alarmDate.getDate() + 1);
        }

        // اختيار الصوت حسب نوع الوجبة
        const MEAL_SOUND: Record<string, string> = {
          breakfast: "alarm_morning",
          lunch: "alarm_lunch",
          dinner: "alarm_dinner",
        };
        const soundName = MEAL_SOUND[mealType] || "alarm_morning";

        // نضمّن recipeId في description بصيغة خاصة ليقرأها Java عند الضغط على "عرض الوصفة"
        const descriptionWithId = recipeId
          ? `RECIPE_ID:${recipeId}|${recipeName || label}`
          : (recipeName ? `الوصفة: ${recipeName}` : `هل أنتِ مستعدة لإعداد ${label}؟`);
        NativeAlarm.scheduleAlarm({
          uid: `meal_${mealType}`,
          day: alarmDate,
          title: `حان وقت ${label}!`,
          description: descriptionWithId,
          dismissText: "إيقاف",
          showDismiss: true,
          showSnooze: true,
          snoozeText: "عرض الوصفة 📖",
          repeating: true,
          active: true,
          sound: soundName,
        } as any);
        console.log(`[Alarm] Native alarm scheduled: ${mealType} at ${hour}:${minute} with sound: ${soundName}`);
      } catch (e) {
        console.error("[Alarm] Native alarm schedule failed:", e);
      }
    }

    // لا إشعارات للوجبات - المنبه الأصلي فقط
    // الإشعارات تُستخدم فقط للتحفيز والنصائح الصحية
    return `meal_${mealType}`;
  } catch (e) {
    console.warn("Meal alarm scheduling not available in Expo Go. This is normal.", e);
    return null;
  }
}

/**
 * جدولة جميع منبهات الوجبات بناءً على الجدول المحفوظ
 * يُستدعى عند حفظ جدول الطبخ
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
      await scheduleMealReminder(
        mealType,
        hour,
        minute,
        meal?.recipeId,
        meal?.recipeName
      );
    }

    console.log("[Notifications] All meal reminders scheduled successfully");
  } catch (e) {
    console.warn("Failed to schedule all meal reminders:", e);
  }
}

export async function cancelMealReminder(mealType: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.mealType === mealType) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    // إلغاء المنبه الأصلي أيضاً
    if (NativeAlarm?.removeAlarm) {
      try {
        NativeAlarm.removeAlarm(`meal_${mealType}`);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn("Cancel meal reminder not available in Expo Go. This is normal.", e);
  }
}

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
    console.warn("Shopping reminders not available in Expo Go. This is normal.", e);
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
    console.warn("Daily motivation not available in Expo Go. This is normal.", e);
    return null;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Cancel all notifications not available in Expo Go. This is normal.", e);
  }
}

/**
 * إعادة جدولة جميع منبهات الوجبات بالأصوات الجديدة
 * يحذف كل المنبهات القديمة ويعيد جدولتها من AsyncStorage
 * يُستدعى عند فتح التطبيق لضمان تطبيق الأصوات المخصصة
 */
export async function refreshAllAlarms(): Promise<void> {
  if (Platform.OS !== "android" || !NativeAlarm) return;
  
  try {
    // حذف كل المنبهات القديمة
    if (NativeAlarm.removeAllAlarms) {
      try {
        NativeAlarm.removeAllAlarms();
        console.log("[Alarm] All old alarms removed");
      } catch (e) {
        // حذف يدوي
        for (const mealType of ["breakfast", "lunch", "dinner"]) {
          try { NativeAlarm.removeAlarm(`meal_${mealType}`); } catch {}
        }
      }
    }

    // قراءة أوقات الوجبات المحفوظة من AsyncStorage
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const mealTypes = ["breakfast", "lunch", "dinner"] as const;
    
    for (const mealType of mealTypes) {
      try {
        const data = await AsyncStorage.getItem(`@alarm_data_${mealType}`);
        if (data) {
          const { hour, minute, recipeId, recipeName } = JSON.parse(data);
          await scheduleMealReminder(mealType, hour, minute, recipeId, recipeName);
          console.log(`[Alarm] Refreshed alarm: ${mealType} at ${hour}:${minute}`);
        }
      } catch (e) {
        console.warn(`[Alarm] Failed to refresh ${mealType}:`, e);
      }
    }
    
    console.log("[Alarm] All alarms refreshed with custom sounds");
  } catch (e) {
    console.warn("[Alarm] refreshAllAlarms failed:", e);
  }
}

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "@/constants/oauth";
import { getGuestUserId } from "@/lib/guest-auth";

// expo-alarm-module - منبه أصلي على مستوى النظام
let NativeAlarm: {
  scheduleAlarm: (params: any) => void;
  stopAlarm: () => void;
  removeAlarm: (uid: string) => void;
} | null = null;

try {
  if (Platform.OS === "android") {
    const mod = require("expo-alarm-module");
    NativeAlarm = {
      scheduleAlarm: mod.scheduleAlarm || mod.default?.scheduleAlarm,
      stopAlarm: mod.stopAlarm || mod.default?.stopAlarm,
      removeAlarm: mod.removeAlarm || mod.default?.removeAlarm,
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

// Get Expo push token for backend notifications
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log("[Push] Using projectId:", projectId);

    // Try with projectId first (works in EAS builds)
    if (projectId) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log("[Push] Got Expo token with projectId:", tokenData.data?.substring(0, 30) + "...");
        return tokenData.data;
      } catch (e1) {
        console.warn("[Push] Failed with projectId:", (e1 as Error)?.message);
      }
    }

    // Fallback: try without projectId
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({});
      console.log("[Push] Got Expo token without projectId:", tokenData.data?.substring(0, 30) + "...");
      return tokenData.data;
    } catch (e2) {
      console.warn("[Push] Expo token failed, trying native FCM token:", (e2 as Error)?.message);
    }

    // Last resort: get native device push token (FCM on Android)
    // This works even without EAS Build
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      const fcmToken = deviceToken.data as string;
      console.log("[Push] Got native FCM token:", fcmToken?.substring(0, 30) + "...");
      // Wrap FCM token in a recognizable format for our server
      return `fcm:${fcmToken}`;
    } catch (e3) {
      console.error("[Push] All token methods failed:", (e3 as Error)?.message);
      return null;
    }
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
      // قناة الوجبات بأولوية قصوى + صوت منبه طويل (30 ثانية)
      await Notifications.setNotificationChannelAsync("meals", {
        name: "منبه الوجبات",
        description: "منبه بصوت عالٍ لتذكيرك بأوقات الوجبات",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000],
        lightColor: "#4A7C59",
        sound: "alarm.wav",
        enableVibrate: true,
        enableLights: true,
        bypassDnd: true,
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
 * جدولة إشعار وجبة مع اسم الوصفة + صوت المنبه
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
    // إلغاء الإشعارات السابقة لهذا النوع
    await cancelMealReminder(mealType);

    const emoji = MEAL_EMOJI[mealType];
    const label = MEAL_LABEL[mealType];
    const messages =
      mealType === "breakfast"
        ? BREAKFAST_MESSAGES
        : mealType === "lunch"
        ? LUNCH_MESSAGES
        : DINNER_MESSAGES;

    // إذا كانت هناك وصفة مخططة، نضيف اسمها
    let title: string;
    let body: string;
    if (recipeName) {
      title = `${emoji} حان وقت ${label}!`;
      body = `الوصفة المخططة: ${recipeName}\nاضغطي لعرض التفاصيل`;
    } else {
      title = `${emoji} حان وقت ${label}!`;
      body = getRandomItem(messages);
    }

    // اختيار الصوت حسب نوع الوجبة
    const notificationSound =
      mealType === "breakfast" ? "alarm_morning.mp3" :
      mealType === "lunch" ? "alarm_lunch.mp3" :
      "alarm.wav";

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: notificationSound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true, // لا يختفي حتى يضغط المستخدم
        vibrate: [0, 1000, 500, 1000, 500, 1000, 500, 1000],
        data: {
          type: "meal",
          mealType,
          ...(recipeId && { recipeId }),
          ...(recipeName && { recipeName }),
        },
        ...(Platform.OS === "android" && { channelId: "meals" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(`[Notifications] Scheduled ${mealType} at ${hour}:${minute} → ${recipeName || "no recipe"} (id: ${id})`);

    // جدولة منبه أصلي عبر expo-alarm-module (يرن حتى لو التطبيق مغلق)
    if (NativeAlarm?.scheduleAlarm) {
      try {
        const alarmDate = new Date();
        alarmDate.setHours(hour, minute, 0, 0);
        // إذا الوقت فات اليوم، جدوله للغد
        if (alarmDate.getTime() <= Date.now()) {
          alarmDate.setDate(alarmDate.getDate() + 1);
        }
        const alarmTitle = recipeName
          ? `حان وقت ${label} - ${recipeName}`
          : `حان وقت ${label}`;
        NativeAlarm.scheduleAlarm({
          uid: `meal_${mealType}`,
          day: alarmDate,
          title: alarmTitle,
          description: recipeName ? `الوصفة: ${recipeName}` : `لا تنسي ${label}`,
          showDismiss: true,
          showSnooze: true,
          snoozeInterval: 5,
          repeating: true,
          active: true,
        } as any);
        console.log(`[Alarm] Native alarm scheduled: meal_${mealType} at ${hour}:${minute}`);
      } catch (alarmErr) {
        console.warn("[Alarm] Failed to schedule native alarm:", alarmErr);
      }
    }

    return id;
  } catch (e) {
    console.warn("Meal reminders not available in Expo Go. This is normal.", e);
    return null;
  }
}

/**
 * جدولة جميع إشعارات الوجبات بناءً على الجدول المحفوظ
 * يُستدعى عند حفظ الجدول أو عند بدء التطبيق
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

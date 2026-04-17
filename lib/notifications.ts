import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "@/constants/oauth";

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
    if (!projectId) {
      console.warn("No EAS project ID found, push notifications won't work in production");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    return tokenData.data;
  } catch (e) {
    console.error("Failed to get push token:", e);
    return null;
  }
}

// Register push token with backend
export async function registerPushToken(token: string, userId?: string): Promise<void> {
  try {
    const apiBase = getApiBaseUrl();
    const url = apiBase ? `${apiBase}/api/user/push-token` : "/api/user/push-token";
    console.log("[Push] Registering token at:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId }),
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
      const token = await getExpoPushToken();
      if (token) {
        await registerPushToken(token);
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

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "alarm.wav",
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

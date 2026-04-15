import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

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
  { title: "صباح الخير! 🌅", body: "حان وقت الفطور، لا تنسَ أن تبدأ يومك بوجبة صحية" },
  { title: "أسعد الله صباحك! ☀️", body: "هل أعددت فطورك؟ تعال نختر وصفة مميزة لهذا الصباح" },
  { title: "صباح العافية! 🍳", body: "لا تخرج من المنزل دون فطور، صحتك أولاً" },
];

const LUNCH_MESSAGES = [
  { title: "حان وقت الغداء! 🍲", body: "لا تنسَ وجبة الغداء، جسمك يحتاج إلى الطاقة" },
  { title: "وقت الغداء! 🥘", body: "هيا نختر وصفة لذيذة وصحية، عافية مقدماً" },
  { title: "موعد الوجبة! 🍛", body: "غداء صحي يعني يوماً سعيداً، اختر وصفتك الآن" },
];

const DINNER_MESSAGES = [
  { title: "حان وقت العشاء! 🌙", body: "عشاء خفيف وصحي هو الأفضل قبل النوم" },
  { title: "مساء الخير! 🍽️", body: "لا تنسَ عشاءك، واحرص أن يكون خفيفاً" },
  { title: "وقت العشاء! ✨", body: "وجبة خفيفة ولذيذة تجعل نومك هادئاً" },
];

const MOTIVATION_MESSAGES = [
  { title: "عافيات تهتم بك! 💚", body: "تذكّر: صحتك أمانة، حافظ عليها بالغذاء الصحي" },
  { title: "نصيحة اليوم 🌿", body: "اشرب كمية كافية من الماء اليوم، جسمك يحتاج 8 أكواب على الأقل" },
  { title: "كيف حالك اليوم؟ 😊", body: "لا تنسَ تصفح الوصفات الجديدة، لدينا أطباق رائعة!" },
];

function getRandomMessage(messages: typeof BREAKFAST_MESSAGES) {
  return messages[Math.floor(Math.random() * messages.length)];
}

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
    // Send token to backend
    const response = await fetch("http://localhost:3000/api/user/push-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("meals", {
      name: "تذكير الوجبات",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4A7C59",
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
    // Get and register push token
    const token = await getExpoPushToken();
    if (token) {
      await registerPushToken(token);
    }
  }

  return finalStatus === "granted";
}

export async function scheduleMealReminder(
  mealType: "breakfast" | "lunch" | "dinner",
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    // Cancel existing reminders for this meal type
    await cancelMealReminder(mealType);

    const messages =
      mealType === "breakfast"
        ? BREAKFAST_MESSAGES
        : mealType === "lunch"
        ? LUNCH_MESSAGES
        : DINNER_MESSAGES;

    const msg = getRandomMessage(messages);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { type: "meal", mealType },
        ...(Platform.OS === "android" && { channelId: "meals" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return id;
  } catch (e) {
    console.error("Failed to schedule meal reminder:", e);
    return null;
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
    console.error("Failed to cancel meal reminder:", e);
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
        body: `لا تنسَ شراء: ${itemsList}${items.length > 5 ? " وغيرها..." : ""}`,
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
    console.error("Failed to schedule shopping reminder:", e);
    return null;
  }
}

export async function scheduleDailyMotivation(): Promise<string | null> {
  try {
    const msg = getRandomMessage(MOTIVATION_MESSAGES);
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
    console.error("Failed to schedule daily motivation:", e);
    return null;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

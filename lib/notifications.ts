import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

// Iraqi-style motivational messages
const BREAKFAST_MESSAGES = [
  { title: "صباح الخير عيني! 🌅", body: "وقت الفطور حبيبي، لا تنسى تفطر حتى يبقى جسمك قوي" },
  { title: "هلا بالصبح! ☀️", body: "الفطور جاهز؟ تعال نشوف شنو نسوي اليوم" },
  { title: "صباحك عافية! 🍳", body: "لا تطلع من البيت بدون فطور، صحتك أهم شي" },
];

const LUNCH_MESSAGES = [
  { title: "وقت الغداء! 🍲", body: "شلونك عيني؟ لا تنسى غداك، الجسم يحتاج طاقة" },
  { title: "الغداء حان! 🥘", body: "يلا نشوف شنو مسوين اليوم، ألف عافية مقدماً" },
  { title: "هلا بوقت الأكل! 🍛", body: "غداء صحي = يوم سعيد، تعال نختار وصفة حلوة" },
];

const DINNER_MESSAGES = [
  { title: "وقت العشاء! 🌙", body: "عشاء خفيف وصحي أحسن شي قبل النوم" },
  { title: "مساء الخير! 🍽️", body: "لا تنسى عشاك عيني، بس خليه خفيف" },
  { title: "حان وقت الريوك! ✨", body: "ريوك خفيف ولذيذ يخلي نومك هادئ" },
];

const MOTIVATION_MESSAGES = [
  { title: "عافيات تحبك! 💚", body: "تذكر: صحتك أمانة، حافظ عليها بأكل صحي" },
  { title: "نصيحة اليوم 🌿", body: "اشرب ماي كافي اليوم، جسمك يحتاج 8 أكواب على الأقل" },
  { title: "شلونك اليوم؟ 😊", body: "لا تنسى تتصفح وصفات جديدة، عندنا أكلات تخبل!" },
];

function getRandomMessage(messages: typeof BREAKFAST_MESSAGES) {
  return messages[Math.floor(Math.random() * messages.length)];
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
        title: "وقت التسوق! 🛒",
        body: `لا تنسى تشتري: ${itemsList}${items.length > 5 ? " وغيرها..." : ""}`,
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

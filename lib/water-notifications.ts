import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام تذكيرات شرب الماء
// إشعارات دورية بين وقت الاستيقاظ ووقت النوم
// رسائل إنسانية ودافئة
// ============================================================

const WATER_NOTIFICATION_IDS_KEY = "@water_notification_ids_v1";

// رسائل تذكير شرب الماء - إنسانية ودافئة
const WATER_MESSAGES = [
  "💧 حان وقت شرب الماء! جسمك يحتاج الترطيب",
  "💧 هل شربت ماءً؟ كوب واحد يصنع فرقاً كبيراً",
  "💧 تذكير بسيط: اشرب كوب ماء الآن",
  "💧 جسمك ينتظر! اشرب ماءً وانعش نفسك",
  "💧 لا تنسَ الماء! صحتك تبدأ من هنا",
  "💧 وقت الترطيب! كوب ماء يُنعش يومك",
  "💧 هل أخذت كوبك؟ الماء سرّ النشاط والحيوية",
  "💧 تذكير لطيف: جسمك يشكرك على كل كوب ماء",
  "💧 اشرب ماءً! خطوة بسيطة لصحة أفضل",
  "💧 حبيبي، لا تنسَ الماء. صحتك أمانة",
];

/**
 * إعداد قناة إشعارات الماء (Android)
 */
export async function setupWaterChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("water-reminder", {
      name: "تذكير شرب الماء",
      description: "إشعارات تذكير بشرب الماء",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 200, 100, 200],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * جدولة تذكيرات شرب الماء الدورية
 * @param intervalHours الفاصل بين التذكيرات (بالساعات)
 * @param wakeHour ساعة الاستيقاظ (0-23)
 * @param sleepHour ساعة النوم (0-23)
 */
export async function scheduleWaterReminders(
  intervalHours: number = 2,
  wakeHour: number = 7,
  sleepHour: number = 23
): Promise<void> {
  // إلغاء التذكيرات السابقة
  await cancelWaterReminders();

  const notificationIds: string[] = [];

  // جدولة إشعار لكل فترة بين الاستيقاظ والنوم
  let hour = wakeHour + intervalHours; // أول تذكير بعد الاستيقاظ بفترة
  while (hour < sleepHour) {
    try {
      const message = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 وقت شرب الماء",
          body: message,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          ...(Platform.OS === "android" && {
            channelId: "water-reminder",
          }),
          data: {
            type: "water_reminder",
          },
          categoryIdentifier: "water_action",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour,
          minute: 0,
        },
      });
      notificationIds.push(id);
    } catch (e) {
      console.error(`[WaterNotif] Failed to schedule for hour ${hour}:`, e);
    }
    hour += intervalHours;
  }

  // حفظ معرفات الإشعارات
  await AsyncStorage.setItem(WATER_NOTIFICATION_IDS_KEY, JSON.stringify(notificationIds));
}

/**
 * إلغاء جميع تذكيرات الماء
 */
export async function cancelWaterReminders(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(WATER_NOTIFICATION_IDS_KEY);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {}
      }
    }
    await AsyncStorage.removeItem(WATER_NOTIFICATION_IDS_KEY);
  } catch {}
}

/**
 * إعداد أزرار التفاعل مع إشعار الماء
 */
export async function setupWaterNotificationActions(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("water_action", [
    {
      identifier: "DRANK_WATER",
      buttonTitle: "✅ شربت",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SNOOZE_WATER",
      buttonTitle: "⏰ ذكّرني بعد 15 دقيقة",
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * التعامل مع استجابة المستخدم لإشعار الماء
 */
export async function handleWaterNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data;

  if (data?.type !== "water_reminder") return;

  if (actionId === "SNOOZE_WATER") {
    try {
      const message = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 تذكير: اشرب ماءً!",
          body: message,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          ...(Platform.OS === "android" && {
            channelId: "water-reminder",
          }),
          data: { type: "water_reminder" },
          categoryIdentifier: "water_action",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 900, // 15 دقيقة
          repeats: false,
        },
      });
    } catch (e) {
      console.error("[WaterNotif] Failed to snooze:", e);
    }
  }

  // إذا ضغط "شربت" - يمكن تسجيل الكوب من خلال الـ context عند فتح التطبيق
}

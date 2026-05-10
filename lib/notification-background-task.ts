import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ============================================================
// Background Task لمعالجة استجابات الإشعارات بدون فتح التطبيق
// يُستدعى TaskManager.defineTask في الـ global scope
// ============================================================

export const NOTIFICATION_RESPONSE_TASK = "BACKGROUND_NOTIFICATION_RESPONSE";

// معرّفات القنوات (مطابقة لتلك في medication-notifications.ts و water-notifications.ts)
const MED_CHANNEL_ID = "medication_reminder_v6";
const MED_FOLLOWUP_CHANNEL_ID = "medication_followup_v6";
const WATER_CHANNEL_ID = "water_reminder_v6";

// مفاتيح AsyncStorage (مطابقة لتلك في medication-notifications.ts)
const FOLLOWUP_IDS_KEY = "@medication_followup_ids_v1";

// رسائل تذكير الماء (نسخة مختصرة للـ background task)
const WATER_MESSAGES = [
  "💧 تذكير: اشرب ماءً!",
  "💧 لا تنسَ الماء! صحتك تبدأ من هنا",
  "💧 وقت الترطيب! كوب ماء يُنعش يومك",
];

/**
 * الحصول على معرّفات إشعارات المتابعة لدواء معين
 */
async function getFollowupIds(medId: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(FOLLOWUP_IDS_KEY);
    if (stored) {
      const allIds: Record<string, string[]> = JSON.parse(stored);
      return allIds[medId] || [];
    }
  } catch {}
  return [];
}

// ============================================================
// تعريف الـ Background Task في الـ Global Scope
// هذا ضروري لأن TaskManager.defineTask يجب أن يُستدعى
// قبل mount أي component
// ============================================================
TaskManager.defineTask(NOTIFICATION_RESPONSE_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BgTask] Error:", error);
    return;
  }

  // البيانات تأتي كـ NotificationResponse
  const response = data as Notifications.NotificationResponse;
  if (!response || !response.notification) {
    console.log("[BgTask] No valid response data");
    return;
  }

  const actionId = response.actionIdentifier;
  const notifData = response.notification.request.content.data;
  const notificationId = response.notification.request.identifier;

  console.log("[BgTask] Processing action:", actionId, "type:", notifData?.type, "notifId:", notificationId);

  // إخفاء الإشعار من شريط الإشعارات
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (e) {
    console.warn("[BgTask] Failed to dismiss:", e);
  }

  // =============================================
  // معالجة أزرار إشعارات الدواء
  // =============================================
  if (notifData?.type === "medication_reminder" || notifData?.type === "medication_followup") {
    if (actionId === "TOOK_MEDICATION") {
      console.log("[BgTask] TOOK_MEDICATION - cancelling followup reminders");
      // إلغاء التذكير الثاني إذا تناول الدواء
      const medId = notifData.medicationId as string;
      if (medId) {
        const followupIds = await getFollowupIds(medId);
        for (const id of followupIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch {}
        }
      }
      return;
    }

    if (actionId === "SNOOZE_MEDICATION") {
      console.log("[BgTask] SNOOZE_MEDICATION - scheduling 10min reminder");
      // إعادة جدولة بعد 10 دقائق
      const medName = (notifData.medicationName as string) || "دواءك";
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ${medName}`,
            body: "تذكير: لا تنسَ دواءك! 💚",
            sound: "medication_reminder.mp3",
            priority: "max",
            ...(Platform.OS === "android" && {
              channelId: MED_CHANNEL_ID,
            }),
            data: {
              type: "medication_reminder",
              medicationId: notifData.medicationId,
              medicationName: medName,
              timeIndex: notifData.timeIndex,
            },
            categoryIdentifier: "medication_action",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 600, // 10 دقائق
            repeats: false,
            ...(Platform.OS === "android" && { channelId: MED_CHANNEL_ID }),
          },
        });
        console.log("[BgTask] Snooze scheduled successfully");
      } catch (e) {
        console.error("[BgTask] Failed to snooze medication:", e);
      }
      return;
    }
  }

  // =============================================
  // معالجة أزرار إشعارات شرب الماء
  // =============================================
  if (notifData?.type === "water_reminder") {
    if (actionId === "DRANK_WATER") {
      console.log("[BgTask] DRANK_WATER - water intake recorded in background");
      // تسجيل شرب كوب ماء في AsyncStorage ليقرأه الـ context عند فتح التطبيق
      try {
        const today = new Date().toISOString().split("T")[0];
        const key = `@water_bg_cups_${today}`;
        const stored = await AsyncStorage.getItem(key);
        const count = stored ? parseInt(stored, 10) + 1 : 1;
        await AsyncStorage.setItem(key, count.toString());
        console.log("[BgTask] Background water cup count:", count);
      } catch (e) {
        console.warn("[BgTask] Failed to save water cup:", e);
      }
      return;
    }

    if (actionId === "SNOOZE_WATER") {
      console.log("[BgTask] SNOOZE_WATER - scheduling 15min reminder");
      try {
        const message = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💧 تذكير: اشرب ماءً!",
            body: message,
            sound: "water_reminder.mp3",
            priority: "max",
            ...(Platform.OS === "android" && {
              channelId: WATER_CHANNEL_ID,
            }),
            data: { type: "water_reminder" },
            categoryIdentifier: "water_action",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 900, // 15 دقيقة
            repeats: false,
            ...(Platform.OS === "android" && { channelId: WATER_CHANNEL_ID }),
          },
        });
        console.log("[BgTask] Water snooze scheduled successfully");
      } catch (e) {
        console.error("[BgTask] Failed to snooze water:", e);
      }
      return;
    }
  }

  // =============================================
  // معالجة زر "إيقاف" في إشعارات الوجبات
  // =============================================
  if (actionId === "DISMISS") {
    console.log("[BgTask] DISMISS pressed for meal:", notifData?.mealType);
    try {
      if (notifData?.mealType) {
        // إلغاء الإشعار المجدول لهذه الوجبة
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
          if (notification.content.data?.mealType === notifData.mealType) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
        // حذف بيانات المنبه من AsyncStorage
        await AsyncStorage.removeItem(`@alarm_data_${notifData.mealType}`);
        console.log(`[BgTask] Meal reminder cancelled for: ${notifData.mealType}`);
      }
    } catch (e) {
      console.warn("[BgTask] Failed to cancel meal reminder:", e);
    }
    return;
  }

  console.log("[BgTask] Unhandled action:", actionId);
});

/**
 * تسجيل الـ background task مع expo-notifications
 * يجب استدعاؤها مرة واحدة عند بدء التطبيق
 */
export async function registerNotificationTask(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // التحقق من أن الـ task معرّف
    const isDefined = TaskManager.isTaskDefined(NOTIFICATION_RESPONSE_TASK);
    if (!isDefined) {
      console.warn("[BgTask] Task not defined, skipping registration");
      return;
    }

    // التحقق من أن الـ task غير مسجل بالفعل
    const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_RESPONSE_TASK);
    if (isRegistered) {
      console.log("[BgTask] Task already registered");
      return;
    }

    await Notifications.registerTaskAsync(NOTIFICATION_RESPONSE_TASK);
    console.log("[BgTask] Notification response task registered successfully");
  } catch (e) {
    console.error("[BgTask] Failed to register task:", e);
  }
}

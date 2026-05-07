import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Medication, DayOfWeek } from "@/lib/medication-context";

// ============================================================
// نظام إشعارات تذكير الدواء - رفيق الدواء
// إشعارات محلية بأولوية قصوى مع رسائل إنسانية
// ============================================================

const NOTIFICATION_IDS_KEY = "@medication_notification_ids_v1";

// رسائل تذكير الدواء - إنسانية ودافئة
const MEDICATION_MESSAGES = [
  "حان وقت دوائك، عافاك الله وشفاك 💊",
  "تذكير بسيط: لا تنسَ دواءك، صحتك أمانة 💚",
  "حبيبي، حان وقت الدواء. الله يعطيك العافية 💊",
  "دواؤك ينتظرك! خطوة صغيرة نحو صحة أفضل 🌿",
  "وقت الدواء! الله يشفيك ويعافيك 💊",
  "لا تنسَ دواءك، نحن نهتم بصحتك 💚",
  "حان الموعد! خذ دواءك وتوكل على الله 🤲",
  "تذكير حبيب: دواؤك الآن. الله يديم عليك العافية 💊",
];

// تحويل يوم الأسبوع إلى رقم expo-notifications (1=Sunday, 7=Saturday)
const DAY_MAP: Record<DayOfWeek, number> = {
  sun: 1,
  mon: 2,
  tue: 3,
  wed: 4,
  thu: 5,
  fri: 6,
  sat: 7,
};

/**
 * إعداد قناة إشعارات الدواء (Android)
 */
export async function setupMedicationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medication-reminder", {
      name: "تذكير الدواء",
      description: "إشعارات تذكير بمواعيد الأدوية",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * جدولة إشعارات لدواء معين
 */
export async function scheduleMedicationReminder(medication: Medication): Promise<string[]> {
  // إلغاء أي إشعارات سابقة لهذا الدواء
  await cancelMedicationReminder(medication.id);

  const notificationIds: string[] = [];
  const message = MEDICATION_MESSAGES[Math.floor(Math.random() * MEDICATION_MESSAGES.length)];

  for (let i = 0; i < medication.times.length; i++) {
    const time = medication.times[i];
    let trigger: Notifications.NotificationTriggerInput;

    if (medication.frequency === "daily") {
      // تذكير يومي
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      };
    } else if (medication.frequency === "weekly" && medication.dayOfWeek) {
      // تذكير أسبوعي
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: DAY_MAP[medication.dayOfWeek],
        hour: time.hour,
        minute: time.minute,
      };
    } else if (medication.frequency === "monthly" && medication.dayOfMonth) {
      // تذكير شهري - نستخدم YEARLY مع كل شهر أو DAILY مع شرط
      // expo-notifications لا يدعم monthly مباشرة، نستخدم calendar trigger
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: medication.dayOfMonth,
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      };
    } else {
      // fallback to daily
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      };
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medication.name}`,
          body: message,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: "medication-reminder",
          }),
          data: {
            type: "medication_reminder",
            medicationId: medication.id,
            medicationName: medication.name,
          },
          categoryIdentifier: "medication_action",
        },
        trigger,
      });
      notificationIds.push(id);
    } catch (e) {
      console.error(`[MedNotif] Failed to schedule for ${medication.name} time ${i}:`, e);
    }
  }

  // حفظ معرفات الإشعارات
  await saveNotificationIds(medication.id, notificationIds);
  return notificationIds;
}

/**
 * إلغاء إشعارات دواء معين
 */
export async function cancelMedicationReminder(medicationId: string): Promise<void> {
  const ids = await getNotificationIds(medicationId);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
  await removeNotificationIds(medicationId);
}

/**
 * إلغاء جميع إشعارات الأدوية
 */
export async function cancelAllMedicationReminders(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (stored) {
      const allIds: Record<string, string[]> = JSON.parse(stored);
      for (const ids of Object.values(allIds)) {
        for (const id of ids) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch {}
        }
      }
    }
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
  } catch {}
}

/**
 * إعادة جدولة جميع الإشعارات (بعد إعادة تشغيل الجهاز مثلاً)
 */
export async function rescheduleAllMedications(medications: Medication[]): Promise<void> {
  for (const med of medications) {
    if (med.isActive) {
      await scheduleMedicationReminder(med);
    }
  }
}

/**
 * إعداد أزرار التفاعل مع الإشعار
 */
export async function setupMedicationNotificationActions(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("medication_action", [
    {
      identifier: "TOOK_MEDICATION",
      buttonTitle: "✅ تناولته",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SNOOZE_MEDICATION",
      buttonTitle: "⏰ ذكّرني بعد 10 دقائق",
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * التعامل مع استجابة المستخدم للإشعار
 */
export async function handleMedicationNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data;

  if (data?.type !== "medication_reminder") return;

  if (actionId === "SNOOZE_MEDICATION") {
    // إعادة جدولة بعد 10 دقائق
    const medName = data.medicationName as string || "دواءك";
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medName}`,
          body: "تذكير: لا تنسَ دواءك! 💚",
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: "medication-reminder",
          }),
          data: {
            type: "medication_reminder",
            medicationId: data.medicationId,
            medicationName: medName,
          },
          categoryIdentifier: "medication_action",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 600, // 10 دقائق
          repeats: false,
        },
      });
    } catch (e) {
      console.error("[MedNotif] Failed to snooze:", e);
    }
  }
  // TOOK_MEDICATION - لا حاجة لفعل شيء إضافي
}

// === Helper functions ===

async function saveNotificationIds(medId: string, ids: string[]): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const allIds: Record<string, string[]> = stored ? JSON.parse(stored) : {};
    allIds[medId] = ids;
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
  } catch {}
}

async function getNotificationIds(medId: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (stored) {
      const allIds: Record<string, string[]> = JSON.parse(stored);
      return allIds[medId] || [];
    }
  } catch {}
  return [];
}

async function removeNotificationIds(medId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (stored) {
      const allIds: Record<string, string[]> = JSON.parse(stored);
      delete allIds[medId];
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
    }
  } catch {}
}

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Medication, DayOfWeek } from "@/lib/medication-context";

// ============================================================
// نظام إشعارات تذكير الدواء - رفيق الدواء
// إشعارات محلية بأولوية قصوى مع رسائل إنسانية
// + تذكير ثانٍ بعد 15 دقيقة إذا لم يتفاعل
// + ملاحظة وجرعة في الإشعار
// ============================================================

const NOTIFICATION_IDS_KEY = "@medication_notification_ids_v2";
const FOLLOWUP_IDS_KEY = "@medication_followup_ids_v1";

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

// رسائل التذكير الثاني (بعد 15 دقيقة)
const FOLLOWUP_MESSAGES = [
  "لا تنسَ دواءك! مرّ وقت ولم تتناوله بعد 💊",
  "تذكير ثانٍ: دواؤك لا يزال ينتظرك 💚",
  "ما زلنا نذكّرك بدوائك، صحتك تهمنا 🌿",
  "لم تتناول دواءك بعد! خذه الآن بإذن الله 💊",
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
 * بناء نص الإشعار مع الجرعة والملاحظة
 */
function buildNotificationBody(medication: Medication, isFollowup: boolean = false): string {
  const messages = isFollowup ? FOLLOWUP_MESSAGES : MEDICATION_MESSAGES;
  let body = messages[Math.floor(Math.random() * messages.length)];

  // إضافة الجرعة
  if (medication.dosage) {
    body += `\nالجرعة: ${medication.dosage}`;
  }

  // إضافة الملاحظة
  if (medication.note) {
    body += `\n📝 ${medication.note}`;
  }

  return body;
}

/**
 * إعداد قناة إشعارات الدواء (Android)
 */
// معرّفات القنوات الحالية - يجب تغييرها عند تغيير الصوت لأن Android لا يسمح بتعديل صوت قناة موجودة
export const MED_CHANNEL_ID = "medication_reminder_v3";
export const MED_FOLLOWUP_CHANNEL_ID = "medication_followup_v3";

export async function setupMedicationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    // حذف جميع القنوات القديمة (Android لا يسمح بتعديل صوت قناة بعد إنشائها)
    const oldChannels = [
      "medication-reminder", "medication-followup",
      "medication_reminder", "medication_followup",
      "medication_reminder_v2", "medication_followup_v2",
    ];
    for (const ch of oldChannels) {
      try {
        await Notifications.deleteNotificationChannelAsync(ch);
      } catch {}
    }

    await Notifications.setNotificationChannelAsync(MED_CHANNEL_ID, {
      name: "تذكير الدواء",
      description: "إشعارات تذكير بمواعيد الأدوية",
      importance: Notifications.AndroidImportance.MAX,
      sound: "medication_reminder.mp3",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // قناة التذكير الثاني
    await Notifications.setNotificationChannelAsync(MED_FOLLOWUP_CHANNEL_ID, {
      name: "تذكير ثانٍ بالدواء",
      description: "تذكير إضافي إذا لم يتم تناول الدواء",
      importance: Notifications.AndroidImportance.MAX,
      sound: "medication_reminder.mp3",
      vibrationPattern: [0, 500, 250, 500],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * جدولة إشعارات لدواء معين (مع تذكير ثانٍ بعد 15 دقيقة)
 */
export async function scheduleMedicationReminder(medication: Medication): Promise<string[]> {
  // إلغاء أي إشعارات سابقة لهذا الدواء
  await cancelMedicationReminder(medication);

  const notificationIds: string[] = [];
  const followupIds: string[] = [];
  const body = buildNotificationBody(medication, false);
  const followupBody = buildNotificationBody(medication, true);

  for (let i = 0; i < medication.times.length; i++) {
    const time = medication.times[i];
    let trigger: Notifications.NotificationTriggerInput;

    if (medication.frequency === "daily") {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      };
    } else if (medication.frequency === "weekly" && medication.dayOfWeek) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: DAY_MAP[medication.dayOfWeek],
        hour: time.hour,
        minute: time.minute,
      };
    } else if (medication.frequency === "monthly" && medication.dayOfMonth) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: medication.dayOfMonth,
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      };
    }

    try {
      // الإشعار الرئيسي
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medication.name}`,
          body,
          sound: "medication_reminder.mp3",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: MED_CHANNEL_ID,
          }),
          data: {
            type: "medication_reminder",
            medicationId: medication.id,
            medicationName: medication.name,
            timeIndex: i,
          },
          categoryIdentifier: "medication_action",
        },
        trigger,
      });
      notificationIds.push(id);

      // التذكير الثاني بعد 15 دقيقة
      let followupHour = time.hour;
      let followupMinute = time.minute + 15;
      if (followupMinute >= 60) {
        followupMinute -= 60;
        followupHour = (followupHour + 1) % 24;
      }

      let followupTrigger: Notifications.NotificationTriggerInput;

      if (medication.frequency === "daily") {
        followupTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: followupHour,
          minute: followupMinute,
        };
      } else if (medication.frequency === "weekly" && medication.dayOfWeek) {
        followupTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: DAY_MAP[medication.dayOfWeek],
          hour: followupHour,
          minute: followupMinute,
        };
      } else if (medication.frequency === "monthly" && medication.dayOfMonth) {
        followupTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day: medication.dayOfMonth,
          hour: followupHour,
          minute: followupMinute,
          repeats: true,
        };
      } else {
        followupTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: followupHour,
          minute: followupMinute,
        };
      }

      const followupId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ لم تتناول ${medication.name} بعد!`,
          body: followupBody,
          sound: "medication_reminder.mp3",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: MED_FOLLOWUP_CHANNEL_ID,
          }),
          data: {
            type: "medication_followup",
            medicationId: medication.id,
            medicationName: medication.name,
            timeIndex: i,
          },
          categoryIdentifier: "medication_action",
        },
        trigger: followupTrigger,
      });
      followupIds.push(followupId);
    } catch (e) {
      console.error(`[MedNotif] Failed to schedule for ${medication.name} time ${i}:`, e);
    }
  }

  // حفظ معرفات الإشعارات
  await saveNotificationIds(medication.id, notificationIds);
  await saveFollowupIds(medication.id, followupIds);
  return notificationIds;
}

/**
 * إلغاء إشعارات دواء معين (يقبل medication object أو id string)
 */
export async function cancelMedicationReminder(medicationOrId: Medication | string): Promise<void> {
  const medId = typeof medicationOrId === "string" ? medicationOrId : medicationOrId.id;

  // إلغاء الإشعارات الرئيسية
  const ids = await getNotificationIds(medId);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
  await removeNotificationIds(medId);

  // إلغاء إشعارات المتابعة
  const followupIds = await getFollowupIds(medId);
  for (const id of followupIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
  await removeFollowupIds(medId);
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
          try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
        }
      }
    }
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);

    const followups = await AsyncStorage.getItem(FOLLOWUP_IDS_KEY);
    if (followups) {
      const allIds: Record<string, string[]> = JSON.parse(followups);
      for (const ids of Object.values(allIds)) {
        for (const id of ids) {
          try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
        }
      }
    }
    await AsyncStorage.removeItem(FOLLOWUP_IDS_KEY);
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
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: "SNOOZE_MEDICATION",
      buttonTitle: "⏰ ذكّرني بعد 10 دقائق",
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
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
  const notificationId = response.notification.request.identifier;

  if (data?.type !== "medication_reminder" && data?.type !== "medication_followup") return;

  console.log("[MedNotif] Handling response:", actionId, "notifId:", notificationId);

  // إلغاء الإشعار المعروض (إخفاؤه من شريط الإشعارات)
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (e) {
    console.warn("[MedNotif] Failed to dismiss notification:", e);
  }

  if (actionId === "SNOOZE_MEDICATION") {
    // إعادة جدولة بعد 10 دقائق
    const medName = (data.medicationName as string) || "دواءك";
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medName}`,
          body: "تذكير: لا تنسَ دواءك! 💚",
          sound: "medication_reminder.mp3",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: MED_CHANNEL_ID,
          }),
          data: {
            type: "medication_reminder",
            medicationId: data.medicationId,
            medicationName: medName,
            timeIndex: data.timeIndex,
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

  if (actionId === "TOOK_MEDICATION") {
    // إلغاء التذكير الثاني إذا تناول الدواء
    const medId = data.medicationId as string;
    if (medId) {
      const followupIds = await getFollowupIds(medId);
      for (const id of followupIds) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
    }
  }
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

async function saveFollowupIds(medId: string, ids: string[]): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(FOLLOWUP_IDS_KEY);
    const allIds: Record<string, string[]> = stored ? JSON.parse(stored) : {};
    allIds[medId] = ids;
    await AsyncStorage.setItem(FOLLOWUP_IDS_KEY, JSON.stringify(allIds));
  } catch {}
}

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

async function removeFollowupIds(medId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(FOLLOWUP_IDS_KEY);
    if (stored) {
      const allIds: Record<string, string[]> = JSON.parse(stored);
      delete allIds[medId];
      await AsyncStorage.setItem(FOLLOWUP_IDS_KEY, JSON.stringify(allIds));
    }
  } catch {}
}

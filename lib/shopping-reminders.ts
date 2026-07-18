import * as Notifications from "expo-notifications";

export interface ShoppingReminder {
  id: string;
  title: string;
  description: string;
  daysBeforeNotification: number; // عدد الأيام قبل موعد التسوق
  timeOfDay: string; // الوقت بصيغة HH:mm (24 ساعة)
  enabled: boolean;
  createdAt: Date;
  nextNotificationDate?: Date;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  scheduledDate: Date; // موعد التسوق المخطط
  reminders: ShoppingReminder[];
  completed: boolean;
  createdAt: Date;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

/**
 * إنشاء تذكير جديد لقائمة التسوق
 */
export function createShoppingReminder(
  title: string,
  description: string,
  daysBeforeNotification: number = 1,
  timeOfDay: string = "09:00"
): ShoppingReminder {
  return {
    id: Date.now().toString(),
    title,
    description,
    daysBeforeNotification,
    timeOfDay,
    enabled: true,
    createdAt: new Date(),
  };
}

/**
 * حساب موعد التذكير التالي
 */
export function calculateNextReminderDate(
  shoppingDate: Date,
  daysBeforeNotification: number,
  timeOfDay: string
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  const reminderDate = new Date(shoppingDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeNotification);
  reminderDate.setHours(hours, minutes, 0, 0);

  return reminderDate;
}

/**
 * جدولة التذكيرات للإشعارات
 */
export async function scheduleShoppingReminders(
  shoppingList: ShoppingList
): Promise<void> {
  for (const reminder of shoppingList.reminders) {
    if (!reminder.enabled) continue;

    const nextReminderDate = calculateNextReminderDate(
      shoppingList.scheduledDate,
      reminder.daysBeforeNotification,
      reminder.timeOfDay
    );

    // تحقق من أن التذكير في المستقبل
    if (nextReminderDate <= new Date()) {
      continue;
    }

    try {
      const secondsFromNow = Math.floor(
        (nextReminderDate.getTime() - new Date().getTime()) / 1000
      );

      if (secondsFromNow > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🛒 " + reminder.title,
            body: reminder.description,
            data: {
              shoppingListId: shoppingList.id,
              reminderId: reminder.id,
            },
            sound: "default",
            badge: 1,
          },
          trigger: secondsFromNow as any,
        });

        reminder.nextNotificationDate = nextReminderDate;
      }
    } catch (error) {
      console.error("Failed to schedule shopping reminder:", error);
    }
  }
}

/**
 * إلغاء جميع التذكيرات لقائمة التسوق
 */
export async function cancelShoppingReminders(
  shoppingListId: string
): Promise<void> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of notifications) {
      if (
        (notification.content.data as any)?.shoppingListId === shoppingListId
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Failed to cancel shopping reminders:", error);
  }
}

/**
 * الحصول على قائمة التذكيرات الافتراضية
 */
export function getDefaultReminders(): ShoppingReminder[] {
  return [
    createShoppingReminder(
      "تذكير التسوق",
      "لا تنسَ! موعد التسوق غداً 🛒",
      1,
      "09:00"
    ),
    createShoppingReminder(
      "تذكير التسوق المبكر",
      "يمكنك البدء بالتحضير للتسوق بعد يومين 📝",
      2,
      "18:00"
    ),
  ];
}

/**
 * تحديث وقت التذكير
 */
export function updateReminderTime(
  reminder: ShoppingReminder,
  newTimeOfDay: string
): ShoppingReminder {
  return {
    ...reminder,
    timeOfDay: newTimeOfDay,
  };
}

/**
 * تفعيل/تعطيل التذكير
 */
export function toggleReminder(reminder: ShoppingReminder): ShoppingReminder {
  return {
    ...reminder,
    enabled: !reminder.enabled,
  };
}

/**
 * حذف تذكير
 */
export function deleteReminder(
  reminders: ShoppingReminder[],
  reminderId: string
): ShoppingReminder[] {
  return reminders.filter((r) => r.id !== reminderId);
}

/**
 * الحصول على التذكيرات النشطة
 */
export function getActiveReminders(
  reminders: ShoppingReminder[]
): ShoppingReminder[] {
  return reminders.filter((r) => r.enabled);
}

/**
 * صيغة عراقية للوقت
 */
export function formatTimeInIraqi(timeOfDay: string): string {
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  if (hours < 12) {
    return `${hours}:${minutes.toString().padStart(2, "0")} صباحاً`;
  } else if (hours === 12) {
    return `12:${minutes.toString().padStart(2, "0")} ظهراً`;
  } else {
    return `${hours - 12}:${minutes.toString().padStart(2, "0")} مساءً`;
  }
}

/**
 * الحصول على وصف التذكير الكامل
 */
export function getFullReminderDescription(
  reminder: ShoppingReminder,
  shoppingDate: Date
): string {
  const reminderDate = calculateNextReminderDate(
    shoppingDate,
    reminder.daysBeforeNotification,
    reminder.timeOfDay
  );

  const daysText =
    reminder.daysBeforeNotification === 1
      ? "غداً"
      : `بعد ${reminder.daysBeforeNotification} أيام`;

  return `${reminder.title}\n${daysText} في ${formatTimeInIraqi(
    reminder.timeOfDay
  )}\n${reminder.description}`;
}

/**
 * التحقق من ما إذا كان التذكير قد مر
 */
export function isReminderPassed(
  reminder: ShoppingReminder,
  shoppingDate: Date
): boolean {
  const reminderDate = calculateNextReminderDate(
    shoppingDate,
    reminder.daysBeforeNotification,
    reminder.timeOfDay
  );

  return reminderDate <= new Date();
}

/**
 * الحصول على أقرب تذكير قادم
 */
export function getNextUpcomingReminder(
  reminders: ShoppingReminder[],
  shoppingDate: Date
): ShoppingReminder | null {
  const activeReminders = getActiveReminders(reminders);

  const upcomingReminders = activeReminders.filter(
    (r) => !isReminderPassed(r, shoppingDate)
  );

  if (upcomingReminders.length === 0) return null;

  return upcomingReminders.sort((a, b) => {
    const dateA = calculateNextReminderDate(
      shoppingDate,
      a.daysBeforeNotification,
      a.timeOfDay
    );
    const dateB = calculateNextReminderDate(
      shoppingDate,
      b.daysBeforeNotification,
      b.timeOfDay
    );

    return dateA.getTime() - dateB.getTime();
  })[0];
}

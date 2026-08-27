export interface HealthWarningAccessInput {
  isPremium: boolean;
  unlockedByReward: boolean;
}

/**
 * Health warnings are visible to subscribers or after a successful rewarded ad.
 */
export function canViewHealthWarnings({
  isPremium,
  unlockedByReward,
}: HealthWarningAccessInput): boolean {
  return isPremium || unlockedByReward;
}

/**
 * Meal planning is a paid-only feature with no free-trial days.
 */
export function canUseMealPlanner(isSubscribed: boolean): boolean {
  return isSubscribed;
}

/**
 * Medication reminders are a paid-only feature, including creation, editing,
 * activation, and local notification scheduling.
 */
export function canUseMedicationReminders(isSubscribed: boolean): boolean {
  return isSubscribed;
}

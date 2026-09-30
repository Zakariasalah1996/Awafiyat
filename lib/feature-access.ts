export interface HealthWarningAccessInput {
  isPremium: boolean;
  previouslyUnlocked: boolean;
}

/**
 * Keep prior unlocks available while new access requires a subscription.
 */
export function canViewHealthWarnings({
  isPremium,
  previouslyUnlocked,
}: HealthWarningAccessInput): boolean {
  return isPremium || previouslyUnlocked;
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

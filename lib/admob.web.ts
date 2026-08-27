// Web stub for react-native-google-mobile-ads.
// AdMob does not work on web; native ad operations remain no-ops.

import type { RewardedAdResult } from "@/lib/admob-result";

export const FREE_RECIPES_COUNT = 5;
export const FREE_WARNINGS_COUNT = 3;

export async function getUnlockedRecipes(): Promise<string[]> {
  return [];
}

export async function unlockRecipe(_recipeId: string): Promise<void> {}

export async function isRecipeUnlocked(_recipeId: string, recipeIndex: number): Promise<boolean> {
  return recipeIndex < FREE_RECIPES_COUNT;
}

export async function getUnlockedWarnings(): Promise<string[]> {
  return [];
}

export async function unlockWarning(_warningId: string): Promise<void> {}

export async function isWarningUnlocked(_warningId: string, warningIndex: number): Promise<boolean> {
  return warningIndex < FREE_WARNINGS_COUNT;
}

/** Web previews have no native SDK, so content remains accessible. */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  return { status: "rewarded" };
}

export function preloadRewardedAd(): void {}

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { RECIPES } from "../lib/data/recipes";
import {
  canUseMealPlanner,
  canViewHealthWarnings,
} from "../lib/feature-access";
import {
  getMealPlannerAutofillPools,
  getMealPlannerPickerRecipes,
} from "../lib/meal-planner-recipes";
import { getSafeBottomPadding } from "../lib/safe-area-spacing";

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Health warning reward regression", () => {
  it("opens health warnings immediately for a rewarded non-subscriber", () => {
    expect(
      canViewHealthWarnings({
        isPremium: false,
        unlockedByReward: true,
      }),
    ).toBe(true);
  });

  it("keeps warnings locked before subscription or reward", () => {
    expect(
      canViewHealthWarnings({
        isPremium: false,
        unlockedByReward: false,
      }),
    ).toBe(false);
  });

  it("updates the same access state after a successful rewarded ad", () => {
    const source = readProjectFile("app/sections/recipe-detail.tsx");
    const rewardedBranch = source.match(
      /if \(result\.status === "rewarded"\) \{[\s\S]*?return;/,
    );

    expect(rewardedBranch?.[0]).toContain("setWarningUnlockedByAd(true)");
    expect(rewardedBranch?.[0]).toContain("setShowSubscriptionModal(false)");
  });
});

describe("Android bottom safe-area regression", () => {
  it("adds visual spacing above the reported system inset", () => {
    expect(getSafeBottomPadding(0, 16)).toBe(16);
    expect(getSafeBottomPadding(24, 16)).toBe(40);
    expect(getSafeBottomPadding(34, 28)).toBe(62);
  });

  it("uses safe bottom padding for all affected onboarding actions", () => {
    const source = readProjectFile("app/onboarding.tsx");

    expect(source).toContain("getSafeBottomPadding(insets.bottom, 16)");
    expect(source).toContain("getSafeBottomPadding(insets.bottom, 36)");
    expect(source).toContain("getSafeBottomPadding(insets.bottom, 28)");
    expect(source).toContain("تخطَّ الآن");
    expect(source).toContain("بياناتك آمنة وسرّية 100%");
  });

  it("keeps the unified paywall and purchase dismiss actions clear of system navigation", () => {
    const route = readProjectFile("app/subscription.tsx");
    const source = readProjectFile("components/storekit-subscription-screen.tsx");

    expect(route).toContain("storekit-subscription-screen");
    expect(source).toContain("useSafeAreaInsets");
    expect(source).toContain("Math.max(insets.bottom, 18) + 18");
    expect(source).toContain("bottomInset={insets.bottom}");
    expect(source).toContain('accessibilityLabel="العودة"');
    expect(source).toContain('accessibilityLabel="إغلاق"');
  });
});

describe("Subscriber-only meal planner regression", () => {
  it("allows the meal planner only for subscribed users", () => {
    expect(canUseMealPlanner(false)).toBe(false);
    expect(canUseMealPlanner(true)).toBe(true);
  });

  it("contains no free-trial day path and guards the planner screen", () => {
    const source = readProjectFile("app/sections/meal-planner.tsx");

    expect(source).not.toContain("@awafiyat_meal_planner_first_use");
    expect(source).not.toContain("FREE_TRIAL_DAYS");
    expect(source).not.toContain("FREE_DAYS_COUNT");
    expect(source).toContain("if (!canUseMealPlanner(isSubscribed))");
  });
});

describe("Full meal-planner recipe source regression", () => {
  it("shows the complete 250+ recipe library in manual selection", () => {
    const pickerRecipes = getMealPlannerPickerRecipes("breakfast", "none");

    expect(RECIPES.length).toBeGreaterThan(250);
    expect(pickerRecipes).toHaveLength(RECIPES.length);

    let encounteredNonBreakfast = false;
    for (const recipe of pickerRecipes) {
      const isBreakfast = recipe.mealType.includes("breakfast");
      if (!isBreakfast) encounteredNonBreakfast = true;
      if (isBreakfast) expect(encounteredNonBreakfast).toBe(false);
    }
  });

  it("builds automatic-fill pools from every matching recipe", () => {
    const pools = getMealPlannerAutofillPools();

    expect(pools.breakfast).toHaveLength(
      RECIPES.filter((recipe) => recipe.mealType.includes("breakfast")).length,
    );
    expect(pools.lunch).toHaveLength(
      RECIPES.filter((recipe) => recipe.mealType.includes("lunch")).length,
    );
    expect(pools.dinner).toHaveLength(
      RECIPES.filter((recipe) => recipe.mealType.includes("dinner")).length,
    );
    expect(pools.breakfast.length).toBeGreaterThan(30);
    expect(pools.lunch.length).toBeGreaterThan(30);
    expect(pools.dinner.length).toBeGreaterThan(30);
  });
});

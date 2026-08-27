import {
  RECIPES,
  type HealthTag,
  type MealType,
  type Recipe,
} from "./data/recipes";

export type MealPlannerAutofillPools = Record<
  Exclude<MealType, "snack">,
  Recipe[]
>;

function matchesHealthCondition(
  recipe: Recipe,
  healthCondition: HealthTag | "none",
): boolean {
  if (healthCondition === "none") return false;
  return (
    recipe.healthTags.includes(healthCondition) ||
    recipe.healthTags.includes("all")
  );
}

/**
 * Returns every recipe in the library. Recipes matching the selected meal are
 * ordered first, then recipes matching the user's health preference.
 */
export function getMealPlannerPickerRecipes(
  mealType: Exclude<MealType, "snack">,
  healthCondition: HealthTag | "none",
  recipes: readonly Recipe[] = RECIPES,
): Recipe[] {
  return [...recipes].sort((a, b) => {
    const aMealMatch = a.mealType.includes(mealType);
    const bMealMatch = b.mealType.includes(mealType);
    if (aMealMatch !== bMealMatch) return aMealMatch ? -1 : 1;

    const aHealthMatch = matchesHealthCondition(a, healthCondition);
    const bHealthMatch = matchesHealthCondition(b, healthCondition);
    if (aHealthMatch !== bHealthMatch) return aHealthMatch ? -1 : 1;

    return a.name.localeCompare(b.name, "ar");
  });
}

/**
 * Builds complete per-meal pools for automatic weekly scheduling.
 */
export function getMealPlannerAutofillPools(
  recipes: readonly Recipe[] = RECIPES,
): MealPlannerAutofillPools {
  return {
    breakfast: recipes.filter((recipe) =>
      recipe.mealType.includes("breakfast"),
    ),
    lunch: recipes.filter((recipe) => recipe.mealType.includes("lunch")),
    dinner: recipes.filter((recipe) => recipe.mealType.includes("dinner")),
  };
}

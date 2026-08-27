import { describe, expect, it } from "vitest";
import { RECIPES } from "../lib/data/recipes";
import {
  generateHealthWarnings,
  getHealthierRecipeAlternatives,
  getHealthWarningScore,
} from "../lib/health-warnings-engine";

const newRecipes = RECIPES.filter((recipe) => recipe.id.startsWith("global_"));

function warningsFor(recipe: (typeof RECIPES)[number], condition: "diabetes" | "hypertension" | "obesity" | "cholesterol") {
  return generateHealthWarnings(
    recipe.ingredients,
    recipe.steps,
    recipe.category,
    recipe.calories,
    recipe.carbs,
    recipe.fat,
    condition,
  );
}

describe("Health warnings for newly added recipes", () => {
  it("keeps all 745 newly added recipes in the shared health-warning flow", () => {
    expect(newRecipes).toHaveLength(745);
    for (const recipe of newRecipes) {
      for (const condition of ["diabetes", "hypertension", "obesity", "cholesterol"] as const) {
        const warnings = warningsFor(recipe, condition);
        expect(warnings.every((warning) => warning.alternatives.length > 0)).toBe(true);
      }
    }
  });

  it("warns on objective high-risk nutrition thresholds in new recipes", () => {
    const highCarb = newRecipes.filter((recipe) => recipe.carbs >= 45);
    const highCalorieOrFat = newRecipes.filter((recipe) => recipe.calories >= 400 || recipe.fat >= 18);
    const cholesterolRiskyIngredients = newRecipes.filter((recipe) =>
      /سمن|زبدة|قشطه|كريمه|لحم غنم|لحم ضان|لحم مفروم|لحم بقر|لحم عجل|سجق|نقانق/.test(
        recipe.ingredients.map((ingredient) => ingredient.name).join(" ").replace(/ة/g, "ه"),
      ),
    );

    expect(highCarb.length).toBeGreaterThan(0);
    expect(highCalorieOrFat.length).toBeGreaterThan(0);
    expect(cholesterolRiskyIngredients.length).toBeGreaterThan(0);
    expect(highCarb.every((recipe) => warningsFor(recipe, "diabetes").length > 0)).toBe(true);
    expect(highCalorieOrFat.every((recipe) => warningsFor(recipe, "obesity").length > 0)).toBe(true);
    expect(cholesterolRiskyIngredients.every((recipe) => warningsFor(recipe, "cholesterol").length > 0)).toBe(true);
  });

  it("offers real lower-warning recipes as alternatives when a warning exists", () => {
    const source = newRecipes.find((recipe) => getHealthWarningScore(recipe, "obesity") >= 3);
    expect(source).toBeDefined();

    const alternatives = getHealthierRecipeAlternatives(source!, RECIPES, "obesity");
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.every((recipe) => recipe.id !== source!.id)).toBe(true);
    expect(alternatives.every((recipe) => getHealthWarningScore(recipe, "obesity") < getHealthWarningScore(source!, "obesity"))).toBe(true);
  });
});

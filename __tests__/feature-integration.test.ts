import { describe, it, expect } from "vitest";
import { RECIPES, getRecipeById, searchRecipes, getRecipesByCategory, getRecipesByHealth } from "../lib/data/recipes";

describe("Recipes Database Integration", () => {
  it("should have at least 35 recipes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(35);
  });

  it("should include original recipes", () => {
    const breakfast1 = getRecipeById("breakfast_1");
    expect(breakfast1).toBeDefined();
    expect(breakfast1?.name).toBe("خبز عروك عراقي");
  });

  it("should include new recipes", () => {
    const new1 = getRecipeById("new_1");
    expect(new1).toBeDefined();
    expect(new1?.name).toBe("مسقعة البيض العراقية");

    const new12 = getRecipeById("new_12");
    expect(new12).toBeDefined();
    expect(new12?.name).toBe("الكليجة العراقية");
  });

  it("should search recipes correctly", () => {
    const results = searchRecipes("حمص");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name.includes("حمص"))).toBe(true);
  });

  it("should filter by category", () => {
    const healthy = getRecipesByCategory("healthy");
    expect(healthy.length).toBeGreaterThan(0);
    healthy.forEach((r) => expect(r.category).toBe("healthy"));
  });

  it("should filter by health condition", () => {
    const diabetesRecipes = getRecipesByHealth("diabetes");
    expect(diabetesRecipes.length).toBeGreaterThan(0);
    diabetesRecipes.forEach((r) => {
      expect(r.healthTags.includes("diabetes") || r.healthTags.includes("all")).toBe(true);
    });
  });

  it("all recipes should have required fields", () => {
    RECIPES.forEach((recipe) => {
      expect(recipe.id).toBeTruthy();
      expect(recipe.name).toBeTruthy();
      expect(recipe.description).toBeTruthy();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.calories).toBeGreaterThan(0);
      expect(recipe.servings).toBeGreaterThan(0);
    });
  });

  it("new recipes should have valid categories", () => {
    const validCategories = ["quick", "hearty", "healthy", "dessert"];
    const newRecipes = RECIPES.filter((r) => r.id.startsWith("new_"));
    expect(newRecipes.length).toBe(12);
    newRecipes.forEach((r) => {
      expect(validCategories).toContain(r.category);
    });
  });
});

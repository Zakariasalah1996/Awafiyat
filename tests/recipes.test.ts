import { describe, it, expect } from "vitest";
import {
  RECIPES,
  getRecipesByCategory,
  getRecipesByMealType,
  getRecipesByHealth,
  getRecipeById,
  searchRecipes,
  getQuickRecipes,
  getHeartyRecipes,
  getHealthyRecipes,
  type Recipe,
} from "../lib/data/recipes";
import { searchIngredients } from "../lib/data/ingredients";

describe("Recipes Database", () => {
  it("should have at least 20 recipes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(20);
  });

  it("should return recipes by category", () => {
    const heartyRecipes = getRecipesByCategory("hearty");
    const healthyRecipes = getRecipesByCategory("healthy");

    expect(heartyRecipes.length).toBeGreaterThan(0);
    expect(healthyRecipes.length).toBeGreaterThan(0);
  });

  it("should return recipes by meal type", () => {
    const breakfast = getRecipesByMealType("breakfast");
    const lunch = getRecipesByMealType("lunch");
    const dinner = getRecipesByMealType("dinner");

    expect(breakfast.length).toBeGreaterThan(0);
    expect(lunch.length).toBeGreaterThan(0);
    expect(dinner.length).toBeGreaterThan(0);
  });

  it("should find recipe by ID", () => {
    const firstRecipe = RECIPES[0];
    const found = getRecipeById(firstRecipe.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(firstRecipe.id);
    expect(found?.name).toBe(firstRecipe.name);
  });

  it("should return undefined for non-existent recipe ID", () => {
    const found = getRecipeById("non-existent-id");
    expect(found).toBeUndefined();
  });

  it("should search recipes by name", () => {
    const results = searchRecipes("خبز");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should return recipes for health conditions (includes 'all' tag)", () => {
    const diabetesRecipes = getRecipesByHealth("diabetes");
    const hypertensionRecipes = getRecipesByHealth("hypertension");

    expect(diabetesRecipes.length).toBeGreaterThan(0);
    expect(hypertensionRecipes.length).toBeGreaterThan(0);

    // Each recipe should have either the specific condition or "all" tag
    diabetesRecipes.forEach((recipe: Recipe) => {
      const hasDiabetesOrAll =
        recipe.healthTags.includes("diabetes") || recipe.healthTags.includes("all");
      expect(hasDiabetesOrAll).toBe(true);
    });
  });

  it("each recipe should have required fields", () => {
    RECIPES.forEach((recipe: Recipe) => {
      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBeDefined();
      expect(recipe.name.length).toBeGreaterThan(0);
      expect(recipe.ingredients).toBeDefined();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps).toBeDefined();
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.calories).toBeDefined();
      expect(recipe.calories).toBeGreaterThan(0);
      expect(recipe.prepTime).toBeDefined();
      expect(recipe.category).toBeDefined();
      expect(recipe.mealType).toBeDefined();
    });
  });

  it("quick recipes helper should return recipes with total time <= 30 min", () => {
    const quick = getQuickRecipes();
    expect(quick.length).toBeGreaterThan(0);
    quick.forEach((r: Recipe) => {
      expect(r.prepTime + r.cookTime).toBeLessThanOrEqual(30);
    });
  });

  it("hearty recipes helper should work", () => {
    const hearty = getHeartyRecipes();
    expect(hearty.length).toBeGreaterThan(0);
    hearty.forEach((r: Recipe) => {
      expect(r.category).toBe("hearty");
    });
  });

  it("healthy recipes helper should work", () => {
    const healthy = getHealthyRecipes();
    expect(healthy.length).toBeGreaterThan(0);
    healthy.forEach((r: Recipe) => {
      expect(r.category).toBe("healthy");
    });
  });
});

describe("Ingredients Database", () => {
  it("should return suggestions for Arabic input لح", () => {
    const results = searchIngredients("لح");
    expect(results.length).toBeGreaterThan(0);
    const hasLahm = results.some((r) => r.name.includes("لحم"));
    expect(hasLahm).toBe(true);
  });

  it("should return suggestions for بص", () => {
    const results = searchIngredients("بص");
    expect(results.length).toBeGreaterThan(0);
    const hasBasal = results.some((r) => r.name.includes("بصل"));
    expect(hasBasal).toBe(true);
  });

  it("should return suggestions for طم", () => {
    const results = searchIngredients("طم");
    expect(results.length).toBeGreaterThan(0);
    const hasTamata = results.some((r) => r.name.includes("طماط"));
    expect(hasTamata).toBe(true);
  });

  it("should return empty array for non-matching input", () => {
    const results = searchIngredients("xyz123");
    expect(results.length).toBe(0);
  });
});

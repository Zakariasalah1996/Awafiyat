import { describe, expect, it } from "vitest";

import { GLOBAL_RECIPE_BATCH_1 } from "../lib/global-recipes-batch-1";
import { GLOBAL_RECIPE_BATCH_2 } from "../lib/global-recipes-batch-2";
import { getAllRecipes } from "../lib/recipes-database";

describe("الدفعة الثانية من الوصفات العالمية", () => {
  it("تحتوي على مئة وصفة موثقة جديدة، مرتبطة ببلد وصورة", () => {
    expect(GLOBAL_RECIPE_BATCH_2).toHaveLength(100);
    expect(new Set(GLOBAL_RECIPE_BATCH_2.map((recipe) => recipe.name)).size).toBe(100);
    const firstBatchNames = new Set(GLOBAL_RECIPE_BATCH_1.map((recipe) => recipe.name));
    GLOBAL_RECIPE_BATCH_2.forEach((recipe) => {
      expect(firstBatchNames.has(recipe.name)).toBe(false);
      expect(recipe.cuisine).toBe("international");
      expect(recipe.country).toBeTruthy();
      expect(recipe.country).not.toBe("العراق");
      expect(recipe.image).toMatch(/^https:\/\/files\.manuscdn\.com\//);
      expect(recipe.ingredients.length).toBeGreaterThan(2);
      expect(recipe.instructions.length).toBeGreaterThan(3);
    });
  });

  it("يوسع المكتبة إلى 223 وصفة دون العودة للوصفات التلقائية", () => {
    const recipes = getAllRecipes();
    expect(recipes).toHaveLength(323);
    expect(new Set(recipes.map((recipe) => recipe.name)).size).toBe(323);
    expect(recipes.some((recipe) => recipe.name.startsWith("وصفة متنوعة"))).toBe(false);
  });
});

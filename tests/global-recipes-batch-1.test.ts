import { describe, expect, it } from "vitest";

import { GLOBAL_RECIPE_BATCH_1 } from "../lib/global-recipes-batch-1";
import { getAllRecipes } from "../lib/recipes-database";

describe("الدفعة الأولى من الوصفات العالمية", () => {
  it("تحتوي على مئة وصفة موثقة غير مكررة ومرتبطة بدولة وصورة", () => {
    expect(GLOBAL_RECIPE_BATCH_1).toHaveLength(100);
    expect(new Set(GLOBAL_RECIPE_BATCH_1.map((recipe) => recipe.name)).size).toBe(100);
    GLOBAL_RECIPE_BATCH_1.forEach((recipe) => {
      expect(recipe.cuisine).toBe("international");
      expect(recipe.country).toBeTruthy();
      expect(recipe.country).not.toBe("العراق");
      expect(recipe.image).toMatch(/^\/manus-storage\//);
      expect(recipe.ingredients.length).toBeGreaterThan(2);
      expect(recipe.instructions.length).toBeGreaterThan(3);
    });
  });

  it("يستبدل الوصفات التلقائية غير الحقيقية بمحتوى مكتبة ثابت", () => {
    const recipes = getAllRecipes();
    expect(recipes).toHaveLength(323);
    expect(recipes.some((recipe) => recipe.name.startsWith("وصفة متنوعة"))).toBe(false);
  });
});

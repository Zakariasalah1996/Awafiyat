import { describe, expect, it } from "vitest";
import { RECIPES } from "../lib/data/recipes";
import {
  CUISINE_GROUPS,
  filterRecipesByCuisineGroup,
  getCuisineGroupKey,
} from "../lib/cuisine-groups";

describe("Cuisine groups", () => {
  it("groups Levant recipes under one شامية card", () => {
    const levantine = filterRecipesByCuisineGroup(RECIPES, "levantine");
    expect(levantine).toHaveLength(60);
    expect(levantine.every((recipe) => ["الأردن", "فلسطين", "سوريا"].includes(recipe.country ?? ""))).toBe(true);
    expect(CUISINE_GROUPS.find((group) => group.key === "levantine")?.label).toBe("أكلات شامية");
  });

  it("keeps Iraq independent and combines Gulf states under one card", () => {
    const iraqi = filterRecipesByCuisineGroup(RECIPES, "iraqi");
    const gulf = filterRecipesByCuisineGroup(RECIPES, "gulf");
    expect(iraqi.every((recipe) => recipe.isIraqi || recipe.origin === "iraqi" || recipe.origin === "kurdish")).toBe(true);
    expect(gulf.every((recipe) => ["السعودية", "الإمارات", "الإمارات العربية المتحدة", "البحرين", "قطر", "الكويت", "عمان", "عُمان"].includes(recipe.country ?? ""))).toBe(true);
    expect(CUISINE_GROUPS.find((group) => group.key === "iraqi")?.label).toBe("أكلات عراقية");
    expect(CUISINE_GROUPS.find((group) => group.key === "gulf")?.label).toBe("أكلات خليجية");
  });

  it("groups European and American countries instead of exposing country cards", () => {
    expect(CUISINE_GROUPS.find((group) => group.key === "western_european")?.label).toBe("وصفات غربية وأوروبية");
    expect(CUISINE_GROUPS.find((group) => group.key === "american")?.label).toBe("وصفات أمريكية");
    expect(getCuisineGroupKey(RECIPES.find((recipe) => recipe.country === "إيطاليا")!)).toBe("western_european");
    expect(getCuisineGroupKey(RECIPES.find((recipe) => recipe.country === "الولايات المتحدة")!)).toBe("american");
  });

  it("assigns every recipe to exactly one regional cuisine group", () => {
    const regionalKeys = CUISINE_GROUPS.filter((group) => group.key !== "all").map((group) => group.key);
    const groupedIds = regionalKeys.flatMap((key) => filterRecipesByCuisineGroup(RECIPES, key).map((recipe) => recipe.id));
    expect(groupedIds).toHaveLength(RECIPES.length);
    expect(new Set(groupedIds).size).toBe(RECIPES.length);
  });
});

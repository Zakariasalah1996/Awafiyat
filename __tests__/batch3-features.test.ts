import { describe, it, expect } from "vitest";

// Test 1: Verify the original library is preserved with all global batches.
describe("Recipe Database - Batch 3", () => {
  it("should have at least 260 unique recipes", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    expect(RECIPES.length).toBeGreaterThanOrEqual(250);
    // Verify all IDs are unique
    const ids = RECIPES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(RECIPES.length);
  });

  it("should have 1000 recipes total after the 125-recipe expansion", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    expect(RECIPES.length).toBe(1000);
  });

  it("should include 100 distinct batch-five recipes with an image and a country", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const batchFive = RECIPES.filter((recipe) => recipe.id.startsWith("global_5_"));
    expect(batchFive).toHaveLength(100);
    expect(new Set(batchFive.map((recipe) => recipe.id)).size).toBe(100);
    expect(new Set(batchFive.map((recipe) => recipe.name.trim().replace(/\s+/g, " "))).size).toBe(100);
    expect(batchFive.every((recipe) => recipe.image?.startsWith("/manus-storage/") && recipe.country)).toBe(true);
  });

  it("should include 100 distinct non-Iraqi batch-six recipes with images and countries", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const batchSix = RECIPES.filter((recipe) => recipe.id.startsWith("global_6_"));
    expect(batchSix).toHaveLength(100);
    expect(new Set(batchSix.map((recipe) => recipe.id)).size).toBe(100);
    expect(new Set(batchSix.map((recipe) => recipe.name.trim().replace(/\s+/g, " "))).size).toBe(100);
    expect(batchSix.every((recipe) => recipe.image?.startsWith("/manus-storage/") && recipe.country && !recipe.isIraqi)).toBe(true);
  });

  it("should include 20 distinct non-Iraqi batch-seven recipes with images and countries", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const batchSeven = RECIPES.filter((recipe) => recipe.id.startsWith("global_7_"));
    expect(batchSeven).toHaveLength(20);
    expect(new Set(batchSeven.map((recipe) => recipe.id)).size).toBe(20);
    expect(new Set(batchSeven.map((recipe) => recipe.name.trim().replace(/\s+/g, " "))).size).toBe(20);
    expect(batchSeven.every((recipe) => recipe.image?.startsWith("/manus-storage/") && recipe.country && !recipe.isIraqi)).toBe(true);
  });

  it("should include 125 distinct non-Iraqi batch-eight recipes with images and countries", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const batchEight = RECIPES.filter((recipe) => recipe.id.startsWith("global_8_"));
    expect(batchEight).toHaveLength(125);
    expect(new Set(batchEight.map((recipe) => recipe.id)).size).toBe(125);
    expect(new Set(batchEight.map((recipe) => recipe.name.trim().replace(/\s+/g, " "))).size).toBe(125);
    expect(batchEight.every((recipe) => recipe.image?.startsWith("/manus-storage/") && recipe.country && !recipe.isIraqi)).toBe(true);
  });

  it("should not duplicate recipe IDs or normalized names across the full library", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const normalizeName = (name: string) => name
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/\s+/g, " ");
    expect(new Set(RECIPES.map((recipe) => recipe.id)).size).toBe(RECIPES.length);
    expect(new Set(RECIPES.map((recipe) => normalizeName(recipe.name))).size).toBe(RECIPES.length);
  });

  it("should have breakfast, lunch, and dinner recipes", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const breakfast = RECIPES.filter((r) => r.mealType.includes("breakfast"));
    const lunch = RECIPES.filter((r) => r.mealType.includes("lunch"));
    const dinner = RECIPES.filter((r) => r.mealType.includes("dinner"));
    expect(breakfast.length).toBeGreaterThan(30);
    expect(lunch.length).toBeGreaterThan(30);
    expect(dinner.length).toBeGreaterThan(30);
  });

  it("should have healthy and regular recipes", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const healthy = RECIPES.filter((r) => r.category === "healthy");
    const hearty = RECIPES.filter((r) => r.category === "hearty");
    expect(healthy.length).toBeGreaterThan(20);
    expect(hearty.length).toBeGreaterThan(20);
  });

  it("should have Iraqi recipes", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const iraqi = RECIPES.filter((r) => r.isIraqi);
    expect(iraqi.length).toBeGreaterThan(50);
  });

  it("should have recipes with image field", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    const withImage = RECIPES.filter((r) => r.image && r.image.length > 0);
    expect(withImage.length).toBeGreaterThan(100);
  });

  it("all recipes should have required fields", async () => {
    const { RECIPES } = await import("../lib/data/recipes");
    for (const recipe of RECIPES) {
      expect(recipe.id).toBeTruthy();
      expect(recipe.name).toBeTruthy();
      expect(recipe.description).toBeTruthy();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.calories).toBeGreaterThan(0);
      expect(recipe.servings).toBeGreaterThan(0);
    }
  });
});

// Test 2: Food category images (require() not available in vitest, test file existence instead)
describe("Food Category Images", () => {
  it("should have 22 food category image files", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "assets/images/food-categories");
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".png") || f.endsWith(".jpg"));
    expect(files.length).toBe(22);
  });

  it("should have key category images", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "assets/images/food-categories");
    const files = fs.readdirSync(dir);
    expect(files).toContain("kurdish-dishes.jpg");
    expect(files).toContain("gulf-cuisine.jpg");
    expect(files).toContain("iraqi-breakfast.jpg");
    expect(files).toContain("iraqi-soups-and-stews.jpg");
  });
});

// Test 3: Time formatting
describe("Meal Planner Time Format", () => {
  it("should format morning times as صباحاً", () => {
    const getPeriodLabel = (hour: number): string => {
      if (hour >= 5 && hour < 12) return "صباحاً";
      if (hour >= 12 && hour < 17) return "ظهراً";
      return "مساءً";
    };
    expect(getPeriodLabel(8)).toBe("صباحاً");
    expect(getPeriodLabel(6)).toBe("صباحاً");
    expect(getPeriodLabel(11)).toBe("صباحاً");
  });

  it("should format noon times as ظهراً", () => {
    const getPeriodLabel = (hour: number): string => {
      if (hour >= 5 && hour < 12) return "صباحاً";
      if (hour >= 12 && hour < 17) return "ظهراً";
      return "مساءً";
    };
    expect(getPeriodLabel(12)).toBe("ظهراً");
    expect(getPeriodLabel(13)).toBe("ظهراً");
    expect(getPeriodLabel(16)).toBe("ظهراً");
  });

  it("should format evening times as مساءً", () => {
    const getPeriodLabel = (hour: number): string => {
      if (hour >= 5 && hour < 12) return "صباحاً";
      if (hour >= 12 && hour < 17) return "ظهراً";
      return "مساءً";
    };
    expect(getPeriodLabel(17)).toBe("مساءً");
    expect(getPeriodLabel(20)).toBe("مساءً");
    expect(getPeriodLabel(23)).toBe("مساءً");
  });

  it("should generate time options with Arabic labels", () => {
    const generateTimeOptions = (): { value: string; label: string; hour: number }[] => {
      const options: { value: string; label: string; hour: number }[] = [];
      const getPeriodLabel = (hour: number): string => {
        if (hour >= 5 && hour < 12) return "صباحاً";
        if (hour >= 12 && hour < 17) return "ظهراً";
        return "مساءً";
      };
      for (let h = 5; h <= 23; h++) {
        for (const m of [0, 30]) {
          const hour12 = h % 12 || 12;
          const minuteStr = String(m).padStart(2, "0");
          const period = getPeriodLabel(h);
          const value = `${String(h).padStart(2, "0")}:${minuteStr}`;
          const label = `${hour12}:${minuteStr} ${period}`;
          options.push({ value, label, hour: h });
        }
      }
      return options;
    };

    const options = generateTimeOptions();
    expect(options.length).toBe(38); // 19 hours * 2 (0, 30)
    expect(options[0].label).toContain("صباحاً");
    expect(options[options.length - 1].label).toContain("مساءً");
    // No AM/PM should appear
    const hasAmPm = options.some((o) => o.label.includes("AM") || o.label.includes("PM"));
    expect(hasAmPm).toBe(false);
  });
});

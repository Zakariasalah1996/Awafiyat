import { describe, expect, it } from "vitest";

import { buildBeverageShareText, buildRecipeShareText } from "../lib/share-content";

describe("محتوى المشاركة", () => {
  it("ينشئ نص وصفة عربياً كاملاً وقابلاً للمشاركة", () => {
    const text = buildRecipeShareText(
      {
        id: "global_1_1",
        name: "معكرونة بالخضار",
        description: "وصفة خفيفة وسريعة.",
        country: "إيطاليا",
        ingredients: [
          { name: "معكرونة", amount: "كوبان" },
          { name: "خضار", amount: "كوب" },
        ],
        steps: ["تُسلق المعكرونة", "تُخلط مع الخضار"],
        servings: 2,
        prepTime: 10,
        cookTime: 15,
        calories: 320,
      },
      "manushealth://sections/recipe-detail?id=global_1_1",
    );

    expect(text).toContain("🍽️ معكرونة بالخضار");
    expect(text).toContain("📍 المطبخ: إيطاليا");
    expect(text).toContain("• معكرونة: كوبان");
    expect(text).toContain("1. تُسلق المعكرونة");
    expect(text).toContain("manushealth://sections/recipe-detail?id=global_1_1");
  });

  it("ينشئ نص مشروب ويبيّن حرارته ورابطه", () => {
    const text = buildBeverageShareText(
      {
        id: "bev_86",
        name: "ماء الفراولة والريحان",
        description: "مشروب بارد للترطيب.",
        type: "cold",
        calories: 15,
        ingredients: [{ name: "فراولة", amount: "5 حبات" }],
        steps: ["يُبرّد ويُقدّم"],
      },
      "manushealth://sections/beverages?beverage=bev_86",
    );

    expect(text).toContain("🥤 ماء الفراولة والريحان");
    expect(text).toContain("النوع: بارد");
    expect(text).toContain("• فراولة: 5 حبات");
    expect(text).toContain("manushealth://sections/beverages?beverage=bev_86");
  });
});

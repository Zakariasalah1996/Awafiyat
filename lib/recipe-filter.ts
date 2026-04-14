import { HealthCondition } from "./user-context";
import { Recipe } from "./recipes-database";

/**
 * قوائم الأطعمة الممنوعة والمسموحة حسب الحالة الصحية
 * بناءً على التوصيات الطبية والغذائية
 */

interface HealthRestrictions {
  forbiddenIngredients: string[];
  forbiddenCategories: string[];
  maxCalories?: number;
  maxSodium?: number;
  maxFat?: number;
  maxCarbs?: number;
  maxSugar?: number;
  recommendation: string;
}

const HEALTH_RESTRICTIONS: Record<HealthCondition, HealthRestrictions> = {
  none: {
    forbiddenIngredients: [],
    forbiddenCategories: [],
    recommendation: "يمكنك الاستمتاع بجميع الوصفات! 🎉",
  },

  diabetes: {
    forbiddenIngredients: [
      "سكر",
      "عسل",
      "شيرة",
      "حلويات",
      "مربى",
      "شراب",
      "دبس",
      "جلاتين",
      "آيس كريم",
    ],
    forbiddenCategories: ["dessert"],
    maxCarbs: 50,
    maxSugar: 10,
    recommendation:
      "اختر الوصفات قليلة السكريات والكربوهيدرات. تجنب الحلويات والمشروبات السكرية 🩺",
  },

  hypertension: {
    forbiddenIngredients: [
      "ملح",
      "صلصة صويا",
      "مرقة معلبة",
      "لحوم مصنعة",
      "أسماك مملحة",
      "جبن مملح",
      "زيتون مملح",
      "خيار مخلل",
    ],
    forbiddenCategories: [],
    maxSodium: 2300,
    recommendation:
      "اختر الوصفات قليلة الملح. استخدم الأعشاب والتوابل بدلاً من الملح 🧂",
  },

  obesity: {
    forbiddenIngredients: [
      "سمن",
      "زيت كثير",
      "كريمة",
      "زبدة",
      "لحم دهني",
      "جلد الدجاج",
      "جبن كامل الدسم",
      "حليب كامل الدسم",
      "مكسرات كثيرة",
    ],
    forbiddenCategories: ["dessert"],
    maxCalories: 2000,
    maxFat: 65,
    recommendation:
      "اختر الوصفات قليلة السعرات والدهون. ركز على البروتين والخضار 💪",
  },

  cholesterol: {
    forbiddenIngredients: [
      "كبدة",
      "كلاوي",
      "صفار البيض",
      "زبدة",
      "كريمة",
      "جبن كامل الدسم",
      "لحم دهني",
      "دهن",
      "زيت نخيل",
    ],
    forbiddenCategories: [],
    maxFat: 50,
    maxSodium: 2300,
    recommendation:
      "اختر الوصفات قليلة الدهون المشبعة. استخدم زيت الزيتون والدهون الصحية 🫒",
  },
};

/**
 * تقييم ما إذا كانت الوصفة مناسبة للحالة الصحية
 */
export function isRecipeSuitableForHealth(
  recipe: Recipe,
  healthCondition: HealthCondition
): {
  suitable: boolean;
  reasons: string[];
  score: number;
} {
  if (healthCondition === "none") {
    return { suitable: true, reasons: [], score: 100 };
  }

  const restrictions = HEALTH_RESTRICTIONS[healthCondition];
  const reasons: string[] = [];
  let score = 100;

  // التحقق من المكونات الممنوعة
  for (const ingredient of recipe.ingredients) {
    for (const forbidden of restrictions.forbiddenIngredients) {
      if (ingredient.toLowerCase().includes(forbidden.toLowerCase())) {
        reasons.push(`يحتوي على ${ingredient} (ممنوع)`);
        score -= 20;
      }
    }
  }

  // التحقق من الفئات الممنوعة
  if (restrictions.forbiddenCategories.includes(recipe.category)) {
    reasons.push(`فئة الوصفة (${recipe.category}) قد لا تكون مناسبة`);
    score -= 30;
  }

  // التحقق من القيم الغذائية
  if (restrictions.maxCalories && recipe.calories > restrictions.maxCalories) {
    reasons.push(
      `السعرات الحرارية عالية (${recipe.calories} سعرة)`
    );
    score -= 15;
  }

  if (restrictions.maxFat && recipe.fat > restrictions.maxFat) {
    reasons.push(`محتوى الدهون عالي (${recipe.fat}g)`);
    score -= 15;
  }

  if (restrictions.maxCarbs && recipe.carbs > restrictions.maxCarbs) {
    reasons.push(`محتوى الكربوهيدرات عالي (${recipe.carbs}g)`);
    score -= 15;
  }

  const suitable = score >= 50;
  return { suitable, reasons, score: Math.max(0, score) };
}

/**
 * فلترة الوصفات بناءً على الحالة الصحية
 */
export function filterRecipesByHealth(
  recipes: Recipe[],
  healthCondition: HealthCondition,
  includeWarnings: boolean = false
): {
  suitable: Recipe[];
  warnings: Array<{ recipe: Recipe; reasons: string[] }>;
} {
  const suitable: Recipe[] = [];
  const warnings: Array<{ recipe: Recipe; reasons: string[] }> = [];

  for (const recipe of recipes) {
    const evaluation = isRecipeSuitableForHealth(recipe, healthCondition);

    if (evaluation.suitable) {
      suitable.push(recipe);
    } else if (includeWarnings) {
      warnings.push({
        recipe,
        reasons: evaluation.reasons,
      });
    }
  }

  return { suitable, warnings };
}

/**
 * الحصول على التوصية الصحية للحالة
 */
export function getHealthRecommendation(
  healthCondition: HealthCondition
): string {
  return HEALTH_RESTRICTIONS[healthCondition].recommendation;
}

/**
 * حساب درجة الملاءمة الإجمالية للوصفة
 */
export function calculateRecipeScore(
  recipe: Recipe,
  healthCondition: HealthCondition
): number {
  if (healthCondition === "none") return 100;

  const evaluation = isRecipeSuitableForHealth(recipe, healthCondition);
  return evaluation.score;
}

/**
 * ترتيب الوصفات حسب الملاءمة الصحية
 */
export function sortRecipesByHealth(
  recipes: Recipe[],
  healthCondition: HealthCondition
): Recipe[] {
  return [...recipes].sort((a, b) => {
    const scoreA = calculateRecipeScore(a, healthCondition);
    const scoreB = calculateRecipeScore(b, healthCondition);
    return scoreB - scoreA;
  });
}

/**
 * الحصول على تفاصيل التقييم الصحي للوصفة
 */
export function getHealthEvaluation(
  recipe: Recipe,
  healthCondition: HealthCondition
): {
  suitable: boolean;
  score: number;
  reasons: string[];
  recommendation: string;
  healthTags: string[];
} {
  const evaluation = isRecipeSuitableForHealth(recipe, healthCondition);
  const restrictions = HEALTH_RESTRICTIONS[healthCondition];

  return {
    suitable: evaluation.suitable,
    score: evaluation.score,
    reasons: evaluation.reasons,
    recommendation: restrictions.recommendation,
    healthTags: recipe.healthTags,
  };
}

/**
 * الحصول على بدائل صحية للوصفة
 */
export function getHealthyAlternatives(
  recipe: Recipe,
  allRecipes: Recipe[],
  healthCondition: HealthCondition,
  limit: number = 3
): Recipe[] {
  const evaluation = isRecipeSuitableForHealth(recipe, healthCondition);

  // إذا كانت الوصفة مناسبة بالفعل، لا نحتاج إلى بدائل
  if (evaluation.suitable) return [];

  // البحث عن وصفات بنفس الفئة والمطبخ لكنها صحية أكثر
  const alternatives = allRecipes
    .filter(
      (r) =>
        r.category === recipe.category &&
        r.cuisine === recipe.cuisine &&
        r.id !== recipe.id
    )
    .filter((r) => {
      const altEval = isRecipeSuitableForHealth(r, healthCondition);
      return altEval.suitable;
    })
    .sort((a, b) => {
      const scoreA = calculateRecipeScore(a, healthCondition);
      const scoreB = calculateRecipeScore(b, healthCondition);
      return scoreB - scoreA;
    })
    .slice(0, limit);

  return alternatives;
}

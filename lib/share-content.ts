export type ShareIngredient = {
  name: string;
  amount: string;
};

export type ShareableRecipe = {
  id: string;
  name: string;
  description: string;
  ingredients: ShareIngredient[];
  steps: string[];
  servings: number;
  prepTime: number;
  cookTime: number;
  calories: number;
  category?: string;
  country?: string;
};

export type ShareableBeverage = {
  id: string;
  name: string;
  description: string;
  type: "hot" | "cold";
  ingredients: ShareIngredient[];
  steps: string[];
  calories: number;
};

const formatIngredients = (ingredients: ShareIngredient[]) =>
  ingredients.map((ingredient) => `• ${ingredient.name}: ${ingredient.amount}`).join("\n");

const formatSteps = (steps: string[]) =>
  steps.map((step, index) => `${index + 1}. ${step}`).join("\n");

export function buildRecipeShareText(recipe: ShareableRecipe, link: string): string {
  const origin = recipe.country ? `\n📍 المطبخ: ${recipe.country}` : "";
  const totalTime = recipe.prepTime + recipe.cookTime;

  return [
    `🍽️ ${recipe.name}`,
    recipe.description,
    origin,
    `⏱️ الوقت: ${totalTime} دقيقة • 👥 يكفي ${recipe.servings} أشخاص • 🔥 ${recipe.calories} سعرة للحصة`,
    "",
    "المكونات:",
    formatIngredients(recipe.ingredients),
    "",
    "طريقة التحضير:",
    formatSteps(recipe.steps),
    "",
    `افتح الوصفة في تطبيق ألف عافيات: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBeverageShareText(beverage: ShareableBeverage, link: string): string {
  const temperature = beverage.type === "hot" ? "ساخن" : "بارد";

  return [
    `🥤 ${beverage.name}`,
    beverage.description,
    `❄️/♨️ النوع: ${temperature} • 🔥 ${beverage.calories} سعرة تقريباً`,
    "",
    "المكونات:",
    formatIngredients(beverage.ingredients),
    "",
    "طريقة التحضير:",
    formatSteps(beverage.steps),
    "",
    `افتح المشروب في تطبيق ألف عافيات: ${link}`,
  ].join("\n");
}

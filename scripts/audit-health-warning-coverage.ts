import { RECIPES } from "../lib/data/recipes";
import { generateHealthWarnings } from "../lib/health-warnings-engine";
import type { HealthCondition } from "../lib/user-context";

const conditions: HealthCondition[] = ["diabetes", "hypertension", "obesity", "cholesterol"];
const originalRecipes = RECIPES.filter((recipe) => !recipe.id.startsWith("global_"));
const newRecipes = RECIPES.filter((recipe) => recipe.id.startsWith("global_"));

function inspect(recipes: typeof RECIPES) {
  return Object.fromEntries(conditions.map((condition) => {
    const withWarnings = recipes.filter((recipe) => generateHealthWarnings(
      recipe.ingredients,
      recipe.steps,
      recipe.category,
      recipe.calories,
      recipe.carbs,
      recipe.fat,
      condition,
    ).length > 0);
    const withoutWarnings = recipes.filter((recipe) => !withWarnings.includes(recipe));
    return [condition, {
      total: recipes.length,
      withWarnings: withWarnings.length,
      withoutWarnings: withoutWarnings.length,
      sampleWithoutWarnings: withoutWarnings.slice(0, 12).map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        calories: recipe.calories,
        carbs: recipe.carbs,
        fat: recipe.fat,
        ingredients: recipe.ingredients.slice(0, 4).map((ingredient) => ingredient.name),
      })),
    }];
  }));
}

console.log(JSON.stringify({
  total: RECIPES.length,
  original: inspect(originalRecipes),
  newlyAdded: inspect(newRecipes),
}, null, 2));

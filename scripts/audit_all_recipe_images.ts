import { RECIPES } from "../lib/data/recipes";

const missing = RECIPES.filter((recipe) => !recipe.image?.trim());
const generated = RECIPES.filter((recipe) => recipe.image?.startsWith("/manus-storage/"));
const nonGenerated = RECIPES.filter((recipe) => recipe.image && !recipe.image.startsWith("/manus-storage/"));

console.log(JSON.stringify({
  total: RECIPES.length,
  recipesWithImage: RECIPES.length - missing.length,
  missing: missing.map((recipe) => ({ id: recipe.id, name: recipe.name })),
  generatedImageLinks: generated.length,
  localOrMappedImageKeys: nonGenerated.length,
}, null, 2));

if (RECIPES.length !== 1000 || missing.length > 0) {
  process.exitCode = 1;
}

import { RECIPES } from "../lib/data/recipes";
import { writeFileSync } from "node:fs";

const original = RECIPES.filter((recipe) => !recipe.id.startsWith("global_"));
const global = RECIPES.filter((recipe) => recipe.id.startsWith("global_"));
const normalize = (value: string) => value.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const globalNames = new Map(global.map((recipe) => [normalize(recipe.name), recipe]));
const crossDuplicates = original
  .filter((recipe) => globalNames.has(normalize(recipe.name)))
  .map((recipe) => ({ original: recipe.name, global: globalNames.get(normalize(recipe.name))?.name }));
const missingImages = original.filter((recipe) => !recipe.image || recipe.image.trim().length === 0).map((recipe) => ({ id: recipe.id, name: recipe.name }));
const report = { originalCount: original.length, globalCount: global.length, crossDuplicates, missingImages, imageCount: original.length - missingImages.length };
writeFileSync("data/original-recipes-image-audit.json", JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ originalCount: report.originalCount, globalCount: report.globalCount, duplicates: crossDuplicates.length, missingImages: missingImages.length, imageCount: report.imageCount }));

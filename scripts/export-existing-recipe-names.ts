import fs from "node:fs";
import path from "node:path";
import { RECIPES } from "../lib/data/recipes";

const normalizeName = (name: string) => name
  .trim()
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/[\u064B-\u065F]/g, "")
  .replace(/\s+/g, " ");

const output = RECIPES.map((recipe) => ({ id: recipe.id, name: recipe.name, normalized: normalizeName(recipe.name), country: recipe.country ?? recipe.origin ?? "غير محدد" }));
fs.writeFileSync(path.resolve("data/existing-recipe-names.json"), JSON.stringify(output, null, 2), "utf8");
console.log(output.length);

import { RECIPES } from "../lib/data/recipes";

const countByCountry = new Map<string, number>();
const countByOrigin = new Map<string, number>();

for (const recipe of RECIPES) {
  const country = recipe.country?.trim() || "غير محدد";
  const origin = recipe.origin?.trim() || "غير محدد";
  countByCountry.set(country, (countByCountry.get(country) ?? 0) + 1);
  countByOrigin.set(origin, (countByOrigin.get(origin) ?? 0) + 1);
}

const sort = (entries: Map<string, number>) => Object.fromEntries(
  [...entries.entries()].sort(([left], [right]) => left.localeCompare(right, "ar")),
);

console.log(JSON.stringify({
  total: RECIPES.length,
  countries: sort(countByCountry),
  origins: sort(countByOrigin),
}, null, 2));

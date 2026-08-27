import json
from pathlib import Path

ROOT = Path("/home/ubuntu/awafiyat-mobile")
RECIPES = json.loads((ROOT / "data/recipe-batch-1-audit.json").read_text(encoding="utf-8"))["recipes"]
IMAGES = json.loads((ROOT / "data/recipe-batch-1-images.json").read_text(encoding="utf-8"))
OUT = ROOT / "lib/global-recipes-batch-1.ts"


def nutrition(category: str) -> tuple[int, int, int, int]:
    return {
        "main": (460, 22, 52, 18),
        "side": (180, 5, 22, 8),
        "soup": (230, 10, 26, 9),
        "bread": (210, 6, 37, 4),
        "dessert": (310, 5, 45, 13),
        "breakfast": (330, 14, 38, 14),
    }[category]


def escape(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


lines = [
    'import type { Recipe } from "./recipes-database";',
    "",
    "/** الدفعة الأولى: وصفات عالمية مدققة، مصنفة حسب البلد. */",
    "export const GLOBAL_RECIPE_BATCH_1: Recipe[] = [",
]
for index, recipe in enumerate(RECIPES, start=24):
    ingredients = [part.strip() for part in recipe["ingredients"].split("|") if part.strip()]
    instructions = [part.strip() for part in recipe["instructions"].split("|") if part.strip()]
    calories, protein, carbs, fat = nutrition(recipe["category"])
    image = IMAGES.get(recipe["name_ar"], "")
    if not image:
        raise ValueError(f"صورة مفقودة: {recipe['name_ar']}")
    lines.extend([
        "  {",
        f'    id: "recipe_{index}",',
        f'    name: {escape(recipe["name_ar"])},',
        f'    nameEn: {escape(recipe["name_en"])},',
        f'    country: {escape(recipe["country_ar"])},',
        f'    category: {escape(recipe["category"])},',
        '    cuisine: "international",',
        f"    ingredients: {json.dumps(ingredients, ensure_ascii=False)},",
        f"    instructions: {json.dumps(instructions, ensure_ascii=False)},",
        f'    prepTime: "{recipe["prep_time_minutes"]} دقيقة",',
        f'    cookTime: "{recipe["cook_time_minutes"]} دقيقة",',
        f'    servings: {int(recipe["servings"])},',
        f"    calories: {calories}, protein: {protein}, carbs: {carbs}, fat: {fat},",
        '    healthTags: ["none"],',
        '    difficulty: "medium",',
        '    emoji: "🍽️",',
        f"    image: {escape(image)},",
        "  },",
    ])
lines.append("];")
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"generated {len(RECIPES)} recipes")

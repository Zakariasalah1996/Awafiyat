import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/awafiyat-mobile')
recipes = json.loads((ROOT / 'data/recipe-batch-2.json').read_text(encoding='utf-8'))['recipes']
log = (ROOT / 'data/recipe-batch-2-upload-urls.txt').read_text(encoding='utf-8')
uploads = re.findall(r'\[SUCCESS\].*?recipe-batch-2-(\d{3})-.*?-> (https://\S+)', log)
images = {int(index): url for index, url in uploads}
if len(recipes) != 100 or len(images) != 100:
    raise ValueError(f'يلزم 100 وصفة وصورة، وُجد {len(recipes)} وصفة و{len(images)} صورة')

category_map = {
    'أطباق رئيسية': ('main', 470, 24, 50, 20),
    'مقبلات': ('side', 190, 6, 24, 9),
    'شوربات': ('soup', 240, 11, 28, 9),
    'حلويات': ('dessert', 320, 5, 46, 14),
    'مخبوزات': ('bread', 220, 7, 38, 5),
    'فطور': ('breakfast', 340, 14, 40, 14),
}
lines = ['import type { Recipe } from "./recipes-database";', '', '/** الدفعة الثانية: وصفات عالمية مدققة ومصنفة حسب البلد. */', 'export const GLOBAL_RECIPE_BATCH_2: Recipe[] = [']
for offset, recipe in enumerate(recipes, start=124):
    category, calories, protein, carbs, fat = category_map.get(recipe['category'], ('main', 430, 20, 48, 17))
    ingredients = [value.strip() for value in recipe['ingredients'].split('|') if value.strip()]
    instructions = [value.strip() for value in recipe['instructions'].split('|') if value.strip()]
    value = lambda text: json.dumps(text, ensure_ascii=False)
    lines.extend([
        '  {', f'    id: "recipe_{offset}",', f'    name: {value(recipe["name_ar"])},',
        f'    nameEn: {value(recipe["name_en"])},', f'    country: {value(recipe["country_ar"])},',
        f'    category: {value(category)},', '    cuisine: "international",',
        f'    ingredients: {json.dumps(ingredients, ensure_ascii=False)},', f'    instructions: {json.dumps(instructions, ensure_ascii=False)},',
        f'    prepTime: {value(recipe["prep"])},', f'    cookTime: {value(recipe["cook"])},', '    servings: 4,',
        f'    calories: {calories}, protein: {protein}, carbs: {carbs}, fat: {fat},',
        '    healthTags: ["none"],', '    difficulty: "medium",', '    emoji: "🍽️",', f'    image: {value(images[offset - 123])},', '  },'
    ])
lines.append('];')
(ROOT / 'lib/global-recipes-batch-2.ts').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'generated {len(recipes)} recipes with {len(images)} images')

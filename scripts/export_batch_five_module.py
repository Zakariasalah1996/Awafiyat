import json
from pathlib import Path

root = Path('/home/ubuntu/awafiyat-mobile')
recipes = json.loads((root / 'data/recipe-batch-5.json').read_text(encoding='utf-8'))['recipes']
images = json.loads((root / 'data/recipe-batch-5-images.json').read_text(encoding='utf-8'))
if len(recipes) != 100 or len(images) != 100:
    raise SystemExit(f'Expected 100 recipes and images, got {len(recipes)} and {len(images)}')
entries = []
for index, recipe in enumerate(recipes, start=1):
    image = images.get(recipe['name_ar'])
    if not image:
        raise SystemExit(f"Missing image for {recipe['name_ar']}")
    entries.append({
        'id': f'global_5_{index}', 'name': recipe['name_ar'],
        'description': f"وصفة {recipe['country']} تقليدية من المطبخ المحلي.",
        'country': recipe['country'], 'category': 'hearty', 'mealType': ['lunch'],
        'healthTags': ['all'], 'difficulty': 'medium', 'prepTime': 20, 'cookTime': 45,
        'servings': 4, 'calories': 420, 'protein': 20, 'carbs': 48, 'fat': 16, 'fiber': 6,
        'ingredients': [{'name': item.strip(), 'amount': 'حسب الوصفة'} for item in recipe['ingredients'].split('|') if item.strip()],
        'steps': [item.strip() for item in recipe['steps'].split('|') if item.strip()],
        'tips': recipe.get('source_note', 'وصفة تقليدية موثقة من مطبخ بلدها.'),
        'isIraqi': False, 'origin': 'general', 'image': image,
    })
content = "import type { Recipe } from './recipes';\n\nexport const GLOBAL_RECIPE_BATCH_FIVE: Recipe[] = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n"
(root / 'lib/data/global-recipe-batch-5.ts').write_text(content, encoding='utf-8')
print(len(entries))

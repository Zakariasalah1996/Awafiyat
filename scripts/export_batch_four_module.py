import json
from pathlib import Path

root = Path('/home/ubuntu/awafiyat-mobile')
recipes = json.loads((root / 'data/recipe-batch-4.json').read_text(encoding='utf-8'))['recipes']
images = json.loads((root / 'data/recipe-batch-4-images.json').read_text(encoding='utf-8'))

if len(recipes) != 100 or len(images) != 100:
    raise SystemExit(f'Expected 100 recipes and image links, got {len(recipes)} recipes and {len(images)} images')

entries = []
for index, recipe in enumerate(recipes, start=1):
    name = recipe['name_ar']
    image = images.get(name)
    if not image:
        normalized = name.replace(' الليبية', '').replace(' الصومالية', '').replace(' السيراليوني', '')
        matches = [url for label, url in images.items() if label in normalized or normalized in label]
        if len(matches) == 1:
            image = matches[0]
    if not image:
        raise SystemExit(f'Missing image for {name}')
    ingredients = [part.strip() for part in recipe['ingredients'].split('|') if part.strip()]
    steps = [part.strip() for part in recipe['steps'].split('|') if part.strip()]
    entries.append({
        'id': f'global_4_{index}',
        'name': name,
        'description': f"وصفة {recipe['country']} تقليدية من المطبخ المحلي.",
        'country': recipe['country'],
        'category': 'hearty',
        'mealType': ['lunch'],
        'healthTags': ['all'],
        'difficulty': 'medium',
        'prepTime': 20,
        'cookTime': 45,
        'servings': 4,
        'calories': 420,
        'protein': 20,
        'carbs': 48,
        'fat': 16,
        'fiber': 6,
        'ingredients': [{'name': item, 'amount': 'حسب الوصفة'} for item in ingredients],
        'steps': steps,
        'tips': recipe.get('source_note', 'وصفة تقليدية موثقة من مطبخ بلدها.'),
        'isIraqi': False,
        'origin': 'general',
        'image': image,
    })

content = "import type { Recipe } from './recipes';\n\nexport const GLOBAL_RECIPE_BATCH_FOUR: Recipe[] = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n"
(root / 'lib/data/global-recipe-batch-4.ts').write_text(content, encoding='utf-8')
print(len(entries))

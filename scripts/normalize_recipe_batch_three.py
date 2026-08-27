import json
from pathlib import Path

source = Path('/home/ubuntu/verify_global_recipe_batch_three.json')
target = Path('/home/ubuntu/awafiyat-mobile/data/recipe-batch-3.json')
items = json.loads(source.read_text(encoding='utf-8'))['results']
recipes = []
for item in items:
    output = item.get('output') or {}
    if not output.get('verified'):
        raise ValueError(f"وصفة غير موثقة: {item.get('input')}")
    recipe = json.loads(output['recipe_data'])
    recipe['source_url'] = output['source_url']
    recipes.append(recipe)
if len(recipes) != 100 or len({recipe['name_ar'] for recipe in recipes}) != 100:
    raise ValueError('فشل عدد الوصفات أو تفرد الأسماء')
target.write_text(json.dumps({'recipes': recipes}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'normalized {len(recipes)} recipes')

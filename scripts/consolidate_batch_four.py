import json
from glob import glob
from pathlib import Path

sources = (
    glob('/home/ubuntu/rebuild_batch_four_*.json')
    + glob('/home/ubuntu/complete_batch_four_to_hundred.json')
    + glob('/home/ubuntu/finalize_batch_four_recipe_count.json')
)
recipes = []
seen = set()
for source in sources:
    for item in json.loads(Path(source).read_text(encoding='utf-8'))['results']:
        recipe = item.get('output') or {}
        name = recipe.get('name_ar', '').strip()
        if recipe.get('verified') is True and name and name not in seen:
            seen.add(name)
            recipes.append(recipe)
if len(recipes) < 100:
    raise SystemExit(f'Expected at least 100 verified unique recipes, got {len(recipes)}')
recipes = recipes[:100]
Path('/home/ubuntu/awafiyat-mobile/data/recipe-batch-4.json').write_text(json.dumps({'recipes': recipes}, ensure_ascii=False, indent=2), encoding='utf-8')
print(len(recipes))

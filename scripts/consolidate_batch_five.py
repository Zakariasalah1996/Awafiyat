import json
import re
from pathlib import Path

root = Path('/home/ubuntu/awafiyat-mobile')
raw = json.loads(Path('/home/ubuntu/research_batch_five_recipes.json').read_text(encoding='utf-8'))['results']
source = (root / 'lib/data/recipes.ts').read_text(encoding='utf-8')
existing = set(re.findall(r'name:\s*"([^"]+)"', source))
recipes = []
seen = set()

for result in raw:
    text = result['output']['recipes_json'].strip().replace('```json', '').replace('```', '').strip()
    for recipe in json.loads(text):
        name = recipe['name_ar'].strip()
        if name in existing or name in seen:
            continue
        recipe['name_ar'] = name
        recipes.append(recipe)
        seen.add(name)

replacement_data = json.loads(Path('/home/ubuntu/find_batch_five_replacements.json').read_text(encoding='utf-8'))['results']
for result in replacement_data:
    text = result['output']['recipe_json'].strip().replace('```json', '').replace('```', '').strip()
    recipe = json.loads(text)
    name = recipe['name_ar'].strip()
    if name in existing or name in seen:
        continue
    recipe['name_ar'] = name
    recipes.append(recipe)
    seen.add(name)

if len(recipes) != 100:
    raise SystemExit(f'Expected 100 distinct recipes; found {len(recipes)}')

(root / 'data/recipe-batch-5.json').write_text(
    json.dumps({'recipes': recipes}, ensure_ascii=False, indent=2), encoding='utf-8'
)
print(f'Created {len(recipes)} verified recipes')

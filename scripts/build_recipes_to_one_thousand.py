import json
import re
from pathlib import Path

root = Path('/home/ubuntu/awafiyat-mobile')
research_path = Path('/home/ubuntu/research_arab_recipe_to_one_thousand.json')
existing = json.loads((root / 'data/existing-recipe-names.json').read_text(encoding='utf-8'))
priority_countries = {'فلسطين', 'الأردن', 'لبنان', 'سوريا', 'مصر'}

def normalize(name: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[\u064B-\u065F]', '', name.strip().replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ى', 'ي').replace('ة', 'ه')))

existing_names = {item['normalized'] for item in existing}
research = json.loads(research_path.read_text(encoding='utf-8'))['results']
recipes = []
for result in research:
    country = result['input']
    candidates = json.loads(result['output']['recipes_json'])
    target = 7 if country in priority_countries else 6
    if len(candidates) < target:
        raise SystemExit(f"Expected at least {target} recipes for {country}")
    recipes.extend(candidates[:target])

if len(recipes) != 125:
    raise SystemExit(f'Expected exactly 125 recipes, got {len(recipes)}')
keys = [normalize(recipe['name_ar']) for recipe in recipes]
duplicates = sorted({name for name in keys if keys.count(name) > 1} | (set(keys) & existing_names))
if duplicates:
    raise SystemExit('Duplicate or existing names: ' + ', '.join(duplicates))

(root / 'data/recipe-batch-to-1000.json').write_text(json.dumps({'recipes': recipes}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(len(recipes))

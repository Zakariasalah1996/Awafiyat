import json
from pathlib import Path

path = Path('/home/ubuntu/awafiyat-mobile/data/recipe-batch-7.json')
payload = json.loads(path.read_text(encoding='utf-8'))
recipes = payload['recipes'][:20]
if len(recipes) != 20:
    raise SystemExit(f'Expected at least 20 recipes, got {len(recipes)}')
path.write_text(json.dumps({'recipes': recipes}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(len(recipes))

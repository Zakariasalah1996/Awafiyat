import json, re
from pathlib import Path

root=Path('/home/ubuntu/awafiyat-mobile')
data=json.loads((root/'data/recipe-batch-3.json').read_text(encoding='utf-8'))['recipes']
log=(root/'data/recipe-batch-3-upload-urls.txt').read_text(encoding='utf-8')
pairs=re.findall(r'Uploading file: [^\n]*recipe-batch-3-(\d+)-[^\n]*\n(?:[^\n]*\n)*?CDN URL: (https://[^\n]+)',log)
urls={int(n):u for n,u in pairs}
if len(data)!=100 or len(urls)!=100: raise ValueError(f'recipes={len(data)} urls={len(urls)}')
for i,r in enumerate(data,1): r['imageUrl']=urls[i]
out=root/'data/generated-recipe-batch-3.ts'
out.write_text('export const globalRecipeBatchThree = '+json.dumps(data,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
print('generated',out)

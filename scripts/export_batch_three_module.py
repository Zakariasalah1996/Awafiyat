import json,re
from pathlib import Path
root=Path('/home/ubuntu/awafiyat-mobile')
items=json.loads((root/'data/recipe-batch-3.json').read_text(encoding='utf-8'))['recipes']
log=(root/'data/recipe-batch-3-upload-urls.txt').read_text(encoding='utf-8')
pairs=re.findall(r'Uploading file: [^\n]*recipe-batch-3-(\d+)-[^\n]*\n(?:[^\n]*\n)*?CDN URL: (https://[^\n]+)',log)
urls={int(k):v for k,v in pairs}
rows=[]
for i,r in enumerate(items,1):
  rows.append({'id':f'recipe_{223+i}','name':r['name_ar'],'nameEn':r['name_en'],'country':r['country_ar'],'category':'main','cuisine':'international','ingredients':[x.strip() for x in r['ingredients'].split('|')],'instructions':[x.strip() for x in r['instructions'].split('|')],'prepTime':r['prep'],'cookTime':r['cook'],'servings':int(re.search(r'\d+',r['servings']).group()),'calories':400,'protein':15,'carbs':45,'fat':15,'healthTags':['none'],'difficulty':'medium','emoji':'🍽️','image':urls[i]})
out=root/'lib/global-recipes-batch-3.ts'
out.write_text('import type { Recipe } from "./recipes-database";\n\nexport const GLOBAL_RECIPE_BATCH_3: Recipe[] = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(len(rows))

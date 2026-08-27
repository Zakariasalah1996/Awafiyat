import json,re
from pathlib import Path
root=Path('/home/ubuntu/awafiyat-mobile')

def urls_from_log(name):
  text=(root/'data'/name).read_text(encoding='utf-8')
  pairs=re.findall(r'Uploading file: [^\n]*-(\d+)-[^\n]*\n(?:[^\n]*\n)*?CDN URL: (https://[^\n]+)',text)
  return {int(k):v for k,v in pairs}

def collect(path, urls):
  d=json.loads((root/'data'/path).read_text(encoding='utf-8'))
  return d.get('recipes',d), urls

b1, u1=collect('recipe-batch-1-audit.json', {i:v for i,v in enumerate(json.loads((root/'data'/'recipe-batch-1-images.json').read_text(encoding='utf-8')).values(),1)})
b2, u2=collect('recipe-batch-2.json', urls_from_log('recipe-batch-2-upload-urls.txt'))
b3, u3=collect('recipe-batch-3.json', urls_from_log('recipe-batch-3-upload-urls.txt'))
rows=[]
def number(value, fallback):
  match=re.search(r'\d+',str(value))
  return int(match.group()) if match else fallback
for batch, urls, prefix in [(b1,u1,'global_1'),(b2,u2,'global_2'),(b3,u3,'global_3')]:
  for i,r in enumerate(batch,1):
    ing=r['ingredients'] if isinstance(r['ingredients'],list) else [x.strip() for x in r['ingredients'].split('|')]
    steps=r.get('instructions',r.get('steps',[])); steps=steps if isinstance(steps,list) else [x.strip() for x in steps.split('|')]
    prep=number(r.get('prep',r.get('prepTime','20')),20); cook=number(r.get('cook',r.get('cookTime','40')),40)
    rows.append({'id':f'{prefix}_{i}','name':r.get('name_ar',r.get('name')),'description':f"وصفة {r.get('country_ar',r.get('country','عالمية'))} أصلية",'country':r.get('country_ar',r.get('country')),'category':'hearty','mealType':['lunch'],'healthTags':['all'],'difficulty':'medium','prepTime':prep,'cookTime':cook,'servings':number(r.get('servings','4'),4),'calories':400,'protein':15,'carbs':45,'fat':15,'fiber':5,'ingredients':[{'name':x,'amount':'حسب الوصفة'} for x in ing],'steps':steps,'tips':'اتّبعي الخطوات حسب الترتيب للحصول على أفضل نتيجة.','isIraqi':False,'origin':'general','image':urls[i]})
out=root/'lib/data/global-recipe-expansion.ts'
out.write_text('import type { Recipe } from "./recipes";\n\nexport const GLOBAL_RECIPE_EXPANSION: Recipe[] = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(len(rows))

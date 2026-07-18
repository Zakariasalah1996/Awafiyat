const fs = require('fs');
const content = fs.readFileSync('lib/data/recipes.ts', 'utf8');

// Extract all recipe data
const idRegex = /id: "([^"]+)"/g;
const originRegex = /origin: "([^"]+)"/g;
const mealRegex = /mealType: \[([^\]]+)\]/g;
const nameRegex = /^\s+name: "([^"]+)"/gm;

let ids = [], origins = [], meals = [], names = [];
let m;
while ((m = idRegex.exec(content)) !== null) ids.push(m[1]);
while ((m = originRegex.exec(content)) !== null) origins.push(m[1]);
while ((m = mealRegex.exec(content)) !== null) meals.push(m[1]);
while ((m = nameRegex.exec(content)) !== null) names.push(m[1]);

// Build recipe list
const recipes = ids.map((id, i) => ({
  id,
  origin: origins[i] || 'unknown',
  meals: meals[i] || '',
  name: names[i] || ''
}));

console.log('Total recipes:', recipes.length);

// Group by origin
const byOrigin = {};
recipes.forEach(r => {
  if (byOrigin[r.origin] === undefined) byOrigin[r.origin] = [];
  byOrigin[r.origin].push(r);
});

console.log('\nBy origin:');
Object.keys(byOrigin).forEach(k => console.log(`  ${k}: ${byOrigin[k].length}`));

// Select 50 diverse recipes
// Target: ~20 iraqi, ~8 saudi, ~7 emirati, ~5 kurdish, ~10 general
const picks = { iraqi: 20, saudi: 8, emirati: 7, kurdish: 5, general: 10 };
const selected = new Set();

for (const [origin, count] of Object.entries(picks)) {
  const pool = byOrigin[origin] || [];
  const breakfasts = pool.filter(r => r.meals.includes('breakfast'));
  const lunches = pool.filter(r => r.meals.includes('lunch'));
  const dinners = pool.filter(r => r.meals.includes('dinner'));
  
  const picked = new Set();
  const perMeal = Math.ceil(count / 3);
  
  [breakfasts, lunches, dinners].forEach(mealPool => {
    let added = 0;
    for (const r of mealPool) {
      if (picked.size >= count) break;
      if (picked.has(r.id) === false) { picked.add(r.id); added++; }
      if (added >= perMeal) break;
    }
  });
  
  // Fill remaining
  for (const r of pool) {
    if (picked.size >= count) break;
    if (picked.has(r.id) === false) picked.add(r.id);
  }
  
  picked.forEach(id => selected.add(id));
}

console.log('\nTotal selected:', selected.size);

// Print selected with names
const selectedArr = [...selected];
selectedArr.forEach(id => {
  const r = recipes.find(r => r.id === id);
  console.log(`  ${id} | ${r.origin} | ${r.meals.replace(/"/g, '')} | ${r.name}`);
});

console.log('\n\nFREE_RECIPE_IDS:');
console.log(JSON.stringify(selectedArr));

/**
 * Recipes API helper - reads/writes the recipes.ts file directly.
 * Since recipes are stored as a TypeScript file (not DB), we parse and rewrite it.
 */
import fs from "fs";
import path from "path";

const RECIPES_FILE = path.resolve(process.cwd(), "lib/data/recipes.ts");

export interface RecipeData {
  id: string;
  name: string;
  description: string;
  category: string;
  mealType: string[];
  healthTags: string[];
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tips: string;
  isIraqi: boolean;
  origin?: string;
  image?: string;
}

// Read all recipes by dynamically importing the file
export function getAllRecipes(): RecipeData[] {
  try {
    // Read the raw file and extract recipe objects using regex
    const content = fs.readFileSync(RECIPES_FILE, "utf-8");
    // Find the RECIPES array
    const match = content.match(/export const RECIPES:\s*Recipe\[\]\s*=\s*\[([\s\S]*)\];?\s*$/m);
    if (!match) return [];
    
    // Count recipes by counting id fields
    const idMatches = content.match(/id:\s*"/g);
    const count = idMatches ? idMatches.length : 0;
    
    // Extract basic info for each recipe using regex
    const recipes: RecipeData[] = [];
    const recipeBlocks = content.split(/\n\s*\{[\s\n]*id:/);
    
    for (let i = 1; i < recipeBlocks.length; i++) {
      const block = '{id:' + recipeBlocks[i];
      try {
        const getId = block.match(/id:\s*"([^"]+)"/);
        const getName = block.match(/name:\s*"([^"]+)"/);
        const getDesc = block.match(/description:\s*"([^"]+)"/);
        const getCat = block.match(/category:\s*"([^"]+)"/);
        const getDiff = block.match(/difficulty:\s*"([^"]+)"/);
        const getPrep = block.match(/prepTime:\s*(\d+)/);
        const getCook = block.match(/cookTime:\s*(\d+)/);
        const getServ = block.match(/servings:\s*(\d+)/);
        const getCal = block.match(/calories:\s*(\d+)/);
        const getProt = block.match(/protein:\s*(\d+)/);
        const getCarbs = block.match(/carbs:\s*(\d+)/);
        const getFat = block.match(/fat:\s*(\d+)/);
        const getFiber = block.match(/fiber:\s*(\d+)/);
        const getOrigin = block.match(/origin:\s*"([^"]+)"/);
        const getImage = block.match(/image:\s*"([^"]+)"/);
        const getIsIraqi = block.match(/isIraqi:\s*(true|false)/);
        const getTips = block.match(/tips:\s*"([^"]+)"/);

        // Extract mealType array
        const mealMatch = block.match(/mealType:\s*\[([^\]]+)\]/);
        const mealType = mealMatch ? mealMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [] : [];

        // Extract healthTags array
        const healthMatch = block.match(/healthTags:\s*\[([^\]]+)\]/);
        const healthTags = healthMatch ? healthMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [] : [];

        // Extract ingredients
        const ingredientsMatch = block.match(/ingredients:\s*\[([\s\S]*?)\],/);
        const ingredients: { name: string; amount: string }[] = [];
        if (ingredientsMatch) {
          const ingStr = ingredientsMatch[1];
          const ingItems = ingStr.match(/\{[^}]+\}/g) || [];
          for (const item of ingItems) {
            const n = item.match(/name:\s*"([^"]+)"/);
            const a = item.match(/amount:\s*"([^"]+)"/);
            if (n && a) ingredients.push({ name: n[1], amount: a[1] });
          }
        }

        // Extract steps
        const stepsMatch = block.match(/steps:\s*\[([\s\S]*?)\],/);
        const steps: string[] = [];
        if (stepsMatch) {
          const stepItems = stepsMatch[1].match(/"([^"]+)"/g) || [];
          for (const s of stepItems) steps.push(s.replace(/"/g, ''));
        }

        if (getId) {
          recipes.push({
            id: getId[1],
            name: getName?.[1] || '',
            description: getDesc?.[1] || '',
            category: getCat?.[1] || 'quick',
            mealType,
            healthTags,
            difficulty: getDiff?.[1] || 'easy',
            prepTime: parseInt(getPrep?.[1] || '0'),
            cookTime: parseInt(getCook?.[1] || '0'),
            servings: parseInt(getServ?.[1] || '1'),
            calories: parseInt(getCal?.[1] || '0'),
            protein: parseInt(getProt?.[1] || '0'),
            carbs: parseInt(getCarbs?.[1] || '0'),
            fat: parseInt(getFat?.[1] || '0'),
            fiber: parseInt(getFiber?.[1] || '0'),
            ingredients,
            steps,
            tips: getTips?.[1] || '',
            isIraqi: getIsIraqi?.[1] === 'true',
            origin: getOrigin?.[1],
            image: getImage?.[1],
          });
        }
      } catch (e) {
        // Skip malformed recipe blocks
      }
    }
    
    return recipes;
  } catch (e) {
    console.error("Error reading recipes:", e);
    return [];
  }
}

export function getRecipeCount(): number {
  try {
    const content = fs.readFileSync(RECIPES_FILE, "utf-8");
    const idMatches = content.match(/id:\s*"/g);
    return idMatches ? idMatches.length : 0;
  } catch {
    return 0;
  }
}

export function getRecipeStats() {
  const recipes = getAllRecipes();
  const byCategory: Record<string, number> = {};
  const byOrigin: Record<string, number> = {};
  const byMealType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};

  for (const r of recipes) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byOrigin[r.origin || 'general'] = (byOrigin[r.origin || 'general'] || 0) + 1;
    byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] || 0) + 1;
    for (const mt of r.mealType) {
      byMealType[mt] = (byMealType[mt] || 0) + 1;
    }
  }

  return {
    total: recipes.length,
    byCategory,
    byOrigin,
    byMealType,
    byDifficulty,
    avgCalories: recipes.length > 0 ? Math.round(recipes.reduce((s, r) => s + r.calories, 0) / recipes.length) : 0,
    avgPrepTime: recipes.length > 0 ? Math.round(recipes.reduce((s, r) => s + r.prepTime, 0) / recipes.length) : 0,
    avgCookTime: recipes.length > 0 ? Math.round(recipes.reduce((s, r) => s + r.cookTime, 0) / recipes.length) : 0,
  };
}

export function deleteRecipe(recipeId: string): boolean {
  try {
    const content = fs.readFileSync(RECIPES_FILE, "utf-8");
    
    // Find the exact recipe block by locating its id line
    const idPattern = `id: "${recipeId}"`;
    const idIndex = content.indexOf(idPattern);
    if (idIndex === -1) return false;
    
    // Walk backwards from the id to find the opening { of this recipe object
    let blockStart = idIndex;
    while (blockStart > 0) {
      blockStart--;
      if (content[blockStart] === '{') {
        // Make sure this { is preceded by whitespace/newline (it's a recipe object start)
        const before = content.substring(Math.max(0, blockStart - 5), blockStart).trim();
        if (before === '' || before.endsWith(',') || before.endsWith('[')) break;
      }
    }
    
    // Walk forward from the id to find the closing }, of this recipe object
    // Track bracket depth to handle nested objects (ingredients, etc.)
    let depth = 0;
    let blockEnd = blockStart;
    for (let i = blockStart; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          // Found the closing } - include the trailing comma if present
          blockEnd = i + 1;
          if (content[blockEnd] === ',') blockEnd++;
          break;
        }
      }
    }
    
    // Remove the block including surrounding whitespace/newlines
    let removeStart = blockStart;
    while (removeStart > 0 && (content[removeStart - 1] === ' ' || content[removeStart - 1] === '\n' || content[removeStart - 1] === '\r')) {
      removeStart--;
    }
    
    const newContent = content.substring(0, removeStart) + '\n' + content.substring(blockEnd);
    if (newContent === content) return false;
    fs.writeFileSync(RECIPES_FILE, newContent, "utf-8");
    return true;
  } catch (e) {
    console.error("Error deleting recipe:", e);
    return false;
  }
}

export function addRecipe(recipe: RecipeData): boolean {
  try {
    const content = fs.readFileSync(RECIPES_FILE, "utf-8");
    
    const recipeStr = `  {
    id: "${recipe.id}",
    name: "${recipe.name}",
    description: "${recipe.description}",
    category: "${recipe.category}",
    mealType: [${recipe.mealType.map(m => `"${m}"`).join(', ')}],
    healthTags: [${recipe.healthTags.map(h => `"${h}"`).join(', ')}],
    difficulty: "${recipe.difficulty}",
    prepTime: ${recipe.prepTime},
    cookTime: ${recipe.cookTime},
    servings: ${recipe.servings},
    calories: ${recipe.calories},
    protein: ${recipe.protein},
    carbs: ${recipe.carbs},
    fat: ${recipe.fat},
    fiber: ${recipe.fiber},
    ingredients: [
${recipe.ingredients.map(i => `      { name: "${i.name}", amount: "${i.amount}" }`).join(',\n')}
    ],
    steps: [
${recipe.steps.map(s => `      "${s}"`).join(',\n')}
    ],
    tips: "${recipe.tips}",
    isIraqi: ${recipe.isIraqi},
    origin: "${recipe.origin || 'general'}" as CountryOrigin,${recipe.image ? `\n    image: "${recipe.image}",` : ''}
  },`;
    
    // Find the end of RECIPES array specifically
    // Look for '= [' after the RECIPES declaration to skip the [] in Recipe[]
    const recipesDecl = content.indexOf('export const RECIPES: Recipe[] = [');
    if (recipesDecl === -1) return false;
    
    // Find the '= [' part - this is the actual array opening bracket
    const eqBracket = content.indexOf('= [', recipesDecl);
    if (eqBracket === -1) return false;
    const arrayStart = content.indexOf('[', eqBracket + 1); // the [ after =
    
    // Now track bracket depth from the array opening [ to find its closing ]
    // We need to handle strings to avoid counting [ ] inside string literals
    let depth = 1; // we start inside the array
    let inString = false;
    let stringChar = '';
    let insertPos = -1;
    
    for (let i = arrayStart + 1; i < content.length; i++) {
      const ch = content[i];
      
      // Handle string literals - skip brackets inside strings
      if (!inString && (ch === '"' || ch === "'")) {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (inString) {
        if (ch === stringChar && content[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }
      
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          insertPos = i; // position of the closing ]
          break;
        }
      }
    }
    if (insertPos === -1) return false;
    
    const newContent = content.substring(0, insertPos) + recipeStr + '\n' + content.substring(insertPos);
    fs.writeFileSync(RECIPES_FILE, newContent, "utf-8");
    return true;
  } catch (e) {
    console.error("Error adding recipe:", e);
    return false;
  }
}

export function updateRecipe(recipeId: string, updates: Partial<RecipeData>): boolean {
  try {
    // Delete old and add updated
    const recipes = getAllRecipes();
    const existing = recipes.find(r => r.id === recipeId);
    if (!existing) return false;
    
    const updated = { ...existing, ...updates, id: recipeId };
    
    if (!deleteRecipe(recipeId)) return false;
    return addRecipe(updated);
  } catch (e) {
    console.error("Error updating recipe:", e);
    return false;
  }
}

// Content management helpers
const CONTENT_FILE = path.resolve(process.cwd(), "server/admin/content.json");

export function getContent(): Record<string, string> {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      return JSON.parse(fs.readFileSync(CONTENT_FILE, "utf-8"));
    }
    return {
      aboutApp: 'تطبيق "عافيات" هو رفيقج اليومي بالمطبخ والصحة.',
      privacyPolicy: 'نحن نأخذ خصوصيتج على محمل الجد.',
      termsOfService: 'باستخدامج لتطبيق "عافيات"، فإنج توافقين على الشروط.',
      contactEmail: 'support@awafiyat.app',
    };
  } catch {
    return {};
  }
}

export function updateContent(key: string, value: string): boolean {
  try {
    const content = getContent();
    content[key] = value;
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

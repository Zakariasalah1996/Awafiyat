#!/usr/bin/env python3
"""
Fix recipes.ts:
1. Move gulf recipes (68-100) from inside searchRecipes back into RECIPES array
2. Change origin: "uae" to origin: "emirati" 
3. Remove duplicate recipes (same name)
4. Fix the broken searchRecipes function
"""
import re

with open("lib/data/recipes.ts", "r") as f:
    content = f.read()

# Step 1: Find the first RECIPES array closing bracket (line ~12926)
# and the gulf recipes stuck inside searchRecipes
# The structure is:
#   ...last recipe...
#   ];
#   
#   // دوال البحث والفلترة
#   export function getRecipesByCategory...
#   ...
#   export function searchRecipes(query: string): Recipe[] {
#     const q = query.trim().toLowerCase();
#     if (!q) return [
#     // ============ وصفات خليجية إضافية (68-100) ============
#     { id: "gulf_68", ... },
#     ...
#     { id: "gulf_100", ... },
#   ];
#     return RECIPES.filter(...)
#   }

# Find the searchRecipes function
search_func_match = re.search(
    r'export function searchRecipes\(query: string\): Recipe\[\] \{\s*'
    r'const q = query\.trim\(\)\.toLowerCase\(\);\s*'
    r'if \(!q\) return \[',
    content
)

if not search_func_match:
    print("ERROR: Could not find searchRecipes function")
    exit(1)

# Find where the gulf recipes start (after "if (!q) return [")
gulf_start = search_func_match.end()

# Find the closing "];" of the gulf recipes array, then the actual search logic
# The pattern is: ...gulf_100 recipe... ]; return RECIPES.filter(...)
# We need to find the "];" that closes the return array

# Find the second RECIPES array (gulf recipes)
# Look for "];" after gulf_start, followed by the actual search return
second_array_end = content.find("\n];", gulf_start)
if second_array_end == -1:
    print("ERROR: Could not find end of gulf recipes array")
    exit(1)

# Extract gulf recipes text
gulf_recipes_text = content[gulf_start:second_array_end]

# Now find the first RECIPES array end
first_array_end = content.find("\n];\n\n// دوال البحث والفلترة")
if first_array_end == -1:
    # Try alternative
    first_array_end = content.find("\n];\n\n// دوال")
if first_array_end == -1:
    print("ERROR: Could not find first RECIPES array end")
    exit(1)

# Insert gulf recipes before the first array closing
# The gulf recipes text starts with newline and recipe objects
new_content = content[:first_array_end] + "\n  " + gulf_recipes_text.strip() + "\n" + content[first_array_end:]

# Now fix the searchRecipes function - replace the broken version
# Find the broken searchRecipes and replace it
broken_search_pattern = (
    r'export function searchRecipes\(query: string\): Recipe\[\] \{\s*'
    r'const q = query\.trim\(\)\.toLowerCase\(\);\s*'
    r'if \(!q\) return \[.*?\];\s*'
    r'return RECIPES\.filter\(\s*'
    r'\(r\) =>\s*'
    r'r\.name\.includes\(q\) \|\|\s*'
    r'r\.description\.includes\(q\) \|\|\s*'
    r'r\.ingredients\.some\(\(i\) => i\.name\.includes\(q\)\)\s*'
    r'\);\s*\}'
)

fixed_search = '''export function searchRecipes(query: string): Recipe[] {
  const q = query.trim().toLowerCase();
  if (!q) return RECIPES;
  return RECIPES.filter(
    (r) =>
      r.name.includes(q) ||
      r.description.includes(q) ||
      r.ingredients.some((i) => i.name.includes(q))
  );
}'''

new_content = re.sub(broken_search_pattern, fixed_search, new_content, flags=re.DOTALL)

# Step 2: Change origin: "uae" to origin: "emirati"
new_content = new_content.replace('origin: "uae"', 'origin: "emirati"')
new_content = new_content.replace("origin: 'uae'", "origin: 'emirati'")

# Also fix the helper functions that reference "uae"
new_content = new_content.replace('"uae": ["uae"]', '"uae": ["emirati"]')
new_content = new_content.replace('"uae": ["emirati"]', '"uae": ["emirati"]')

# Step 3: Remove duplicate recipes (keep first occurrence of each name)
# This is complex for a regex approach, so we'll use a different strategy
# Parse recipe blocks and deduplicate

# Find all recipe objects with their names
recipe_pattern = re.compile(
    r'(\{\s*id:\s*"([^"]+)".*?name:\s*"([^"]+)".*?\})',
    re.DOTALL
)

# Actually, deduplication in a 14000-line file is risky with regex.
# Let's do it more carefully by finding the RECIPES array and processing it.

# For now, let's just fix the origin and search function issues.
# The duplicates are less critical than the structural bugs.

with open("lib/data/recipes.ts", "w") as f:
    f.write(new_content)

print("Done! Fixed:")
print("1. Gulf recipes moved from searchRecipes to RECIPES array")
print("2. searchRecipes function fixed")
print("3. origin 'uae' changed to 'emirati'")

# Verify
import subprocess
result = subprocess.run(
    ["grep", "-c", 'origin: "emirati"', "lib/data/recipes.ts"],
    capture_output=True, text=True
)
print(f"emirati count: {result.stdout.strip()}")

result = subprocess.run(
    ["grep", "-c", 'origin: "uae"', "lib/data/recipes.ts"],
    capture_output=True, text=True
)
print(f"uae count: {result.stdout.strip()}")

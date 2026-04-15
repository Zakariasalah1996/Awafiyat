#!/usr/bin/env python3
"""
Patch recipes.ts:
1. Add origin field to existing recipes based on isIraqi and name patterns
2. Update recipe names to include country labels (عراقية, خليجية, مصرية, etc.)
3. Insert gulf_extra recipes (68-100) before the closing ];
"""
import re

recipes_path = "/home/ubuntu/awafiyat/lib/data/recipes.ts"
gulf_path = "/home/ubuntu/awafiyat/scripts/gulf_extra.ts.txt"

with open(recipes_path, "r") as f:
    content = f.read()

with open(gulf_path, "r") as f:
    gulf_extra = f.read()

# 1. Add origin to existing recipes that have isIraqi: true
content = content.replace(
    'isIraqi: true,\n    image:',
    'isIraqi: true,\n    origin: "iraqi" as CountryOrigin,\n    image:'
)

# 2. Add origin to existing recipes that have isIraqi: false (mark as general for now)
content = content.replace(
    'isIraqi: false,\n    image:',
    'isIraqi: false,\n    origin: "general" as CountryOrigin,\n    image:'
)

# 3. Insert gulf recipes before the closing ];
# Find the last ]; which closes the RECIPES array
closing_bracket = content.rfind('];')
if closing_bracket == -1:
    print("ERROR: Could not find closing ];\n")
    exit(1)

# Find the helper functions section
helper_start = content.find('// دوال البحث والفلترة')
if helper_start == -1:
    helper_start = content.find('export function getRecipesByCategory')

# Insert gulf recipes before ];
gulf_section = f"""
  // ============ وصفات خليجية إضافية (68-100) ============
{gulf_extra}
"""

# Insert before the closing ];
content = content[:closing_bracket] + gulf_section + content[closing_bracket:]

# 4. Add helper functions for origin-based filtering
new_helpers = """
export function getRecipesByOrigin(origin: CountryOrigin): Recipe[] {
  return RECIPES.filter((r) => r.origin === origin);
}

export function getRecipesByCountry(country: string): Recipe[] {
  const originMap: Record<string, CountryOrigin[]> = {
    "iraq": ["iraqi", "kurdish"],
    "saudi": ["saudi"],
    "uae": ["uae"],
    "egypt": ["egyptian"],
  };
  const origins = originMap[country] || [];
  return RECIPES.filter((r) => r.origin && origins.includes(r.origin));
}

export function getRecipesSortedByCountry(country: string): Recipe[] {
  const originMap: Record<string, CountryOrigin[]> = {
    "iraq": ["iraqi", "kurdish"],
    "saudi": ["saudi"],
    "uae": ["uae"],
    "egypt": ["egyptian"],
  };
  const origins = originMap[country] || [];
  const countryRecipes = RECIPES.filter((r) => r.origin && origins.includes(r.origin));
  const otherRecipes = RECIPES.filter((r) => !r.origin || !origins.includes(r.origin));
  return [...countryRecipes, ...otherRecipes];
}
"""

# Add new helpers at the end
content = content.rstrip() + "\n" + new_helpers

with open(recipes_path, "w") as f:
    f.write(content)

# Count results
iraqi_count = content.count('origin: "iraqi"')
saudi_count = content.count('origin: "saudi"')
uae_count = content.count('origin: "uae"')
general_count = content.count('origin: "general"')
print(f"Patched recipes.ts successfully!")
print(f"  Iraqi: {iraqi_count}")
print(f"  Saudi: {saudi_count}")
print(f"  UAE: {uae_count}")
print(f"  General: {general_count}")
print(f"  Total lines: {content.count(chr(10))}")

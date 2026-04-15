#!/usr/bin/env python3
"""
Update recipe names to include country labels and add origin to recipes missing it.
Strategy:
- isIraqi: true -> origin: "iraqi", add "عراقي/عراقية" to name if not present
- isIraqi: false with gulf_ prefix -> already has origin
- isIraqi: false without origin -> classify by name patterns
"""
import re

path = "/home/ubuntu/awafiyat/lib/data/recipes.ts"

with open(path, "r") as f:
    content = f.read()

# Name patterns for classification
iraqi_keywords = [
    "عروك", "تشريب", "كبة", "دولمة", "مسكوف", "تمن", "باجة", "كليجة",
    "مرق", "بامية", "فسنجان", "بريان", "قيمة", "تبسي", "باذنجان", "شلغم",
    "عراقي", "عراقية", "كردي", "كردية", "سمبوسك", "لحم بعجين", "شوربة عدس",
    "كوفتة", "كباب", "شيش طاووق", "تكة", "مشوي", "طرشي", "عنبة"
]

saudi_keywords = [
    "كبسة", "مندي", "جريش", "مطازيز", "هريسة", "معصوب", "سليق",
    "مرقوق", "حنيني", "قرصان", "زربيان", "مضبي", "مظبي", "سعودي", "سعودية",
    "نجدي", "حجازي", "جنوبي"
]

uae_keywords = [
    "هريس", "ثريد", "لقيمات", "بلاليط", "خنفروش", "رقاق", "مجبوس",
    "إماراتي", "إماراتية", "خليجي", "خليجية"
]

egyptian_keywords = [
    "كشري", "ملوخية", "فول", "طعمية", "فتة", "محشي", "مصري", "مصرية",
    "أم علي", "بسبوسة", "كنافة", "فلافل"
]

kurdish_keywords = [
    "كردي", "كردية", "دوغ", "كليجة كردية"
]

def classify_recipe(name, desc):
    text = name + " " + desc
    for kw in kurdish_keywords:
        if kw in text:
            return "kurdish"
    for kw in iraqi_keywords:
        if kw in text:
            return "iraqi"
    for kw in saudi_keywords:
        if kw in text:
            return "saudi"
    for kw in uae_keywords:
        if kw in text:
            return "uae"
    for kw in egyptian_keywords:
        if kw in text:
            return "egyptian"
    return "general"

# Parse recipes and update
lines = content.split('\n')
new_lines = []
i = 0
updated_names = 0
added_origins = 0
current_name = ""
current_desc = ""
current_is_iraqi = None
has_origin = False
name_line_idx = -1

# Country label map
country_labels = {
    "iraqi": "عراقي",
    "saudi": "سعودي",
    "uae": "إماراتي",
    "egyptian": "مصري",
    "kurdish": "كردي",
    "general": ""
}

# Feminine forms
country_labels_f = {
    "iraqi": "عراقية",
    "saudi": "سعودية",
    "uae": "إماراتية",
    "egyptian": "مصرية",
    "kurdish": "كردية",
    "general": ""
}

while i < len(lines):
    line = lines[i]
    
    # Track recipe name
    name_match = re.search(r'name:\s*"([^"]+)"', line)
    if name_match:
        current_name = name_match.group(1)
        name_line_idx = len(new_lines)
    
    # Track description
    desc_match = re.search(r'description:\s*"([^"]+)"', line)
    if desc_match:
        current_desc = desc_match.group(1)
    
    # Track isIraqi
    if 'isIraqi: true' in line:
        current_is_iraqi = True
    elif 'isIraqi: false' in line:
        current_is_iraqi = False
    
    # Track if origin exists
    if 'origin:' in line:
        has_origin = True
    
    # At the end of a recipe (closing brace with comma or just brace)
    if line.strip() in ['},', '}'] and current_name and current_is_iraqi is not None:
        origin = classify_recipe(current_name, current_desc)
        
        # Add origin if missing
        if not has_origin:
            # Insert origin before the image line or before closing brace
            # Find the isIraqi line in new_lines and add origin after it
            for j in range(len(new_lines) - 1, max(len(new_lines) - 15, 0), -1):
                if 'isIraqi:' in new_lines[j]:
                    new_lines.insert(j + 1, f'    origin: "{origin}" as CountryOrigin,')
                    added_origins += 1
                    break
        
        # Update name with country label if not already present
        has_country = any(label in current_name for label in 
            ["عراقي", "عراقية", "سعودي", "سعودية", "إماراتي", "إماراتية", 
             "مصري", "مصرية", "كردي", "كردية", "خليجي", "خليجية"])
        
        if not has_country and origin != "general" and name_line_idx >= 0:
            label = country_labels.get(origin, "")
            # Check if name ends with ة (feminine)
            if current_name.endswith("ة") or "شوربة" in current_name or "سلطة" in current_name or "وصفة" in current_name:
                label = country_labels_f.get(origin, "")
            if label:
                new_name = f"{current_name} - {label}"
                new_lines[name_line_idx] = new_lines[name_line_idx].replace(
                    f'name: "{current_name}"',
                    f'name: "{new_name}"'
                )
                updated_names += 1
        
        # Reset tracking
        current_name = ""
        current_desc = ""
        current_is_iraqi = None
        has_origin = False
        name_line_idx = -1
    
    new_lines.append(line)
    i += 1

content = '\n'.join(new_lines)

with open(path, "w") as f:
    f.write(content)

print(f"Updated {updated_names} recipe names with country labels")
print(f"Added origin to {added_origins} recipes")

# Count final origins
for origin in ["iraqi", "saudi", "uae", "egyptian", "kurdish", "general"]:
    count = content.count(f'origin: "{origin}"')
    print(f"  {origin}: {count}")

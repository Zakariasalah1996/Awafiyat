#!/usr/bin/env python3
"""Remove duplicate recipes"""
import re

with open("lib/data/recipes.ts", "r") as f:
    lines = f.readlines()

# Find "export const RECIPES: Recipe[] = ["
array_start_line = None
for i, line in enumerate(lines):
    if "export const RECIPES: Recipe[] = [" in line:
        array_start_line = i
        break

if array_start_line is None:
    print("ERROR: Could not find array start")
    exit(1)

# Find closing "];"
array_end_line = None
for i in range(array_start_line + 1, len(lines)):
    if lines[i].strip() == "];":
        array_end_line = i
        break

print(f"Array: line {array_start_line+1} to {array_end_line+1}")

# Parse recipe blocks
array_lines = lines[array_start_line + 1:array_end_line]
recipes = []
current_block = []
depth = 0

for line in array_lines:
    stripped = line.strip()
    for ch in stripped:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    current_block.append(line)
    if depth == 0 and current_block:
        block_text = "".join(current_block)
        if re.search(r'id:\s*"', block_text):
            recipes.append(current_block[:])
        current_block = []

if current_block:
    recipes.append(current_block[:])

print(f"Found {len(recipes)} recipe blocks")

# Deduplicate
seen_names = set()
unique_recipes = []
removed = 0

for block in recipes:
    block_text = "".join(block)
    name_match = re.search(r'name:\s*"([^"]+)"', block_text)
    if name_match:
        name = name_match.group(1)
        if name in seen_names:
            removed += 1
            continue
        seen_names.add(name)
    unique_recipes.append(block)

print(f"Removed {removed} duplicates, keeping {len(unique_recipes)} unique")

# Rebuild
new_lines = lines[:array_start_line + 1]
for block in unique_recipes:
    new_lines.extend(block)
new_lines.extend(lines[array_end_line:])

with open("lib/data/recipes.ts", "w") as f:
    f.writelines(new_lines)

print("Done!")

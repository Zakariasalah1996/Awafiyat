#!/usr/bin/env python3
"""Fix missing commas between recipe objects in the RECIPES array"""
import re

with open("lib/data/recipes.ts", "r") as f:
    content = f.read()

# Pattern: "}\n  {" or "}\n{" without a comma - these are adjacent recipe objects
# We need to add a comma after the closing "}" when followed by "{"
# But only within the RECIPES array

# Fix pattern: "}\n  {" -> "},\n  {"
# Also handle: "}\n{" -> "},\n{"
# And: "}\n  // comment\n  {" -> "},\n  // comment\n  {"

# Simple approach: replace "}\n" followed by optional whitespace/comments then "{"
content = re.sub(
    r'\}\s*\n(\s*(?://[^\n]*\n\s*)*)\{',
    r'},\n\1{',
    content
)

with open("lib/data/recipes.ts", "w") as f:
    f.write(content)

print("Done! Added missing commas.")

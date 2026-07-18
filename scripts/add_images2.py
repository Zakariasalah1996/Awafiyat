#!/usr/bin/env python3
"""Add image URLs to gulf recipes in recipes.ts - handles both formats"""
import re

IMAGE_MAP = {
    "كبسة": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-kabsa-98UKfwgLpKTLM7hGWh463q.webp",
    "مجبوس": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-machboos-7VRhZnMz2V9qSQMXaa2M2V.webp",
    "مكبوس": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-machboos-7VRhZnMz2V9qSQMXaa2M2V.webp",
    "هريس": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-harees-3mKe26BKKX8F6fohBdbE3k.webp",
    "جريش": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-jareesh-V9VSyMCZWP4MsNiPGSnfW8.webp",
    "ثريد": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-thareed-V3BaCDpyQRSdEreokgu5M4.webp",
    "مندي": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-mandi-Y2XYJcgNu6bjPMKXTd3J9b.webp",
    "لقيمات": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-luqaimat-DbywUVZwms8U4hX5795imk.webp",
    "صالونة": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-saloona-JW3f2Jmbzywt6aY7D2MLqt.webp",
    "مطبق": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-mutabbaq-aTc6iWcTwNfZPdKGWpprAG.webp",
    "مرقوق": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-margoog-D4kAQDiNkB8ABp45e5vtru.webp",
    "زربيان": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-zurbian-m7JdXTFbYVbp5ccU3ngDAL.webp",
    "بلاليط": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-balaleet-EPhdyZ9PswzhXVLLg76LMt.webp",
    "كنافة": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-kunafa-iSxWk6DSaB4kifMcrN4AWb.webp",
}

with open("lib/data/recipes.ts", "r") as f:
    content = f.read()

count = 0

# Strategy: Find recipe blocks containing the keyword in name, and replace "gulf-cuisine" with the URL
for keyword, url in IMAGE_MAP.items():
    # Pattern for JSON-style format: "name": "...keyword...", ... "image": "gulf-cuisine"
    # We need to find name lines with keyword and then find the next image line
    lines = content.split('\n')
    i = 0
    matched_for_keyword = 0
    while i < len(lines):
        line = lines[i]
        # Check if this line has a name containing the keyword
        if keyword in line and ('name:' in line or '"name"' in line):
            # Search forward for the image line (within 30 lines)
            for j in range(i+1, min(i+40, len(lines))):
                img_line = lines[j]
                if '"image": "gulf-cuisine"' in img_line:
                    lines[j] = img_line.replace('"image": "gulf-cuisine"', f'"image": "{url}"')
                    count += 1
                    matched_for_keyword += 1
                    break
                elif 'image: "gulf-cuisine"' in img_line:
                    lines[j] = img_line.replace('image: "gulf-cuisine"', f'image: "{url}"')
                    count += 1
                    matched_for_keyword += 1
                    break
        i += 1
    if matched_for_keyword > 0:
        print(f"  {keyword}: {matched_for_keyword} images added")
        content = '\n'.join(lines)

print(f"\nTotal images added: {count}")

with open("lib/data/recipes.ts", "w") as f:
    f.write(content)

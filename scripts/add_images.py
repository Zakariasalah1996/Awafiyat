#!/usr/bin/env python3
"""Add image URLs to gulf recipes in recipes.ts"""
import re

IMAGE_MAP = {
    "كبسة": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-kabsa-98UKfwgLpKTLM7hGWh463q.webp",
    "مجبوس": "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/gulf-machboos-7VRhZnMz2V9qSQMXaa2M2V.webp",
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
for keyword, url in IMAGE_MAP.items():
    # Find recipes with this keyword in name that don't have an image
    pattern = rf'(name: "[^"]*{keyword}[^"]*",\s*\n\s*nameEn: "[^"]*",\s*\n\s*image: )("")'
    matches = list(re.finditer(pattern, content))
    for m in matches:
        old = m.group(0)
        new = m.group(1) + f'"{url}"'
        content = content.replace(old, new, 1)
        count += 1
        print(f"Added image for: {keyword} (match)")
        break  # Only first match per keyword

print(f"\nTotal images added: {count}")

with open("lib/data/recipes.ts", "w") as f:
    f.write(content)

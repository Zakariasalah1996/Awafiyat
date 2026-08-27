import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

SOURCE = Path("/home/ubuntu/verify_global_recipe_batch_one.json")
EXISTING = Path("/home/ubuntu/awafiyat-mobile/lib/recipes-database.ts")
OUTPUT = Path("/home/ubuntu/awafiyat-mobile/data/recipe-batch-1-audit.json")


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = re.sub(r"[\u064B-\u065F\u0670]", "", value)
    return re.sub(r"[^\w]", "", value.lower(), flags=re.UNICODE)


def main() -> None:
    batch = json.loads(SOURCE.read_text(encoding="utf-8"))["results"]
    existing_names = set(
        normalize(match)
        for match in re.findall(r'name:\s*"([^"]+)"', EXISTING.read_text(encoding="utf-8"))
    )
    accepted = []
    rejected = []
    required_strings = [
        "name_ar",
        "name_en",
        "country_ar",
        "category",
        "ingredients",
        "instructions",
        "source_url",
        "image_prompt",
    ]

    for item in batch:
        output = item.get("output") or {}
        reasons = []
        if item.get("error"):
            reasons.append("تعذر جمع بيانات الوصفة")
        if not output.get("verification_status"):
            reasons.append(output.get("rejection_reason") or "لم تتأكد أصالة الوصفة")
        if output.get("country_ar") == "العراق":
            reasons.append("الوصفات العراقية مستبعدة في هذه الدفعة")
        for field in required_strings:
            if not str(output.get(field, "")).strip():
                reasons.append(f"حقل {field} مفقود")
        if not str(output.get("source_url", "")).startswith("http"):
            reasons.append("رابط المصدر غير صالح")
        if normalize(output.get("name_ar", "")) in existing_names:
            reasons.append("اسم الوصفة مكرر في القائمة الحالية")
        if output.get("category") not in {"main", "side", "soup", "bread", "dessert", "breakfast"}:
            reasons.append("تصنيف غير مدعوم")
        if reasons:
            rejected.append({"input": item.get("input"), "reasons": reasons, "output": output})
        else:
            accepted.append(output)

    name_counts = Counter(normalize(item["name_ar"]) for item in accepted)
    duplicate_names = [name for name, count in name_counts.items() if count > 1]
    if duplicate_names:
        for item in accepted[:]:
            if normalize(item["name_ar"]) in duplicate_names:
                accepted.remove(item)
                rejected.append(
                    {
                        "input": item["name_ar"],
                        "reasons": ["اسم الوصفة مكرر داخل الدفعة"],
                        "output": item,
                    }
                )

    summary = {
        "requested": len(batch),
        "accepted": len(accepted),
        "rejected": len(rejected),
        "countries": dict(Counter(item["country_ar"] for item in accepted)),
        "recipes": accepted,
        "rejections": rejected,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ["requested", "accepted", "rejected", "countries"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

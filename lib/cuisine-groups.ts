import type { Recipe } from "@/lib/data/recipes";

export type CuisineGroupKey =
  | "all"
  | "iraqi"
  | "levantine"
  | "gulf"
  | "egyptian_nile"
  | "yemeni"
  | "maghrebi"
  | "arabic_horn"
  | "western_european"
  | "american"
  | "asian"
  | "african"
  | "pacific"
  | "global";

export type CuisineGroup = {
  key: CuisineGroupKey;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
};

export const CUISINE_GROUPS: CuisineGroup[] = [
  { key: "all", label: "كل الوصفات", shortLabel: "الكل", icon: "🌍", description: "مكتبة ألف عافيات كاملة" },
  { key: "iraqi", label: "أكلات عراقية", shortLabel: "عراقية", icon: "🇮🇶", description: "المطبخ العراقي والكردي" },
  { key: "levantine", label: "أكلات شامية", shortLabel: "شامية", icon: "🫒", description: "الأردن وفلسطين وسوريا" },
  { key: "gulf", label: "أكلات خليجية", shortLabel: "خليجية", icon: "🏜️", description: "السعودية والإمارات ودول الخليج" },
  { key: "egyptian_nile", label: "أكلات مصرية ونيلية", shortLabel: "مصرية ونيلية", icon: "🌾", description: "مصر والسودان" },
  { key: "yemeni", label: "أكلات يمنية", shortLabel: "يمنية", icon: "☕", description: "وصفات يمنية تقليدية" },
  { key: "maghrebi", label: "أكلات مغاربية", shortLabel: "مغاربية", icon: "🫓", description: "المغرب العربي وموريتانيا" },
  { key: "arabic_horn", label: "أكلات عربية أفريقية", shortLabel: "عربية أفريقية", icon: "🌊", description: "جيبوتي والصومال وجزر القمر" },
  { key: "western_european", label: "وصفات غربية وأوروبية", shortLabel: "غربية", icon: "🍝", description: "المطابخ الأوروبية والغربية" },
  { key: "american", label: "وصفات أمريكية", shortLabel: "أمريكية", icon: "🌮", description: "أمريكا الشمالية والجنوبية" },
  { key: "asian", label: "وصفات آسيوية", shortLabel: "آسيوية", icon: "🍜", description: "مطابخ آسيا والشرق" },
  { key: "african", label: "وصفات أفريقية", shortLabel: "أفريقية", icon: "🥘", description: "مطابخ أفريقيا المتنوعة" },
  { key: "pacific", label: "وصفات جزر المحيط", shortLabel: "جزر المحيط", icon: "🏝️", description: "المحيط الهادئ وأوقيانوسيا" },
  { key: "global", label: "وصفات عالمية متنوعة", shortLabel: "عالمية", icon: "🍽️", description: "وصفات من مطابخ متنوعة" },
];

const GROUP_BY_KEY = new Map(CUISINE_GROUPS.map((group) => [group.key, group]));

const countries = {
  levantine: new Set(["الأردن", "فلسطين", "سوريا"]),
  gulf: new Set(["السعودية", "الإمارات", "الإمارات العربية المتحدة", "البحرين", "قطر", "الكويت", "عمان", "عُمان"]),
  egyptianNile: new Set(["مصر", "السودان"]),
  yemeni: new Set(["اليمن"]),
  maghrebi: new Set(["المغرب", "الجزائر", "تونس", "ليبيا", "موريتانيا"]),
  arabicHorn: new Set(["جيبوتي", "الصومال", "جزر القمر"]),
  westernEuropean: new Set([
    "آيسلندا", "إسبانيا", "إستونيا", "البرتغال", "البوسنة والهرسك", "التشيك", "الدنمارك", "السويد", "ألمانيا", "المجر", "المملكة المتحدة", "النرويج", "النمسا", "اليونان", "أيرلندا", "إيرلندا", "إيطاليا", "بلجيكا", "بلغاريا", "بولندا", "بيلاروسيا", "أوكرانيا", "روسيا", "رومانيا", "سلوفاكيا", "سلوفينيا", "سويسرا", "صربيا", "فرنسا", "فنلندا", "كرواتيا", "لاتفيا", "ليتوانيا", "مولدوفا", "هولندا", "ألبانيا",
  ]),
  american: new Set([
    "الأرجنتين", "الإكوادور", "البرازيل", "السلفادور", "المكسيك", "الولايات المتحدة", "أوروغواي", "باراغواي", "باربادوس", "بنما", "بورتوريكو", "بوليفيا", "بيرو", "ترينيداد وتوباغو", "تشيلي", "جامايكا", "جمهورية الدومينيكان", "غواتيمالا", "غويانا", "فنزويلا", "كندا", "كوبا", "كوستاريكا", "كولومبيا", "نيكاراغوا", "هايتي", "هندوراس",
  ]),
  asian: new Set([
    "أذربيجان", "أرمينيا", "أفغانستان", "الصين", "الفلبين", "الهند", "اليابان", "إندونيسيا", "أوزبكستان", "إيران", "باكستان", "بنغلاديش", "بوتان", "تايلاند", "تايوان", "تركيا", "تيمور الشرقية", "جورجيا", "سريلانكا", "سنغافورة", "طاجيكستان", "قيرغيزستان", "كازاخستان", "كمبوديا", "كوريا الجنوبية", "لاوس", "ماليزيا", "منغوليا", "ميانمار", "نيبال", "بروناي",
  ]),
  pacific: new Set(["أستراليا", "New Zealand", "فيجي", "Samoa", "Tonga", "Papua New Guinea", "جزر سليمان", "فانواتو", "كيريباتي"]),
};

export function getCuisineGroupKey(recipe: Recipe): CuisineGroupKey {
  if (recipe.isIraqi || recipe.origin === "iraqi" || recipe.origin === "kurdish") return "iraqi";

  const country = recipe.country?.trim();
  if (!country) return "global";
  if (countries.levantine.has(country)) return "levantine";
  if (countries.gulf.has(country)) return "gulf";
  if (countries.egyptianNile.has(country)) return "egyptian_nile";
  if (countries.yemeni.has(country)) return "yemeni";
  if (countries.maghrebi.has(country)) return "maghrebi";
  if (countries.arabicHorn.has(country)) return "arabic_horn";
  if (countries.westernEuropean.has(country)) return "western_european";
  if (countries.american.has(country)) return "american";
  if (countries.asian.has(country)) return "asian";
  if (countries.pacific.has(country)) return "pacific";
  return "african";
}

export function getCuisineGroup(recipe: Recipe): CuisineGroup {
  return GROUP_BY_KEY.get(getCuisineGroupKey(recipe)) ?? GROUP_BY_KEY.get("global")!;
}

export function filterRecipesByCuisineGroup(recipes: Recipe[], key: CuisineGroupKey): Recipe[] {
  if (key === "all") return recipes;
  return recipes.filter((recipe) => getCuisineGroupKey(recipe) === key);
}

export function getCuisineGroupByKey(key: CuisineGroupKey): CuisineGroup {
  return GROUP_BY_KEY.get(key) ?? GROUP_BY_KEY.get("global")!;
}

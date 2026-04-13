// قاعدة بيانات المكونات العراقية والعربية للإكمال التلقائي
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  aliases: string[]; // أسماء بديلة أو اختصارات
}

export const INGREDIENT_CATEGORIES = {
  meat: "لحوم",
  poultry: "دواجن",
  fish: "أسماك",
  vegetables: "خضروات",
  fruits: "فواكه",
  grains: "حبوب ونشويات",
  dairy: "ألبان",
  spices: "بهارات وتوابل",
  oils: "زيوت ودهون",
  legumes: "بقوليات",
  canned: "معلبات",
  other: "أخرى",
};

export const INGREDIENTS: Ingredient[] = [
  // لحوم
  { id: "lamb", name: "لحم غنم", category: "meat", aliases: ["لح", "لحم", "غنم", "خروف"] },
  { id: "beef", name: "لحم بقر", category: "meat", aliases: ["بقر", "عجل"] },
  { id: "ground_meat", name: "لحم مفروم", category: "meat", aliases: ["مفروم", "كيمة", "قيمة"] },
  { id: "lamb_ribs", name: "ريش غنم", category: "meat", aliases: ["ريش", "ضلوع"] },
  { id: "lamb_shank", name: "موزات لحم", category: "meat", aliases: ["موزات", "هبر"] },
  { id: "liver", name: "كبدة", category: "meat", aliases: ["كبد", "كبدة"] },
  { id: "tripe", name: "كرشة", category: "meat", aliases: ["كرش", "باجة"] },

  // دواجن
  { id: "chicken", name: "دجاج", category: "poultry", aliases: ["دج", "دجاج", "فروج"] },
  { id: "chicken_breast", name: "صدر دجاج", category: "poultry", aliases: ["صدر", "صدور"] },
  { id: "chicken_thigh", name: "فخذ دجاج", category: "poultry", aliases: ["فخذ", "أفخاذ", "وراك"] },

  // أسماك
  { id: "fish", name: "سمك", category: "fish", aliases: ["سم", "سمك", "سمچ"] },
  { id: "shrimp", name: "روبيان", category: "fish", aliases: ["روب", "روبيان", "جمبري"] },
  { id: "carp", name: "سمك شبوط", category: "fish", aliases: ["شبوط", "بني"] },

  // خضروات
  { id: "tomato", name: "طماطة", category: "vegetables", aliases: ["طم", "طماط", "طماطة", "طماطم"] },
  { id: "onion", name: "بصل", category: "vegetables", aliases: ["بص", "بصل"] },
  { id: "garlic", name: "ثوم", category: "vegetables", aliases: ["ثو", "ثوم"] },
  { id: "potato", name: "بطاطا", category: "vegetables", aliases: ["بط", "بطاط", "بطاطا", "بطاطس"] },
  { id: "eggplant", name: "باذنجان", category: "vegetables", aliases: ["باذ", "باذنجان", "بيتنجان"] },
  { id: "zucchini", name: "كوسة", category: "vegetables", aliases: ["كو", "كوسة", "كوسا", "شجر"] },
  { id: "okra", name: "بامية", category: "vegetables", aliases: ["بام", "بامية", "باميا"] },
  { id: "pepper_green", name: "فلفل أخضر", category: "vegetables", aliases: ["فلفل", "فل"] },
  { id: "cucumber", name: "خيار", category: "vegetables", aliases: ["خي", "خيار"] },
  { id: "lettuce", name: "خس", category: "vegetables", aliases: ["خس"] },
  { id: "carrot", name: "جزر", category: "vegetables", aliases: ["جز", "جزر"] },
  { id: "spinach", name: "سبانخ", category: "vegetables", aliases: ["سب", "سبانخ"] },
  { id: "parsley", name: "بقدونس", category: "vegetables", aliases: ["بقد", "بقدونس", "معدنوس"] },
  { id: "mint", name: "نعناع", category: "vegetables", aliases: ["نع", "نعنع", "نعناع"] },
  { id: "cilantro", name: "كزبرة", category: "vegetables", aliases: ["كز", "كزبرة"] },
  { id: "celery", name: "كرفس", category: "vegetables", aliases: ["كرف", "كرفس"] },
  { id: "cabbage", name: "ملفوف", category: "vegetables", aliases: ["مل", "ملفوف", "لهانة"] },
  { id: "cauliflower", name: "قرنبيط", category: "vegetables", aliases: ["قرن", "قرنبيط", "زهرة"] },
  { id: "green_beans", name: "فاصوليا خضراء", category: "vegetables", aliases: ["فاص", "فاصوليا", "لوبيا"] },
  { id: "peas", name: "بازلاء", category: "vegetables", aliases: ["باز", "بازلاء", "بزاليا"] },
  { id: "grape_leaves", name: "ورق عنب", category: "vegetables", aliases: ["ورق", "دولمة", "يبرق"] },
  { id: "turnip", name: "شلغم", category: "vegetables", aliases: ["شل", "شلغم"] },
  { id: "radish", name: "فجل", category: "vegetables", aliases: ["فج", "فجل"] },
  { id: "green_onion", name: "بصل أخضر", category: "vegetables", aliases: ["بصل اخضر", "كراث"] },
  { id: "dill", name: "شبت", category: "vegetables", aliases: ["شب", "شبت", "شبنت"] },
  { id: "bell_pepper", name: "فلفل ملون", category: "vegetables", aliases: ["فلفل ملون", "فلفل حلو"] },

  // فواكه
  { id: "lemon", name: "ليمون", category: "fruits", aliases: ["لي", "ليمون", "نومي"] },
  { id: "orange", name: "برتقال", category: "fruits", aliases: ["بر", "برتقال"] },
  { id: "apple", name: "تفاح", category: "fruits", aliases: ["تف", "تفاح"] },
  { id: "banana", name: "موز", category: "fruits", aliases: ["مو", "موز"] },
  { id: "dates", name: "تمر", category: "fruits", aliases: ["تم", "تمر", "رطب"] },
  { id: "pomegranate", name: "رمان", category: "fruits", aliases: ["رم", "رمان"] },
  { id: "watermelon", name: "رقي", category: "fruits", aliases: ["رق", "رقي", "بطيخ"] },
  { id: "grapes", name: "عنب", category: "fruits", aliases: ["عن", "عنب"] },

  // حبوب ونشويات
  { id: "rice", name: "رز", category: "grains", aliases: ["رز", "تمن", "أرز", "رز بسمتي"] },
  { id: "bread", name: "خبز", category: "grains", aliases: ["خب", "خبز", "صمون"] },
  { id: "flour", name: "طحين", category: "grains", aliases: ["طح", "طحين", "دقيق"] },
  { id: "pasta", name: "معكرونة", category: "grains", aliases: ["مع", "معكرونة", "باستا", "شعيرية"] },
  { id: "vermicelli", name: "شعيرية", category: "grains", aliases: ["شعيرية", "شعرية"] },
  { id: "bulgur", name: "برغل", category: "grains", aliases: ["بر", "برغل"] },
  { id: "bread_crumbs", name: "فتات خبز", category: "grains", aliases: ["فتات", "بقسماط"] },
  { id: "tortilla", name: "خبز لفة", category: "grains", aliases: ["لفة", "تورتيلا"] },

  // ألبان
  { id: "milk", name: "حليب", category: "dairy", aliases: ["حل", "حليب", "لبن"] },
  { id: "yogurt", name: "لبن رائب", category: "dairy", aliases: ["لبن", "روب", "زبادي"] },
  { id: "cheese", name: "جبن", category: "dairy", aliases: ["جب", "جبن", "جبنة"] },
  { id: "cream", name: "قشطة", category: "dairy", aliases: ["قش", "قشطة", "كريمة", "قيمر"] },
  { id: "butter", name: "زبدة", category: "dairy", aliases: ["زب", "زبدة"] },
  { id: "eggs", name: "بيض", category: "dairy", aliases: ["بي", "بيض"] },

  // بهارات وتوابل
  { id: "salt", name: "ملح", category: "spices", aliases: ["مل", "ملح"] },
  { id: "black_pepper", name: "فلفل أسود", category: "spices", aliases: ["فلفل اسود", "بهار اسود"] },
  { id: "turmeric", name: "كركم", category: "spices", aliases: ["كر", "كركم"] },
  { id: "cumin", name: "كمون", category: "spices", aliases: ["كم", "كمون"] },
  { id: "cinnamon", name: "قرفة", category: "spices", aliases: ["قر", "قرفة", "دارسين"] },
  { id: "cardamom", name: "هيل", category: "spices", aliases: ["هي", "هيل", "هال"] },
  { id: "baharat", name: "بهارات مشكلة", category: "spices", aliases: ["بهار", "بهارات"] },
  { id: "noomi_basra", name: "نومي بصرة", category: "spices", aliases: ["نومي", "ليمون مجفف"] },
  { id: "sumac", name: "سماق", category: "spices", aliases: ["سم", "سماق"] },
  { id: "saffron", name: "زعفران", category: "spices", aliases: ["زع", "زعفران"] },
  { id: "tomato_paste", name: "معجون طماطة", category: "spices", aliases: ["معجون", "رب", "صلصة"] },
  { id: "tamarind", name: "تمر هندي", category: "spices", aliases: ["تمر هندي", "حمر"] },
  { id: "dried_lime", name: "لومي", category: "spices", aliases: ["لومي", "نومي"] },
  { id: "curry", name: "كاري", category: "spices", aliases: ["كاري"] },
  { id: "paprika", name: "بابريكا", category: "spices", aliases: ["بابريكا", "فلفل حلو مطحون"] },
  { id: "chili", name: "فلفل حار", category: "spices", aliases: ["حار", "شطة"] },

  // زيوت ودهون
  { id: "vegetable_oil", name: "زيت نباتي", category: "oils", aliases: ["زي", "زيت"] },
  { id: "olive_oil", name: "زيت زيتون", category: "oils", aliases: ["زيتون"] },
  { id: "ghee", name: "سمن", category: "oils", aliases: ["سم", "سمن", "دهن حر"] },
  { id: "sesame_oil", name: "زيت سمسم", category: "oils", aliases: ["سمسم"] },

  // بقوليات
  { id: "lentils", name: "عدس", category: "legumes", aliases: ["عد", "عدس"] },
  { id: "chickpeas", name: "حمص", category: "legumes", aliases: ["حم", "حمص", "نخي"] },
  { id: "fava_beans", name: "باقلاء", category: "legumes", aliases: ["باق", "باقلاء", "باقلا", "فول"] },
  { id: "kidney_beans", name: "فاصوليا حمراء", category: "legumes", aliases: ["فاصوليا حمراء", "لوبيا حمراء"] },
  { id: "white_beans", name: "فاصوليا بيضاء", category: "legumes", aliases: ["فاصوليا بيضاء"] },

  // معلبات
  { id: "canned_tomato", name: "طماطة معلبة", category: "canned", aliases: ["طماطة معلبة", "صلصة طماطم"] },
  { id: "canned_tuna", name: "تونة", category: "canned", aliases: ["تو", "تونة"] },
  { id: "canned_corn", name: "ذرة معلبة", category: "canned", aliases: ["ذرة"] },

  // أخرى
  { id: "sugar", name: "سكر", category: "other", aliases: ["سك", "سكر"] },
  { id: "honey", name: "عسل", category: "other", aliases: ["عس", "عسل"] },
  { id: "vinegar", name: "خل", category: "other", aliases: ["خل"] },
  { id: "tahini", name: "طحينة", category: "other", aliases: ["طحينة", "راشي"] },
  { id: "nuts", name: "مكسرات", category: "other", aliases: ["مكسرات", "جوز", "لوز", "فستق"] },
  { id: "raisins", name: "زبيب", category: "other", aliases: ["زبيب"] },
  { id: "coconut", name: "جوز هند", category: "other", aliases: ["جوز هند", "نارجيل"] },
  { id: "water", name: "ماء", category: "other", aliases: ["ماء", "ماي"] },
  { id: "tea", name: "شاي", category: "other", aliases: ["شاي", "چاي"] },
  { id: "coffee", name: "قهوة", category: "other", aliases: ["قهوة"] },
];

// دالة البحث في المكونات
export function searchIngredients(query: string): Ingredient[] {
  if (!query || query.length === 0) return [];

  const normalizedQuery = query.trim().toLowerCase();

  return INGREDIENTS.filter((ingredient) => {
    // البحث في الاسم
    if (ingredient.name.includes(normalizedQuery)) return true;
    // البحث في الأسماء البديلة
    return ingredient.aliases.some((alias) => alias.startsWith(normalizedQuery));
  }).slice(0, 8); // أقصى 8 نتائج
}

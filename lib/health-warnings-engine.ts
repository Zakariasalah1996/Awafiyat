/**
 * محرك التحذيرات الصحية الذكي
 * يحلل مكونات الوصفة والقيم الغذائية ويولّد تحذيرات دقيقة ومخصصة
 * لكل مرض بناءً على المكونات الفعلية مع بدائل صحية واضحة
 */

import type { HealthCondition } from "@/lib/user-context";

export interface HealthWarning {
  /** المكون أو السبب الضار */
  cause: string;
  /** رسالة التحذير */
  message: string;
  /** البدائل الصحية المقترحة */
  alternatives: string[];
  /** مستوى الخطورة */
  severity: "high" | "medium" | "low";
}

/** الشكل الأدنى للوصفة اللازم لاختيار بدائل فعلية من المكتبة. */
export interface HealthRecipeCandidate {
  id: string;
  name: string;
  category: string;
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
}

/** توحيد أكثر صيغ العربية شيوعاً قبل مطابقة أسماء المكونات. */
function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────
// قاعدة بيانات التحذيرات لكل مرض مع البدائل
// ─────────────────────────────────────────────

interface WarningRule {
  keywords: string[];
  cause: string;
  message: string;
  alternatives: string[];
  severity: "high" | "medium" | "low";
}

const DIABETES_RULES: WarningRule[] = [
  {
    keywords: ["سكر", "سكر أبيض", "سكر ناعم", "شيرة", "قطر", "شربت", "شراب", "سيروب"],
    cause: "السكر المضاف",
    message: "يرفع مستوى الجلوكوز في الدم بسرعة.",
    alternatives: ["ستيفيا (محلي طبيعي بدون سعرات)", "إريثريتول", "قرفة لإضافة حلاوة طبيعية", "تقليل الكمية للنصف"],
    severity: "high",
  },
  {
    keywords: ["عسل", "دبس", "دبس رمان", "دبس تمر"],
    cause: "العسل والدبس",
    message: "يرفعان السكر في الدم رغم كونهما طبيعيين.",
    alternatives: ["ستيفيا أو محلي طبيعي", "كمية صغيرة جداً (نصف ملعقة)", "دبس خروب (أقل تأثيراً على السكر)"],
    severity: "high",
  },
  {
    keywords: ["تمر", "رطب", "خرما"],
    cause: "التمر",
    message: "غني بالسكريات الطبيعية المركزة.",
    alternatives: ["حبة واحدة فقط بدلاً من عدة حبات", "تفاح أخضر (أقل سكراً)", "توت أو فراولة"],
    severity: "medium",
  },
  {
    keywords: ["مربى", "مربة", "مرملاد"],
    cause: "المربى",
    message: "يحتوي على نسبة عالية جداً من السكر المضاف.",
    alternatives: ["مربى خالي من السكر (متوفر في السوبرماركت)", "فاكهة طازجة مهروسة", "زبدة الفول السوداني الطبيعية"],
    severity: "high",
  },
  {
    keywords: ["رز أبيض", "أرز أبيض", "رز", "أرز", "رز بسمتي", "أرز بسمتي"],
    cause: "الأرز الأبيض",
    message: "مؤشره الجلايسيمي مرتفع ويرفع السكر بسرعة.",
    alternatives: ["أرز بني أو أرز بسمتي (مؤشر جلايسيمي أقل)", "برغل", "كينوا", "تقليل الكمية لنصف كوب"],
    severity: "medium",
  },
  {
    keywords: ["خبز أبيض", "صمون", "باغيت", "خبز"],
    cause: "الخبز الأبيض",
    message: "يرفع السكر بسرعة بسبب الطحين المكرر.",
    alternatives: ["خبز أسمر أو خبز حبوب كاملة", "خبز الشوفان", "خس كلفافة بدلاً من الخبز", "خبز بذور الكتان"],
    severity: "medium",
  },
  {
    keywords: ["طحين أبيض", "طحين", "دقيق أبيض", "دقيق"],
    cause: "الطحين الأبيض",
    message: "مكرر ويتحول إلى سكر بسرعة في الجسم.",
    alternatives: ["طحين قمح كامل", "طحين لوز", "طحين جوز الهند", "طحين الشوفان"],
    severity: "medium",
  },
  {
    keywords: ["بطاطا", "بطاطس"],
    cause: "البطاطا",
    message: "تحتوي على نشا يتحول إلى سكر.",
    alternatives: ["بطاطا حلوة (مؤشر جلايسيمي أقل)", "قرنبيط مهروس", "كوسة", "تقليل الكمية"],
    severity: "low",
  },
  {
    keywords: ["عصير", "عصير فواكه", "عصير برتقال", "عصير تفاح"],
    cause: "عصير الفاكهة",
    message: "سكريات مركزة بدون ألياف ترفع السكر بسرعة.",
    alternatives: ["الفاكهة كاملة (الألياف تبطئ امتصاص السكر)", "ماء بالليمون والنعناع", "عصير خضروات (خيار، كرفس)"],
    severity: "medium",
  },
];

const HYPERTENSION_RULES: WarningRule[] = [
  {
    keywords: ["ملح", "ملح الطعام", "ملح خشن", "ملح بحري"],
    cause: "الملح الزائد",
    message: "قد يرفع ضغط الدم عند زيادة الكمية بسبب الصوديوم واحتباس السوائل.",
    alternatives: ["أعشاب طازجة (بقدونس، كزبرة، نعناع)", "ليمون وخل", "ثوم وبصل مجفف", "كمون وكركم", "تقليل الكمية للنصف"],
    severity: "high",
  },
  {
    keywords: ["صلصة صويا", "صوص الصويا", "سوي صوص"],
    cause: "صلصة الصويا",
    message: "عالية جداً بالصوديوم (900 ملغ في ملعقة صغيرة).",
    alternatives: ["صلصة صويا قليلة الصوديوم", "خل بلسمي", "عصير ليمون مع ثوم", "صلصة ترياكي منزلية خفيفة"],
    severity: "high",
  },
  {
    keywords: ["مرقة جاهزة", "مرقة مكعبات", "مكعب مرقة", "ماجي", "كنور", "بهارات جاهزة", "بودرة مرقة"],
    cause: "المرقة الجاهزة",
    message: "تحتوي على صوديوم عالٍ جداً ومواد حافظة.",
    alternatives: ["مرقة منزلية طازجة (عظم + خضروات)", "ماء مع أعشاب وتوابل طبيعية", "مرقة خضروات محضرة في البيت"],
    severity: "high",
  },
  {
    keywords: ["مخلل", "مخللات", "طرشي", "زيتون مملح", "ليمون مخلل"],
    cause: "المخللات",
    message: "غنية بالملح والصوديوم.",
    alternatives: ["خضروات طازجة مقطعة", "زيتون قليل الملح (منقوع بالماء)", "سلطة خضراء", "خيار طازج بدلاً من المخلل"],
    severity: "high",
  },
  {
    keywords: ["جبنة", "جبن", "جبنة بيضاء", "جبنة صفراء", "جبنة معالجة", "فيتا", "حلومي"],
    cause: "الجبن المملح",
    message: "يحتوي على نسبة عالية من الصوديوم.",
    alternatives: ["جبنة قريش (قليلة الملح)", "لبنة منزلية", "جبنة موزاريلا طازجة", "أفوكادو كبديل دسم"],
    severity: "medium",
  },
  {
    keywords: ["لحم مدخن", "سجق", "نقانق", "هوت دوج", "لانشون"],
    cause: "اللحوم المصنعة",
    message: "عالية الصوديوم والنترات الضارة.",
    alternatives: ["صدر دجاج مشوي مقطع شرائح", "لحم بقري طازج مطبوخ في البيت", "سمك مشوي", "فلافل منزلية"],
    severity: "high",
  },
  {
    keywords: ["كافيين", "قهوة", "نسكافيه", "إسبريسو"],
    cause: "الكافيين",
    message: "يرفع ضغط الدم مؤقتاً.",
    alternatives: ["قهوة منزوعة الكافيين", "شاي أعشاب (بابونج، يانسون)", "ماء دافئ بالليمون", "فنجان واحد فقط يومياً"],
    severity: "medium",
  },
  {
    keywords: ["سمن", "سمن حيواني", "زبدة"],
    cause: "الدهون المشبعة",
    message: "تصلب الأوعية الدموية وترفع الضغط على المدى البعيد.",
    alternatives: ["زيت زيتون بكر", "زيت الكانولا", "زيت عباد الشمس", "أفوكادو"],
    severity: "medium",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ"],
    cause: "الكريمة الثقيلة",
    message: "عالية الدهون المشبعة التي تؤثر على الأوعية الدموية.",
    alternatives: ["زبادي يوناني قليل الدسم", "حليب جوز الهند الخفيف", "حليب قليل الدسم", "كريمة كاجو منزلية"],
    severity: "medium",
  },
  {
    keywords: ["سمك مملح", "فسيخ", "رنجة", "أنشوجة", "صلصة سمك"],
    cause: "أطعمة عالية الصوديوم",
    message: "قد تحتوي على صوديوم مرتفع، لذلك تحتاج الحصة إلى ضبط لدى من يراقب الضغط.",
    alternatives: ["سمك طازج مشوي مع ليمون", "تتبيلة أعشاب بلا ملح مضاف", "تقليل الكمية وغسل المكوّن المملح عند الإمكان"],
    severity: "high",
  },
];

const OBESITY_RULES: WarningRule[] = [
  {
    keywords: ["سمن", "سمن بلدي", "سمن حيواني", "زبدة", "دهن", "شحم"],
    cause: "الدهون العالية",
    message: "عالية السعرات (120 سعرة في ملعقة واحدة).",
    alternatives: ["رش زيت زيتون بالبخاخ (أقل كمية)", "طهي بدون دهون (تيفال)", "زيت جوز الهند بكمية صغيرة", "مرق خضروات بدلاً من الزيت"],
    severity: "high",
  },
  {
    keywords: ["قلي", "مقلي", "قلي عميق", "مقلية"],
    cause: "الطريقة المقلية",
    message: "القلي يضاعف السعرات الحرارية للطعام.",
    alternatives: ["شوي في الفرن", "قلاية هوائية (Air Fryer)", "طهي بالبخار", "شوي على الفحم أو الشبك"],
    severity: "high",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ", "كريمة مخفوقة"],
    cause: "الكريمة الثقيلة",
    message: "عالية جداً بالدهون والسعرات الحرارية.",
    alternatives: ["زبادي يوناني قليل الدسم", "حليب قليل الدسم", "كريمة كاجو خفيفة", "جبنة قريش مخفوقة"],
    severity: "high",
  },
  {
    keywords: ["سكر", "شيرة", "قطر", "شربت", "عسل", "دبس"],
    cause: "السكر المضاف",
    message: "يتحول إلى دهون في الجسم عند الزيادة.",
    alternatives: ["ستيفيا (صفر سعرات)", "قرفة للحلاوة الطبيعية", "فاكهة مهروسة كمحلي", "تقليل الكمية تدريجياً"],
    severity: "high",
  },
  {
    keywords: ["زيت", "زيت نباتي", "زيت للقلي"],
    cause: "زيت مضاف",
    message: "الزيت مفيد بنوعه المناسب، لكن زيادته ترفع سعرات الوجبة بسرعة.",
    alternatives: ["قياس الزيت بملعقة بدلاً من سكبه مباشرة", "الشوي أو القلاية الهوائية", "زيادة الخضروات وخفض كمية الزيت"],
    severity: "low",
  },
  {
    keywords: ["عجينة", "فطير", "باستا", "معكرونة", "نودلز"],
    cause: "الكربوهيدرات المكررة",
    message: "عالية السعرات وتسبب الجوع بسرعة.",
    alternatives: ["معكرونة حبوب كاملة", "كوسة مبشورة كنودلز (زودلز)", "شيراتاكي نودلز (صفر سعرات)", "تقليل الحصة لنصف كوب"],
    severity: "medium",
  },
  {
    keywords: ["مايونيز", "صلصة جاهزة", "كاتشب"],
    cause: "الصلصات الجاهزة",
    message: "عالية السعرات والسكر والدهون المخفية.",
    alternatives: ["زبادي مع ليمون وثوم", "خردل (قليل السعرات)", "صلصة طماطم منزلية", "خل بلسمي مع أعشاب"],
    severity: "medium",
  },
  {
    keywords: ["جوز", "لوز", "فستق", "كاجو", "مكسرات"],
    cause: "المكسرات بكميات كبيرة",
    message: "صحية لكنها عالية السعرات (حفنة = 180 سعرة).",
    alternatives: ["حفنة صغيرة فقط (30 غرام)", "بذور شيا أو كتان (أقل سعرات)", "مكسرات نيئة بدلاً من المحمصة بالزيت"],
    severity: "low",
  },
];

const CHOLESTEROL_RULES: WarningRule[] = [
  {
    keywords: ["كبدة", "كبد", "كلاوي", "كلى", "مخ", "قلب لحم", "أحشاء"],
    cause: "الأحشاء الداخلية",
    message: "غنية جداً بالكوليسترول (كبدة واحدة = 300 ملغ).",
    alternatives: ["صدر دجاج بدون جلد", "سمك مشوي (سلمون، تونة)", "عدس أو فاصوليا كمصدر بروتين", "توفو"],
    severity: "high",
  },
  {
    keywords: ["زبدة", "سمن", "سمن بلدي", "سمن حيواني", "دهن حيواني", "شحم"],
    cause: "الدهون المشبعة الحيوانية",
    message: "ترفع الكوليسترول الضار (LDL) مباشرة.",
    alternatives: ["زيت زيتون بكر ممتاز", "زيت الكانولا", "زيت الأفوكادو", "زيت بذور الكتان"],
    severity: "high",
  },
  {
    keywords: ["صفار البيض", "بيض مقلي", "عجة"],
    cause: "صفار البيض",
    message: "يحتوي على 186 ملغ كوليسترول في الصفار الواحد.",
    alternatives: ["بياض البيض فقط (صفر كوليسترول)", "بيضة كاملة واحدة + بياض إضافي", "توفو مخفوق كبديل", "3-4 صفارات أسبوعياً كحد أقصى"],
    severity: "high",
  },
  {
    keywords: ["جلد الدجاج", "جلد"],
    cause: "جلد الدجاج",
    message: "غني بالدهون المشبعة والكوليسترول.",
    alternatives: ["إزالة الجلد قبل الطهي", "صدر دجاج بدون جلد", "سمك كبديل", "ديك رومي بدون جلد"],
    severity: "high",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ"],
    cause: "الكريمة الثقيلة",
    message: "عالية الدهون المشبعة التي ترفع الكوليسترول الضار.",
    alternatives: ["زبادي يوناني قليل الدسم", "حليب الشوفان", "كريمة كاجو منزلية", "حليب قليل الدسم مع نشا"],
    severity: "medium",
  },
  {
    keywords: ["جبنة", "جبن", "جبنة صفراء", "جبنة كريمية"],
    cause: "الجبن الدسم",
    message: "يحتوي على دهون مشبعة وكوليسترول.",
    alternatives: ["جبنة قريش قليلة الدسم", "جبنة موزاريلا خفيفة", "خميرة غذائية (نكهة جبن)", "أفوكادو مهروس"],
    severity: "medium",
  },
  {
    keywords: ["لحم مفروم", "لحم دهني", "لحم بقري دهني"],
    cause: "اللحم الدهني",
    message: "يرفع الكوليسترول الضار بسبب الدهون المشبعة.",
    alternatives: ["لحم مفروم خالي الدهن (5% دهون)", "صدر دجاج مفروم", "ديك رومي مفروم", "عدس أو فاصوليا مهروسة"],
    severity: "medium",
  },
  {
    keywords: ["لحم غنم", "لحم ضان", "لحم بقر", "لحم عجل", "لحم احمر"],
    cause: "لحم أحمر",
    message: "قد يرفع الدهون المشبعة بحسب القطعة والكمية؛ اختيار القطع قليلة الدهن يخفف الأثر.",
    alternatives: ["لحم أحمر قليل الدهن بعد إزالة الدهن الظاهر", "دجاج منزوع الجلد", "سمك مشوي", "عدس أو فاصوليا"],
    severity: "medium",
  },
  {
    keywords: ["جوز الهند", "زيت جوز الهند", "حليب جوز الهند"],
    cause: "زيت جوز الهند",
    message: "غني بالدهون المشبعة رغم كونه نباتياً.",
    alternatives: ["زيت زيتون", "حليب لوز غير محلى", "حليب الشوفان", "زيت الكانولا"],
    severity: "medium",
  },
  {
    keywords: ["سجق", "نقانق", "لانشون", "لحم مدخن"],
    cause: "اللحوم المصنعة",
    message: "عالية الدهون المشبعة والكوليسترول والصوديوم.",
    alternatives: ["صدر دجاج مشوي مقطع", "سمك تونة معلب بالماء", "حمص أو فول", "شرائح ديك رومي طازج"],
    severity: "high",
  },
];

// ─────────────────────────────────────────────
// الدالة الرئيسية لتوليد التحذيرات
// ─────────────────────────────────────────────

export function generateHealthWarnings(
  ingredients: { name: string; amount: string }[],
  steps: string[],
  category: string,
  calories: number,
  carbs: number,
  fat: number,
  healthCondition: HealthCondition
): HealthWarning[] {
  if (healthCondition === "none") return [];

  const warnings: HealthWarning[] = [];
  const seen = new Set<string>();

  // دمج كل النصوص للبحث فيها
  const allText = normalizeArabic([
    ...ingredients.map((i) => i.name),
    ...steps,
  ].join(" "));

  // اختيار قواعد المرض المناسبة
  let rules: WarningRule[] = [];
  if (healthCondition === "diabetes") rules = DIABETES_RULES;
  else if (healthCondition === "hypertension") rules = HYPERTENSION_RULES;
  else if (healthCondition === "obesity") rules = OBESITY_RULES;
  else if (healthCondition === "cholesterol") rules = CHOLESTEROL_RULES;

  // فحص كل قاعدة
  for (const rule of rules) {
    if (seen.has(rule.cause)) continue;
    for (const keyword of rule.keywords) {
      if (allText.includes(normalizeArabic(keyword))) {
        seen.add(rule.cause);
        warnings.push({
          cause: rule.cause,
          message: rule.message,
          alternatives: rule.alternatives,
          severity: rule.severity,
        });
        break;
      }
    }
  }

  // تحذيرات إضافية بناءً على القيم الغذائية
  if (healthCondition === "diabetes" && carbs >= 45 && !seen.has("كربوهيدرات عالية")) {
    warnings.push({
      cause: "كربوهيدرات عالية",
      message: `تحتوي على ${carbs}g كربوهيدرات للحصة؛ راقب حجم الحصة ضمن خطتك الغذائية.`,
      alternatives: ["تقليل الحصة للنصف", "إضافة بروتين أو دهون صحية لإبطاء الامتصاص", "تناولها مع سلطة خضراء"],
      severity: "medium",
    });
  }

  if (healthCondition === "obesity" && calories >= 400 && !seen.has("سعرات عالية")) {
    warnings.push({
      cause: "سعرات عالية",
      message: `تحتوي على ${calories} سعرة حرارية للحصة الواحدة.`,
      alternatives: ["تقسيم الحصة على وجبتين", "تقليل كمية الدهون والزيوت", "إضافة خضروات لزيادة الحجم بدون سعرات"],
      severity: "medium",
    });
  }

  if (healthCondition === "obesity" && fat >= 18 && !seen.has("دهون عالية")) {
    warnings.push({
      cause: "دهون عالية",
      message: `تحتوي على ${fat}g دهون للحصة؛ خفف الدهون المضافة ووازنها بالخضروات.`,
      alternatives: ["قياس الزيت بملعقة", "اختيار الشوي أو الخَبز", "تقليل الإضافات الدسمة"],
      severity: "medium",
    });
  }

  if (healthCondition === "cholesterol" && fat >= 18 && !seen.has("دهون عالية")) {
    warnings.push({
      cause: "دهون عالية",
      message: `تحتوي على ${fat}g دهون للحصة؛ راجع نوع الدهون واختر غير المشبعة قدر الإمكان.`,
      alternatives: ["استبدال السمن والزبدة بزيت زيتون", "اختيار قطع لحم أقل دهناً", "استخدام طريقة الشوي بدلاً من القلي"],
      severity: "medium",
    });
  }

  // تحذير خاص للحلويات لمرضى السكري والسمنة
  if (
    category === "dessert" &&
    (healthCondition === "diabetes" || healthCondition === "obesity") &&
    !seen.has("حلويات")
  ) {
    warnings.push({
      cause: "حلويات",
      message: healthCondition === "diabetes"
        ? "الحلويات تحتوي على سكريات ودهون عالية."
        : "الحلويات عالية السعرات الحرارية.",
      alternatives: healthCondition === "diabetes"
        ? ["فاكهة طازجة كحلوى", "حلويات بستيفيا بدلاً من السكر", "زبادي مع توت", "حصة صغيرة جداً في المناسبات"]
        : ["فاكهة طازجة", "زبادي يوناني مع قرفة", "جيلي خالي السكر", "حصة صغيرة جداً"],
      severity: "medium",
    });
  }

  // ترتيب التحذيرات حسب الخطورة
  const severityOrder = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
}

/** درجة نسبية لاختيار بديل أخف من الوصفة المعروضة، وليست حكماً طبياً. */
export function getHealthWarningScore(recipe: HealthRecipeCandidate, healthCondition: HealthCondition): number {
  const severityScore = { high: 3, medium: 2, low: 1 };
  const warnings = generateHealthWarnings(
    recipe.ingredients,
    recipe.steps,
    recipe.category,
    recipe.calories,
    recipe.carbs,
    recipe.fat,
    healthCondition,
  );
  return warnings.reduce((total, warning) => total + severityScore[warning.severity], 0);
}

/**
 * يقترح حتى ثلاث وصفات فعلية من المكتبة ذات عبء تحذيري أقل، ويفضل الفئة نفسها.
 */
export function getHealthierRecipeAlternatives<T extends HealthRecipeCandidate>(
  recipe: T,
  recipes: T[],
  healthCondition: HealthCondition,
  limit = 3,
): T[] {
  if (healthCondition === "none") return [];

  const recipeScore = getHealthWarningScore(recipe, healthCondition);
  const candidates = recipes.filter((candidate) =>
    candidate.id !== recipe.id && getHealthWarningScore(candidate, healthCondition) < recipeScore,
  );
  const sameCategory = candidates.filter((candidate) => candidate.category === recipe.category);
  const pool = sameCategory.length >= limit ? sameCategory : candidates;

  return [...pool]
    .sort((left, right) => {
      const scoreDifference = getHealthWarningScore(left, healthCondition) - getHealthWarningScore(right, healthCondition);
      if (scoreDifference !== 0) return scoreDifference;
      if (healthCondition === "diabetes") return left.carbs - right.carbs || right.fiber - left.fiber;
      if (healthCondition === "obesity") return left.calories - right.calories || left.fat - right.fat;
      if (healthCondition === "cholesterol") return left.fat - right.fat || right.fiber - left.fiber;
      return left.calories - right.calories || right.fiber - left.fiber;
    })
    .slice(0, limit);
}

// اسم المرض بالعربي
export function getConditionLabel(condition: HealthCondition): string {
  switch (condition) {
    case "diabetes": return "السكري";
    case "hypertension": return "ارتفاع الضغط";
    case "obesity": return "السمنة";
    case "cholesterol": return "الكوليسترول";
    default: return "";
  }
}

// لون الخطورة
export function getSeverityColor(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high": return "#EF4444";
    case "medium": return "#F59E0B";
    case "low": return "#3B82F6";
  }
}

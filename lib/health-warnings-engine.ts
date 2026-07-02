/**
 * محرك التحذيرات الصحية الذكي
 * يحلل مكونات الوصفة والقيم الغذائية ويولّد تحذيرات دقيقة ومخصصة
 * لكل مرض بناءً على المكونات الفعلية
 */

import type { HealthCondition } from "@/lib/user-context";

export interface HealthWarning {
  /** المكون أو السبب الضار */
  cause: string;
  /** رسالة التحذير الكاملة */
  message: string;
  /** مستوى الخطورة */
  severity: "high" | "medium" | "low";
}

// ─────────────────────────────────────────────
// قاعدة بيانات التحذيرات لكل مرض
// ─────────────────────────────────────────────

const DIABETES_RULES: Array<{
  keywords: string[];
  cause: string;
  message: string;
  severity: "high" | "medium" | "low";
}> = [
  {
    keywords: ["سكر", "سكر أبيض", "سكر ناعم", "شيرة", "قطر", "شربت", "شراب"],
    cause: "السكر المضاف",
    message: "تحتوي على سكر مضاف يرفع مستوى الجلوكوز في الدم بسرعة، قلل الكمية أو استبدله بمحلي طبيعي.",
    severity: "high",
  },
  {
    keywords: ["عسل", "دبس", "دبس رمان", "دبس تمر"],
    cause: "العسل والدبس",
    message: "العسل والدبس يرفعان السكر في الدم رغم كونهما طبيعيين، تناولهما بكميات صغيرة جداً.",
    severity: "high",
  },
  {
    keywords: ["تمر", "رطب", "خرما"],
    cause: "التمر",
    message: "التمر غني بالسكريات الطبيعية، حبة أو حبتان كافيتان لمريض السكري.",
    severity: "medium",
  },
  {
    keywords: ["مربى", "مربة", "مرملاد"],
    cause: "المربى",
    message: "المربى يحتوي على نسبة عالية جداً من السكر، يُنصح بتجنبه أو استخدام نسخة خالية من السكر.",
    severity: "high",
  },
  {
    keywords: ["رز أبيض", "أرز أبيض", "رز", "أرز"],
    cause: "الأرز الأبيض",
    message: "الأرز الأبيض يرفع السكر بسرعة لارتفاع مؤشره الجلايسيمي، استبدله بالأرز البني أو قلل الكمية.",
    severity: "medium",
  },
  {
    keywords: ["خبز أبيض", "صمون", "باغيت", "خبز"],
    cause: "الخبز الأبيض",
    message: "الخبز الأبيض يرفع السكر بسرعة، فضل الخبز الأسمر أو خبز الحبوب الكاملة.",
    severity: "medium",
  },
  {
    keywords: ["طحين أبيض", "طحين"],
    cause: "الطحين الأبيض",
    message: "الطحين الأبيض المكرر يرفع مستوى السكر، يمكن استبداله بطحين القمح الكامل.",
    severity: "medium",
  },
  {
    keywords: ["بطاطا", "بطاطس"],
    cause: "البطاطا",
    message: "البطاطا تحتوي على نشا يتحول إلى سكر، قلل الكمية وفضل البطاطا الحلوة كبديل أفضل.",
    severity: "low",
  },
  {
    keywords: ["عصير", "عصير فواكه", "عصير برتقال", "عصير تفاح"],
    cause: "عصير الفاكهة",
    message: "عصائر الفاكهة تحتوي على سكريات مركزة بدون ألياف، تناول الفاكهة كاملة أفضل.",
    severity: "medium",
  },
];

const HYPERTENSION_RULES: Array<{
  keywords: string[];
  cause: string;
  message: string;
  severity: "high" | "medium" | "low";
}> = [
  {
    keywords: ["ملح", "ملح الطعام", "ملح خشن"],
    cause: "الملح الزائد",
    message: "الملح يرفع ضغط الدم مباشرة، استخدم كميات صغيرة جداً واستبدله بالأعشاب والتوابل الطبيعية.",
    severity: "high",
  },
  {
    keywords: ["صلصة صويا", "صوص الصويا", "سوي صوص"],
    cause: "صلصة الصويا",
    message: "صلصة الصويا عالية جداً بالصوديوم، ملعقة صغيرة تحتوي على 900 ملغ صوديوم، استخدمها بحذر.",
    severity: "high",
  },
  {
    keywords: ["مرقة جاهزة", "مرقة مكعبات", "ماجي", "كنور", "بهارات جاهزة"],
    cause: "المرقة الجاهزة",
    message: "المرقة الجاهزة والمكعبات تحتوي على صوديوم عالٍ جداً، استخدم مرقة منزلية طازجة.",
    severity: "high",
  },
  {
    keywords: ["مخلل", "مخللات", "طرشي", "زيتون مملح"],
    cause: "المخللات",
    message: "المخللات غنية بالملح والصوديوم، تناولها بكميات قليلة جداً أو اختر نسخة قليلة الملح.",
    severity: "high",
  },
  {
    keywords: ["جبنة", "جبن", "جبنة بيضاء", "جبنة صفراء", "جبنة معالجة"],
    cause: "الجبن المملح",
    message: "الجبن يحتوي على نسبة عالية من الصوديوم، اختر الجبن قليل الملح أو قلل الكمية.",
    severity: "medium",
  },
  {
    keywords: ["لحم مدخن", "سجق", "نقانق", "هوت دوج", "لانشون"],
    cause: "اللحوم المصنعة",
    message: "اللحوم المصنعة والمدخنة عالية الصوديوم والدهون المشبعة، تجنبها قدر الإمكان.",
    severity: "high",
  },
  {
    keywords: ["كافيين", "قهوة", "نسكافيه", "إسبريسو"],
    cause: "الكافيين",
    message: "الكافيين يرفع ضغط الدم مؤقتاً، تناول فنجاناً واحداً فقط يومياً إن أمكن.",
    severity: "medium",
  },
  {
    keywords: ["سمن", "سمن حيواني", "زبدة"],
    cause: "الدهون المشبعة",
    message: "الدهون المشبعة تصلب الأوعية الدموية وترفع الضغط على المدى البعيد، استبدلها بزيت الزيتون.",
    severity: "medium",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ"],
    cause: "الكريمة الثقيلة",
    message: "الكريمة عالية الدهون المشبعة التي تؤثر على صحة الأوعية الدموية وضغط الدم.",
    severity: "medium",
  },
];

const OBESITY_RULES: Array<{
  keywords: string[];
  cause: string;
  message: string;
  severity: "high" | "medium" | "low";
}> = [
  {
    keywords: ["سمن", "سمن حيواني", "زبدة", "دهن"],
    cause: "الدهون العالية",
    message: "الدهون المشبعة عالية السعرات الحرارية، ملعقة واحدة تحتوي على 120 سعرة، استخدم كميات صغيرة.",
    severity: "high",
  },
  {
    keywords: ["قلي", "مقلي", "قلي عميق", "مقلية"],
    cause: "الطريقة المقلية",
    message: "القلي يضاعف السعرات الحرارية للطعام، استبدله بالشوي أو الفرن أو الطهي بالبخار.",
    severity: "high",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ", "كريمة مخفوقة"],
    cause: "الكريمة الثقيلة",
    message: "الكريمة عالية جداً بالدهون والسعرات، استبدلها بالزبادي قليل الدسم أو الحليب.",
    severity: "high",
  },
  {
    keywords: ["سكر", "شيرة", "قطر", "شربت"],
    cause: "السكر المضاف",
    message: "السكر يتحول إلى دهون في الجسم عند الزيادة، قلل كمية السكر أو استبدله بمحلي طبيعي.",
    severity: "high",
  },
  {
    keywords: ["عجينة", "فطير", "باستا", "معكرونة", "نودلز"],
    cause: "الكربوهيدرات المكررة",
    message: "العجائن البيضاء عالية السعرات وتسبب الشعور بالجوع بسرعة، فضل نسخ الحبوب الكاملة.",
    severity: "medium",
  },
  {
    keywords: ["مايونيز", "صلصة جاهزة", "كاتشب"],
    cause: "الصلصات الجاهزة",
    message: "الصلصات الجاهزة عالية السعرات والسكر والدهون، استخدم كميات صغيرة أو اصنعها منزلياً.",
    severity: "medium",
  },
  {
    keywords: ["جوز", "لوز", "فستق", "كاجو", "مكسرات"],
    cause: "المكسرات بكميات كبيرة",
    message: "المكسرات صحية لكنها عالية السعرات، حفنة صغيرة (30 غرام) كافية يومياً.",
    severity: "low",
  },
];

const CHOLESTEROL_RULES: Array<{
  keywords: string[];
  cause: string;
  message: string;
  severity: "high" | "medium" | "low";
}> = [
  {
    keywords: ["كبدة", "كبد", "كلاوي", "كلى", "مخ", "قلب لحم", "أحشاء"],
    cause: "الأحشاء الداخلية",
    message: "الأحشاء الداخلية غنية جداً بالكوليسترول، تجنبها أو تناولها نادراً جداً.",
    severity: "high",
  },
  {
    keywords: ["زبدة", "سمن حيواني", "دهن حيواني", "شحم"],
    cause: "الدهون المشبعة الحيوانية",
    message: "الدهون المشبعة ترفع الكوليسترول الضار (LDL)، استبدلها بزيت الزيتون أو زيت الكانولا.",
    severity: "high",
  },
  {
    keywords: ["صفار البيض", "بيض مقلي", "عجة"],
    cause: "صفار البيض",
    message: "صفار البيض يحتوي على 186 ملغ كوليسترول، حدد تناوله بـ 3-4 صفارات أسبوعياً.",
    severity: "high",
  },
  {
    keywords: ["جلد الدجاج", "جلد"],
    cause: "جلد الدجاج",
    message: "جلد الدجاج غني بالدهون المشبعة والكوليسترول، أزله قبل الطهي أو الأكل.",
    severity: "high",
  },
  {
    keywords: ["كريمة", "قشطة", "كريمة الطبخ"],
    cause: "الكريمة الثقيلة",
    message: "الكريمة عالية الدهون المشبعة التي ترفع الكوليسترول الضار، استبدلها بالزبادي.",
    severity: "medium",
  },
  {
    keywords: ["جبنة", "جبن", "جبنة صفراء", "جبنة كريمية"],
    cause: "الجبن الدسم",
    message: "الجبن الدسم يحتوي على دهون مشبعة وكوليسترول، اختر الجبن قليل الدسم.",
    severity: "medium",
  },
  {
    keywords: ["لحم مفروم", "لحم دهني", "لحم بقري دهني"],
    cause: "اللحم الدهني",
    message: "اللحم الدهني يرفع الكوليسترول الضار، اختر اللحم الخالي من الدهن أو الدجاج بدون جلد.",
    severity: "medium",
  },
  {
    keywords: ["جوز الهند", "زيت جوز الهند", "حليب جوز الهند"],
    cause: "زيت جوز الهند",
    message: "زيت جوز الهند غني بالدهون المشبعة رغم كونه نباتياً، استخدمه بكميات محدودة.",
    severity: "medium",
  },
  {
    keywords: ["سجق", "نقانق", "لانشون", "لحم مدخن"],
    cause: "اللحوم المصنعة",
    message: "اللحوم المصنعة عالية الدهون المشبعة والكوليسترول، تجنبها قدر الإمكان.",
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
  const allText = [
    ...ingredients.map((i) => i.name.toLowerCase()),
    ...steps.map((s) => s.toLowerCase()),
  ].join(" ");

  // اختيار قواعد المرض المناسبة
  let rules: typeof DIABETES_RULES = [];
  if (healthCondition === "diabetes") rules = DIABETES_RULES;
  else if (healthCondition === "hypertension") rules = HYPERTENSION_RULES;
  else if (healthCondition === "obesity") rules = OBESITY_RULES;
  else if (healthCondition === "cholesterol") rules = CHOLESTEROL_RULES;

  // فحص كل قاعدة
  for (const rule of rules) {
    if (seen.has(rule.cause)) continue;
    for (const keyword of rule.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        seen.add(rule.cause);
        warnings.push({
          cause: rule.cause,
          message: rule.message,
          severity: rule.severity,
        });
        break;
      }
    }
  }

  // تحذيرات إضافية بناءً على القيم الغذائية
  if (healthCondition === "diabetes" && carbs > 50 && !seen.has("كربوهيدرات عالية")) {
    warnings.push({
      cause: "كربوهيدرات عالية",
      message: `هذه الوصفة تحتوي على ${carbs}g كربوهيدرات، وهو مرتفع لمريض السكري. قلل الحصة أو اختر وصفة بديلة.`,
      severity: "medium",
    });
  }

  if (healthCondition === "obesity" && calories > 500 && !seen.has("سعرات عالية")) {
    warnings.push({
      cause: "سعرات عالية",
      message: `هذه الوصفة تحتوي على ${calories} سعرة حرارية للحصة الواحدة، وهو مرتفع. قلل الحصة أو وزعها على وجبتين.`,
      severity: "medium",
    });
  }

  if (healthCondition === "cholesterol" && fat > 20 && !seen.has("دهون عالية")) {
    warnings.push({
      cause: "دهون عالية",
      message: `هذه الوصفة تحتوي على ${fat}g دهون للحصة، وهو مرتفع لمريض الكوليسترول. قلل الكمية أو استبدل مصادر الدهون.`,
      severity: "medium",
    });
  }

  if (healthCondition === "hypertension" && !seen.has("وصفة حلويات")) {
    // لا نضيف تحذير الملح للحلويات إلا إذا كانت تحتوي على ملح فعلاً
  }

  // تحذير خاص للحلويات لمرضى السكري والسمنة
  if (
    category === "dessert" &&
    (healthCondition === "diabetes" || healthCondition === "obesity") &&
    !seen.has("حلويات")
  ) {
    warnings.push({
      cause: "حلويات",
      message:
        healthCondition === "diabetes"
          ? "الحلويات بشكل عام تحتوي على سكريات ودهون عالية، تناولها بكميات صغيرة جداً وبمناسبات نادرة."
          : "الحلويات عالية السعرات الحرارية، تناولها بكميات صغيرة جداً وبمناسبات نادرة.",
      severity: "medium",
    });
  }

  // ترتيب التحذيرات حسب الخطورة
  const severityOrder = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
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

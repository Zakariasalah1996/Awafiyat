import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser, type HealthCondition } from "@/lib/user-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

I18nManager.forceRTL(true);

interface HealthTip {
  title: string;
  content: string;
  emoji: string;
  foods: string[];
  avoid: string[];
}

const HEALTH_TIPS: Record<HealthCondition, HealthTip[]> = {
  diabetes: [
    {
      title: "تنظيم مستوى السكر بالغذاء",
      content:
        "مرض السكري يتطلب عناية خاصة بالتغذية. احرص على تناول وجبات صغيرة ومتكررة بدلاً من وجبة واحدة كبيرة. هذا يساعد الجسم على التحكم بمستوى السكر بشكل أفضل.",
      emoji: "🩺",
      foods: [
        "شوربة عدس",
        "خضروات مشوية",
        "سمك مسكوف",
        "سلطة تبولة",
        "فول مدمس",
        "خبز أسمر",
      ],
      avoid: [
        "السكر الأبيض",
        "المشروبات الغازية",
        "الحلويات المصنعة",
        "الرز الأبيض بكميات كبيرة",
        "العصائر المعلبة",
      ],
    },
    {
      title: "الألياف ودورها في تنظيم السكر",
      content:
        "تبطئ الألياف امتصاص السكر في الدم، مما يساعد على ارتفاعه تدريجياً. أكثر من تناول الخضروات والبقوليات والحبوب الكاملة.",
      emoji: "🥦",
      foods: [
        "بامية",
        "فاصوليا خضراء",
        "عدس",
        "حمص",
        "سبانخ",
        "برغل",
      ],
      avoid: [],
    },
    {
      title: "التمر ومرضى السكري",
      content:
        "يُفضّل تناول التمر باعتدال والانتباه إلى الكمية ضمن نظامك الغذائي. اختر الأنواع المناسبة لك، واستشر طبيبك أو اختصاصي التغذية عند الحاجة.",
      emoji: "🌴",
      foods: ["تمر برحي (1-2 حبة)", "تمر خستاوي (1 حبة)"],
      avoid: ["تمر معجون بكميات كبيرة", "دبس التمر بكثرة"],
    },
    {
      title: "الرياضة وتنظيم مستوى السكر",
      content:
        "قد يساعد المشي المنتظم بعد تناول الطعام على تحسين مستوى السكر في الدم. لا يلزم أداء تمارين شاقة؛ ابدأ تدريجياً بما يناسبك.",
      emoji: "🚶",
      foods: ["وجبة خفيفة قبل الرياضة", "ماء كافي"],
      avoid: ["الرياضة على معدة فارغة", "تأخير الوجبات"],
    },
    {
      title: "البروتين يساعد على استقرار السكر",
      content:
        "يساعد تناول مصدر مناسب من البروتين مع الوجبة على إبطاء ارتفاع السكر في الدم. ومن مصادره الدجاج المشوي والسمك والبيض والبقوليات.",
      emoji: "🍗",
      foods: ["صدر دجاج مشوي", "سمك مسكوف", "بيض مسلوق", "عدس", "حمص"],
      avoid: ["اللحوم المصنعة", "النقانق"],
    },
    {
      title: "مراقبة مستوى السكر بانتظام",
      content:
        "يساعد قياس السكر بانتظام على معرفة أثر الأطعمة المختلفة في جسمك. سجّل القراءات واطلع طبيبك عليها في كل زيارة.",
      emoji: "📊",
      foods: [],
      avoid: ["إهمال قياس السكر", "تغيير جرعة الدواء بدون استشارة"],
    },
  ],
  hypertension: [
    {
      title: "قلّل من تناول الملح",
      content:
        "يساعد الحد من الملح على اتباع نظام غذائي ملائم لضغط الدم. قلّل الملح في الطهي واستعن بالتوابل والأعشاب لإضافة النكهة.",
      emoji: "🧂",
      foods: [
        "سمك مشوي بالأعشاب",
        "سلطة خضراء بليمون",
        "شوربة خضار قليلة الملح",
        "دجاج مشوي بالكركم",
      ],
      avoid: [
        "المخللات بكثرة",
        "الأكل المعلب",
        "رقائق البطاطا والمقبلات المالحة",
        "الصلصات الجاهزة",
      ],
    },
    {
      title: "البوتاسيوم وضغط الدم",
      content:
        "يسهم إدراج مصادر البوتاسيوم ضمن نظام غذائي متوازن في دعم صحة الجسم. تناول الموز والبطاطا والسبانخ والتمر باعتدال، واستشر طبيبك عند وجود قيود غذائية.",
      emoji: "🍌",
      foods: ["موز", "بطاطا مشوية", "سبانخ", "أفوكادو", "لبن"],
      avoid: [],
    },
    {
      title: "الاسترخاء والتنفس العميق",
      content:
        "قد يؤثر التوتر في ضغط الدم. خصص 10 دقائق يومياً للتنفس الهادئ أو التأمل: استنشق ببطء 4 ثوانٍ، واحبس النفس 4 ثوانٍ، ثم أخرج الهواء 6 ثوانٍ.",
      emoji: "🧘",
      foods: ["شاي البابونج", "شاي النعناع"],
      avoid: ["الكافيين الزائد", "التدخين"],
    },
    {
      title: "الثوم ضمن نظام غذائي متوازن",
      content:
        "يمكن إضافة الثوم إلى الطعام لإضفاء النكهة، مع مراعاة الاعتدال وعدم اعتباره بديلاً عن العلاج الموصوف.",
      emoji: "🧄",
      foods: ["ثوم مشوي", "ثوم طازج مع السلطة", "شوربة ثوم"],
      avoid: [],
    },
    {
      title: "النوم الكافي وضغط الدم",
      content:
        "قد يؤثر نقص النوم في الصحة العامة. احرص على نوم منتظم يتراوح بين 7 و8 ساعات يومياً، وتجنب الشاشات قبل النوم بساعة على الأقل.",
      emoji: "😴",
      foods: ["حليب دافئ قبل النوم", "موز"],
      avoid: ["القهوة بعد العصر", "الأكل الثقيل قبل النوم"],
    },
  ],
  obesity: [
    {
      title: "الغذاء الصحي ليس حرماناً",
      content:
        "لا يعني خفض الوزن الحرمان من الطعام المحبب؛ فاختيار الكمية وطريقة التحضير مهمان. اختر الشوي أو الطهي في الفرن بدلاً من القلي، ووازن كمية الأرز بالخضروات.",
      emoji: "⚖️",
      foods: [
        "سلطة تبولة",
        "شوربة عدس",
        "دجاج مشوي",
        "سمك مسكوف",
        "خضروات مشوية",
        "فول مدمس",
      ],
      avoid: [
        "القلي بزيت غزير",
        "الخبز الأبيض بكثرة",
        "المشروبات الغازية",
        "الحلويات المصنعة",
        "الأكل السريع",
      ],
    },
    {
      title: "شرب الماء قبل تناول الطعام",
      content:
        "اشرب الماء بانتظام خلال اليوم، واختره بدلاً من العصائر والمشروبات الغازية. اجعل الكمية مناسبة لاحتياجاتك الصحية.",
      emoji: "💧",
      foods: ["ماء", "شاي أخضر بدون سكر", "ماء بالليمون والنعناع"],
      avoid: ["مشروبات غازية", "عصائر معلبة", "مشروبات طاقة"],
    },
    {
      title: "تناول الطعام ببطء",
      content:
        "قد يستغرق الإحساس بالشبع وقتاً. تناول الطعام ببطء وامضغ جيداً، وضع الملعقة بين اللقمات؛ فقد يساعدك ذلك على الانتباه إلى كمية الطعام.",
      emoji: "🍽️",
      foods: ["وجبات متوازنة", "سلطة قبل الوجبة الرئيسية"],
      avoid: ["الأكل أمام التلفزيون", "الأكل بسرعة"],
    },
    {
      title: "البروتين والشعور بالشبع",
      content:
        "يساعد البروتين على الشعور بالشبع. اجعل جزءاً مناسباً منه ضمن وجباتك، ووازن ذلك بالخضروات والحبوب الكاملة.",
      emoji: "💪",
      foods: ["صدر دجاج", "سمك", "بيض", "عدس", "حمص", "لبن يوناني"],
      avoid: ["اللحوم المقلية", "النقانق والمرتديلا"],
    },
    {
      title: "حجم الطبق وأثره في الكمية",
      content:
        "قد يساعد استخدام أطباق أصغر على الانتباه إلى حجم الحصة. اختر الكمية التي تلائم احتياجاتك وتناولك المعتاد.",
      emoji: "🥗",
      foods: [],
      avoid: ["الأطباق الكبيرة", "إعادة ملء الطبق"],
    },
  ],
  cholesterol: [
    {
      title: "الدهون الصحية والدهون التي ينبغي الحد منها",
      content:
        "تختلف أنواع الدهون؛ فزيت الزيتون والسمك والمكسرات مصادر لدهون غير مشبعة، بينما يُنصح بالحد من الدهون المشبعة مثل السمن والزبدة.",
      emoji: "❤️",
      foods: [
        "سمك مسكوف",
        "زيت زيتون",
        "جوز ولوز",
        "أفوكادو",
        "شوفان",
      ],
      avoid: [
        "سمن (دهن حر) بكثرة",
        "لحم دسم",
        "أكل مقلي",
        "جلد الدجاج",
        "زبدة بكثرة",
      ],
    },
    {
      title: "الشوفان وصحة القلب",
      content:
        "يمكن إدراج الشوفان ضمن نظام غذائي متوازن، مثل تناوله مع الحليب والفواكه. اختر الإضافات والكمية بما يناسب احتياجاتك.",
      emoji: "🥣",
      foods: ["شوفان بالحليب", "شوفان بالتمر", "شوفان بالفواكه"],
      avoid: [],
    },
    {
      title: "السمك وصحة القلب",
      content:
        "يُعد السمك خياراً مناسباً ضمن نظام غذائي متوازن. اختر الأنواع وطرق التحضير الملائمة لك، وتجنب القلي المتكرر.",
      emoji: "🐟",
      foods: ["سمك مشوي", "سمك مسكوف", "تونة طازجة", "سردين"],
      avoid: ["سمك مقلي", "سمك معلب بالزيت"],
    },
    {
      title: "المكسرات غير المملحة",
      content:
        "حفنة صغيرة من المكسرات غير المملحة يومياً (جوز، لوز، فستق) تساعد على خفض الكوليسترول الضار. لكن لا تكثر لأنها عالية السعرات.",
      emoji: "🥜",
      foods: ["جوز (7 حبات)", "لوز (10 حبات)", "فستق حلبي"],
      avoid: ["مكسرات مملحة", "مكسرات محمصة بالزيت"],
    },
    {
      title: "الرياضة ومستويات الكوليسترول",
      content:
        "قد يساعد النشاط البدني المنتظم على دعم صحة القلب ومستويات الكوليسترول. ابدأ تدريجياً وزد المدة بما يناسب قدرتك.",
      emoji: "🏃",
      foods: [],
      avoid: ["الجلوس لفترات طويلة"],
    },
  ],
  none: [
    {
      title: "نصائح عامة للأكل الصحي",
      content:
        "حتى مع عدم وجود مرض، يظل الغذاء المتوازن مهماً لك ولعائلتك. نوّع طعامك ليشمل البروتين والكربوهيدرات والدهون الصحية والخضروات والفواكه.",
      emoji: "🌟",
      foods: [
        "تنوع بالخضروات والفواكه",
        "بروتين من مصادر مختلفة",
        "حبوب كاملة",
        "ألبان قليلة الدسم",
      ],
      avoid: [
        "الإفراط بالسكر",
        "الإفراط بالملح",
        "الأكل المصنع",
        "المشروبات الغازية",
      ],
    },
    {
      title: "الماء أساس الصحة",
      content:
        "اشرب الماء بانتظام خلال اليوم وفق احتياجاتك الصحية. فهو جزء مهم من الترطيب، واستشر طبيبك عند وجود قيود على السوائل.",
      emoji: "💧",
      foods: ["ماء", "شاي أعشاب", "ماء بالليمون"],
      avoid: ["الإكثار من المشروبات الغازية", "الإفراط في الكافيين"],
    },
    {
      title: "التوابل العربية الصحية",
      content:
        "أضف التوابل مثل الكركم والقرفة والزنجبيل والكمون إلى طعامك لإثراء النكهة، ولا تعدّها بديلاً عن العلاج أو النظام الغذائي المتوازن.",
      emoji: "🌿",
      foods: ["كركم", "قرفة", "زنجبيل", "حبة سوداء", "كمون"],
      avoid: [],
    },
    {
      title: "الفواكه والخضروات الملونة",
      content:
        "تتنوع العناصر الغذائية في الفواكه والخضروات. احرص على اختيار ألوان متعددة يومياً، مثل الأحمر (طماطم)، والأخضر (سبانخ)، والبرتقالي (جزر)، والبنفسجي (باذنجان).",
      emoji: "🌈",
      foods: ["طماطم", "سبانخ", "جزر", "باذنجان", "فلفل ملون"],
      avoid: ["فواكه معلبة بالشيرة"],
    },
    {
      title: "النوم والصحة",
      content:
        "يساعد النوم المنتظم، لمدة تتراوح بين 7 و8 ساعات، على دعم الصحة العامة. اجعل غرفة النوم هادئة ومظلمة ودرجة حرارتها معتدلة.",
      emoji: "🌙",
      foods: ["حليب دافئ", "موز", "لوز"],
      avoid: ["القهوة بعد الظهر", "الشاشات قبل النوم"],
    },
  ],
};

export default function HealthTipsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();

  const tips = useMemo(() => {
    return HEALTH_TIPS[profile.healthCondition] || HEALTH_TIPS.none;
  }, [profile.healthCondition]);

  const conditionLabel =
    profile.healthCondition === "diabetes"
      ? "السكري"
      : profile.healthCondition === "hypertension"
      ? "ضغط الدم"
      : profile.healthCondition === "obesity"
      ? "السمنة"
      : profile.healthCondition === "cholesterol"
      ? "الكوليسترول"
      : "الصحة العامة";

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View
          className="px-5 pt-4 pb-2 flex-row items-center justify-between"
          style={{ flexDirection: "row-reverse" }}
        >
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "right" }}
          >
            نصائح صحية
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="chevron.right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Condition Badge */}
        <View className="px-5 mt-2 mb-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: colors.primary + "15" }}
          >
            <Text
              className="text-primary font-bold"
              style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
            >
              نصائح مخصصة لـ: {conditionLabel}
            </Text>
            <Text
              className="text-muted mt-1"
              style={{ fontSize: 13, textAlign: "right", writingDirection: "rtl" }}
            >
              هذه النصائح مبنية على حالتك الصحية التي اخترتها. استشر طبيبك
              دائماً للحصول على إرشادات مناسبة.
            </Text>
          </View>
        </View>

        {/* Tips Cards */}
        {tips.map((tip, index) => (
          <View
            key={index}
            className="mx-5 mb-4 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Tip Header */}
            <View
              className="p-4 flex-row items-center gap-3"
              style={{
                backgroundColor: colors.primary + "10",
                flexDirection: "row-reverse",
              }}
            >
              <Text style={{ fontSize: 32 }}>{tip.emoji}</Text>
              <Text
                className="text-foreground font-bold flex-1"
                style={{
                  fontSize: 17,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                {tip.title}
              </Text>
            </View>

            {/* Tip Content */}
            <View className="p-4">
              <Text
                className="text-foreground"
                style={{
                  fontSize: 14,
                  lineHeight: 24,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                {tip.content}
              </Text>

              {/* Recommended Foods */}
              {tip.foods.length > 0 && (
                <View className="mt-4">
                  <Text
                    className="text-success font-bold mb-2"
                    style={{
                      fontSize: 14,
                      textAlign: "right",
                      writingDirection: "rtl",
                    }}
                  >
                    أطعمة نوصي بها:
                  </Text>
                  <View className="flex-row flex-wrap gap-2" style={{ flexDirection: "row-reverse" }}>
                    {tip.foods.map((food, fi) => (
                      <View
                        key={fi}
                        className="rounded-full px-3 py-1"
                        style={{ backgroundColor: colors.success + "20" }}
                      >
                        <Text
                          style={{ fontSize: 12, color: colors.success }}
                        >
                          {food}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Foods to Avoid */}
              {tip.avoid.length > 0 && (
                <View className="mt-3">
                  <Text
                    className="text-error font-bold mb-2"
                    style={{
                      fontSize: 14,
                      textAlign: "right",
                      writingDirection: "rtl",
                    }}
                  >
                    احرص على التقليل من:
                  </Text>
                  <View className="flex-row flex-wrap gap-2" style={{ flexDirection: "row-reverse" }}>
                    {tip.avoid.map((food, fi) => (
                      <View
                        key={fi}
                        className="rounded-full px-3 py-1"
                        style={{ backgroundColor: colors.error + "20" }}
                      >
                        <Text style={{ fontSize: 12, color: colors.error }}>
                          {food}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

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
      title: "تنظيم السكر بالأكل",
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
      title: "الألياف صديقة السكري",
      content:
        "الألياف تبطئ امتصاص السكر بالدم، يعني تخلي السكر يرتفع ببطء بدل ما يرتفع فجأة. أكثري من الخضروات والبقوليات والحبوب الكاملة.",
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
      title: "التمر العراقي والسكري",
      content:
        "التمر العراقي لذيذ بس لازم تنتبهين للكمية. تمرة وحدة أو ثنتين بالفطور مع القيمر ما تضر، بس لا تكثرين. واختاري الأنواع اللي سكرها أقل مثل البرحي.",
      emoji: "🌴",
      foods: ["تمر برحي (1-2 حبة)", "تمر خستاوي (1 حبة)"],
      avoid: ["تمر معجون بكميات كبيرة", "دبس التمر بكثرة"],
    },
    {
      title: "الرياضة وتنظيم السكر",
      content:
        "المشي 30 دقيقة يومياً بعد الأكل يساعد على خفض مستوى السكر بالدم بشكل ملحوظ. لا تحتاج لرياضة عنيفة، مجرد المشي المنتظم يكفي.",
      emoji: "🚶",
      foods: ["وجبة خفيفة قبل الرياضة", "ماء كافي"],
      avoid: ["الرياضة على معدة فارغة", "تأخير الوجبات"],
    },
    {
      title: "البروتين يثبّت السكر",
      content:
        "تناول البروتين مع كل وجبة يبطئ ارتفاع السكر بالدم. الدجاج المشوي، السمك، البيض، والبقوليات كلها مصادر ممتازة للبروتين.",
      emoji: "🍗",
      foods: ["صدر دجاج مشوي", "سمك مسكوف", "بيض مسلوق", "عدس", "حمص"],
      avoid: ["اللحوم المصنعة", "النقانق"],
    },
    {
      title: "مراقبة السكر بانتظام",
      content:
        "قياس السكر بانتظام يساعدك على معرفة تأثير كل نوع أكل على جسمك. سجّل القراءات واعرضها على طبيبك في كل زيارة.",
      emoji: "📊",
      foods: [],
      avoid: ["إهمال قياس السكر", "تغيير جرعة الدواء بدون استشارة"],
    },
  ],
  hypertension: [
    {
      title: "قلّل من الملح",
      content:
        "الملح هو العدو الأول لمرضى الضغط. حاول تقليل الملح في الطبخ واستبداله بالبهارات والأعشاب العربية التي تعطي نكهة أفضل. الكركم والكمون والنعناع كلها بدائل ممتازة.",
      emoji: "🧂",
      foods: [
        "سمك مشوي بالأعشاب",
        "سلطة خضراء بليمون",
        "شوربة خضار بدون ملح زيادة",
        "دجاج مشوي بالكركم",
      ],
      avoid: [
        "المخللات بكثرة",
        "الأكل المعلب",
        "الشيبس والسناكات المملحة",
        "الصلصات الجاهزة",
      ],
    },
    {
      title: "البوتاسيوم يساعدك",
      content:
        "البوتاسيوم يساعد على تنظيم ضغط الدم. أكثري من الموز والبطاطا والسبانخ والتمر (بكميات معقولة).",
      emoji: "🍌",
      foods: ["موز", "بطاطا مشوية", "سبانخ", "أفوكادو", "لبن"],
      avoid: [],
    },
    {
      title: "الاسترخاء والتنفس العميق",
      content:
        "التوتر والقلق يرفعان ضغط الدم. خصص 10 دقائق يومياً للتنفس العميق أو التأمل. استنشق ببطء لمدة 4 ثوانٍ، احبس 4 ثوانٍ، وأخرج الهواء ببطء لمدة 6 ثوانٍ.",
      emoji: "🧘",
      foods: ["شاي البابونج", "شاي النعناع"],
      avoid: ["الكافيين الزائد", "التدخين"],
    },
    {
      title: "الثوم صديق الضغط",
      content:
        "الثوم يحتوي على مركبات طبيعية تساعد على خفض ضغط الدم. أضف فص أو فصين من الثوم لطبخك اليومي. الثوم المشوي ألطف على المعدة.",
      emoji: "🧄",
      foods: ["ثوم مشوي", "ثوم طازج مع السلطة", "شوربة ثوم"],
      avoid: [],
    },
    {
      title: "النوم الكافي والضغط",
      content:
        "قلة النوم ترفع ضغط الدم. احرص على النوم 7-8 ساعات يومياً. تجنب الشاشات قبل النوم بساعة واحدة على الأقل.",
      emoji: "😴",
      foods: ["حليب دافئ قبل النوم", "موز"],
      avoid: ["القهوة بعد العصر", "الأكل الثقيل قبل النوم"],
    },
  ],
  obesity: [
    {
      title: "الأكل الصحي مو حرمان",
      content:
        "إنقاص الوزن لا يعني الحرمان من الأكل اللذيذ. السر يكمن في الكميات وطريقة التحضير. بدلاً من القلي، جرّب الشوي أو الطبخ بالفرن. وبدلاً من الإكثار من الأرز الأبيض، قلّل الكمية وأكثر من الخضروات.",
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
      title: "شرب الماء قبل الأكل",
      content:
        "اشرب كوبين من الماء قبل كل وجبة بعشرين دقيقة. هذا يساعدك على الشعور بالشبع أسرع وتناول كمية أقل. والماء أفضل من العصائر والمشروبات الغازية.",
      emoji: "💧",
      foods: ["ماء", "شاي أخضر بدون سكر", "ماء بالليمون والنعناع"],
      avoid: ["مشروبات غازية", "عصائر معلبة", "مشروبات طاقة"],
    },
    {
      title: "الأكل ببطء",
      content:
        "المخ يحتاج 20 دقيقة ليحس بالشبع. كل ببطء وامضغ كويس. ضع الملعقة بين كل لقمة ولقمة. هذا يخليك تاكل أقل وتستمتع أكثر.",
      emoji: "🍽️",
      foods: ["وجبات متوازنة", "سلطة قبل الوجبة الرئيسية"],
      avoid: ["الأكل أمام التلفزيون", "الأكل بسرعة"],
    },
    {
      title: "البروتين يحرق الدهون",
      content:
        "البروتين يزيد الشعور بالشبع ويساعد الجسم على حرق السعرات. اجعل البروتين ربع طبقك في كل وجبة.",
      emoji: "💪",
      foods: ["صدر دجاج", "سمك", "بيض", "عدس", "حمص", "لبن يوناني"],
      avoid: ["اللحوم المقلية", "النقانق والمرتديلا"],
    },
    {
      title: "حجم الطبق مهم",
      content:
        "استخدم أطباق أصغر حجماً. الدراسات تثبت أن الطبق الصغير يخليك تاكل 20-30% أقل بدون ما تحس بالحرمان.",
      emoji: "🥗",
      foods: [],
      avoid: ["الأطباق الكبيرة", "إعادة ملء الطبق"],
    },
  ],
  cholesterol: [
    {
      title: "الدهون الصحية مقابل الضارة",
      content:
        "ليست كل الدهون ضارة! زيت الزيتون والسمك والمكسرات تحتوي على دهون صحية تحمي القلب. لكن الدهون المشبعة مثل السمن والزبدة يجب التقليل منها.",
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
      title: "الشوفان صديق القلب",
      content:
        "الشوفان من أفضل الأطعمة لتقليل الكوليسترول. جرّب إضافته للفطور مع الحليب والفواكه. أو اخلطه مع التمر لفطور صحي ولذيذ.",
      emoji: "🥣",
      foods: ["شوفان بالحليب", "شوفان بالتمر", "شوفان بالفواكه"],
      avoid: [],
    },
    {
      title: "السمك يحمي القلب",
      content:
        "تناول السمك مرتين أسبوعياً يقلل الكوليسترول الضار ويرفع الكوليسترول النافع. السلمون والتونة والسردين من أفضل الأنواع.",
      emoji: "🐟",
      foods: ["سمك مشوي", "سمك مسكوف", "تونة طازجة", "سردين"],
      avoid: ["سمك مقلي", "سمك معلب بالزيت"],
    },
    {
      title: "المكسرات النيئة",
      content:
        "حفنة صغيرة من المكسرات النيئة يومياً (جوز، لوز، فستق) تساعد على خفض الكوليسترول الضار. لكن لا تكثر لأنها عالية السعرات.",
      emoji: "🥜",
      foods: ["جوز (7 حبات)", "لوز (10 حبات)", "فستق حلبي"],
      avoid: ["مكسرات مملحة", "مكسرات محمصة بالزيت"],
    },
    {
      title: "الرياضة والكوليسترول",
      content:
        "المشي السريع 30 دقيقة يومياً يرفع الكوليسترول النافع (HDL) ويخفض الضار (LDL). ابدأ تدريجياً وزد المدة أسبوعياً.",
      emoji: "🏃",
      foods: [],
      avoid: ["الجلوس لفترات طويلة"],
    },
  ],
  none: [
    {
      title: "نصائح عامة للأكل الصحي",
      content:
        "حتى لو لم تكن تعاني من أمراض، فالأكل الصحي مهم لصحتك ولعائلتك. احرص على التنويع في الأكل وشمول جميع المجموعات الغذائية: بروتين، كربوهيدرات، دهون صحية، خضروات وفواكه.",
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
        "اشربي 8 أكواب ماء يومياً على الأقل. الماء يساعد على الهضم، ينظف الجسم من السموم، ويحافظ على نضارة البشرة.",
      emoji: "💧",
      foods: ["ماء", "شاي أعشاب", "ماء بالليمون"],
      avoid: ["مشروبات غازية بكثرة", "كافيين زيادة"],
    },
    {
      title: "التوابل العربية الصحية",
      content:
        "الكركم مضاد للالتهابات، القرفة تنظم السكر، الزنجبيل يساعد الهضم، والحبة السوداء تقوي المناعة. استخدم هذه التوابل في طبخك اليومي.",
      emoji: "🌿",
      foods: ["كركم", "قرفة", "زنجبيل", "حبة سوداء", "كمون"],
      avoid: [],
    },
    {
      title: "الفواكه والخضروات الملونة",
      content:
        "كل لون في الفواكه والخضروات يحتوي على فيتامينات مختلفة. حاول تأكل 5 حصص يومياً من ألوان مختلفة: أحمر (طماطة)، أخضر (سبانخ)، برتقالي (جزر)، بنفسجي (باذنجان).",
      emoji: "🌈",
      foods: ["طماطة", "سبانخ", "جزر", "باذنجان", "فلفل ملون"],
      avoid: ["فواكه معلبة بالشيرة"],
    },
    {
      title: "النوم والصحة",
      content:
        "النوم الكافي (7-8 ساعات) يقوي المناعة، يحسن المزاج، ويساعد على التحكم بالوزن. اجعل غرفة النوم مظلمة وباردة.",
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
              هاي النصائح مبنية على حالتج الصحية اللي اخترتيها. استشيري طبيبج
              دائماً للحصول على نصائح دقيقة.
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
                    أكلات ننصحج بيها:
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

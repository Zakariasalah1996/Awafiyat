import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface SectionCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  route: string;
  emoji: string;
}

const DAILY_TIPS = [
  "شرب كوب ماء دافئ على الريق يساعد على تنشيط الجهاز الهضمي وتحسين عملية الأيض. جرّبها كل صباح ولاحظ الفرق!",
  "التمر من أفضل مصادر الطاقة الطبيعية. ثلاث حبات تمر في الفطور تمنحك طاقة لنصف اليوم!",
  "الخضروات الملونة ليست جميلة المظهر فحسب، بل كل لون يحتوي على فيتامينات مختلفة. نوّع في ألوان طعامك!",
  "المشي 15 دقيقة بعد الغداء يساعد على الهضم ويقلل ارتفاع السكر في الدم.",
  "اللبن (الروب) غني بالبروبيوتيك الذي يقوي المناعة ويحسن الهضم.",
];

const COUNTRY_LABELS: Record<string, string> = {
  iraq: "العراق",
  saudi: "السعودية",
  uae: "الإمارات",
  egypt: "مصر",
};

export default function HomeScreen() {
  const colors = useColors();
  const { profile } = useUser();

  const greeting = profile.name
    ? `أهلاً ${profile.name}`
    : "أهلاً وسهلاً";

  const countryLabel = profile.country ? COUNTRY_LABELS[profile.country] : "";

  const todayTip = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];

  const sections: SectionCard[] = [
    {
      id: "meal-planner",
      title: "ماذا نطبخ اليوم؟",
      subtitle: "نظّم جدول وجباتك اليومية مع التنبيهات",
      icon: "schedule",
      iconColor: "#E8A359",
      bgColor: "#FFF8F0",
      route: "/sections/meal-planner",
      emoji: "📅",
    },
    {
      id: "fridge",
      title: "مواد طازجة",
      subtitle: "أدخل المكونات المتوفرة ونقترح لك وصفات بالذكاء الاصطناعي",
      icon: "kitchen",
      iconColor: "#5D8A3C",
      bgColor: "#F0F7EC",
      route: "/sections/fridge",
      emoji: "🧴",
    },
    {
      id: "leftovers-renew",
      title: "تجديد النعمة",
      subtitle: "الأكلات المتبقية من أمس - حوّلها لوصفة جديدة!",
      icon: "autorenew",
      iconColor: "#E67E22",
      bgColor: "#FFF5EB",
      route: "/sections/leftovers-renew",
      emoji: "🍲",
    },
    {
      id: "shopping-list",
      title: "قائمة التسوق",
      subtitle: "نظّم مشترياتك بسهولة",
      icon: "shopping-cart",
      iconColor: "#7B68EE",
      bgColor: "#F3F0FF",
      route: "/sections/shopping-list",
      emoji: "🛒",
    },
    {
      id: "recipes-library",
      title: "مكتبة الوصفات",
      subtitle: "وصفات سريعة، دسمة، صحية، وحلويات",
      icon: "restaurant",
      iconColor: "#E85D5D",
      bgColor: "#FFF0F0",
      route: "/sections/recipes-library",
      emoji: "📖",
    },
    {
      id: "calorie-calculator",
      title: "حاسبة السعرات الحرارية",
      subtitle: "احسب سعراتك بسهولة",
      icon: "bar-chart",
      iconColor: "#4ECDC4",
      bgColor: "#EEFBFA",
      route: "/sections/calorie-calculator",
      emoji: "⚖️",
    },
    {
      id: "health-tips",
      title: "نصائح ورعاية صحية",
      subtitle: "نصائح غذائية مخصصة لحالتك الصحية",
      icon: "favorite",
      iconColor: "#FF6B9D",
      bgColor: "#FFF0F5",
      route: "/sections/health-tips",
      emoji: "🩺",
    },
    {
      id: "beverages",
      title: "مشروبات وعصائر",
      subtitle: "مشروبات ساخنة وباردة وعصائر طبيعية",
      icon: "local-cafe",
      iconColor: "#8B4513",
      bgColor: "#FFF8F0",
      route: "/sections/beverages",
      emoji: "☕",
    },
  ];

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View
            className="flex-row items-center justify-between"
            style={{ flexDirection: "row-reverse" }}
          >
            <View className="flex-1" style={{ alignItems: "flex-end" }}>
              <Text
                className="text-2xl font-bold text-foreground"
                style={{ textAlign: "right", writingDirection: "rtl" }}
              >
                {greeting}
              </Text>
              <Text
                className="text-base text-muted mt-1"
                style={{ textAlign: "right", writingDirection: "rtl" }}
              >
                ماذا نطبخ اليوم؟ عافية مقدماً
              </Text>
            </View>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 50, height: 50, borderRadius: 12, marginLeft: 12 }}
            />
          </View>

          {/* Country badge */}
          {countryLabel ? (
            <View
              className="mt-2 px-3 py-1.5 rounded-lg self-end flex-row items-center"
              style={{ backgroundColor: `${colors.primary}10`, flexDirection: "row-reverse" }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                {countryLabel === "العراق" ? "🇮🇶" : countryLabel === "السعودية" ? "🇸🇦" : countryLabel === "الإمارات" ? "🇦🇪" : "🇪🇬"} {countryLabel}
              </Text>
            </View>
          ) : null}

          {/* Health badge */}
          {profile.healthCondition !== "none" && (
            <View
              className="mt-3 px-4 py-3 rounded-xl flex-row items-center"
              style={{
                backgroundColor: `${colors.primary}15`,
                flexDirection: "row-reverse",
              }}
            >
              <Text className="text-lg mr-2">🩺</Text>
              <Text
                className="text-sm font-medium flex-1"
                style={{
                  color: colors.primary,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                الوصفات مخصصة لحالتك الصحية (
                {profile.healthCondition === "diabetes"
                  ? "السكري"
                  : profile.healthCondition === "hypertension"
                    ? "ضغط الدم"
                    : profile.healthCondition === "obesity"
                      ? "السمنة"
                      : "الكوليسترول"}
                )
              </Text>
            </View>
          )}
        </View>

        {/* Section Cards */}
        <View className="px-5 gap-4">
          {sections.map((section, index) => (
            <Animated.View
              key={section.id}
              entering={FadeInDown.delay(index * 80).duration(400)}
            >
              <TouchableOpacity
                onPress={() => router.push(section.route as any)}
                className="rounded-2xl p-5 flex-row items-center border"
                style={{
                  backgroundColor: section.bgColor,
                  borderColor: `${section.iconColor}30`,
                  flexDirection: "row-reverse",
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-14 h-14 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: `${section.iconColor}20` }}
                >
                  <Text style={{ fontSize: 28 }}>{section.emoji}</Text>
                </View>
                <View className="flex-1" style={{ alignItems: "flex-end" }}>
                  <Text
                    className="text-lg font-bold text-foreground"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className="text-sm text-muted mt-1"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    {section.subtitle}
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={24} color={colors.muted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Quick Access: Saved Recipes */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} className="px-5 mt-4">
          <TouchableOpacity
            onPress={() => router.push("/sections/saved-recipes" as any)}
            className="rounded-2xl p-4 flex-row items-center border"
            style={{
              backgroundColor: "#FFF5F5",
              borderColor: "#FFD5D5",
              flexDirection: "row-reverse",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24, marginLeft: 12 }}>💝</Text>
            <View className="flex-1" style={{ alignItems: "flex-end" }}>
              <Text
                className="font-bold text-foreground"
                style={{ fontSize: 15, textAlign: "right" }}
              >
                وصفاتي المحفوظة
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                {profile.savedRecipes.length} وصفة محفوظة
              </Text>
            </View>
            <MaterialIcons name="chevron-left" size={20} color={colors.muted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Daily tip */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} className="px-5 mt-4">
          <View
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}20`,
            }}
          >
            <View
              className="flex-row items-center mb-2"
              style={{ flexDirection: "row-reverse" }}
            >
              <Text className="text-lg mr-2">💡</Text>
              <Text
                className="text-base font-bold"
                style={{ color: colors.primary }}
              >
                نصيحة اليوم
              </Text>
            </View>
            <Text
              className="text-sm text-muted leading-6"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              {todayTip}
            </Text>
          </View>
        </Animated.View>

        {/* Subscription Banner (if not subscribed) */}
        {!profile.isSubscribed && (
          <Animated.View entering={FadeInDown.delay(700).duration(400)} className="px-5 mt-4">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/subscription" as any)}
              className="rounded-2xl p-5 items-center"
              style={{
                backgroundColor: "#FFF3E0",
                borderWidth: 1,
                borderColor: "#FFE0B2",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 28 }}>👑</Text>
              <Text
                className="text-foreground font-bold mt-2"
                style={{ fontSize: 16, textAlign: "center" }}
              >
                اشترك في النسخة الكاملة
              </Text>
              <Text
                className="text-muted mt-1"
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  writingDirection: "rtl",
                }}
              >
                جدول أسبوعي كامل + وصفات غير محدودة + ذكاء اصطناعي بلا حدود
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

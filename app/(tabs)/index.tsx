import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import Animated, { FadeInDown } from "react-native-reanimated";

const COUNTRY_LABELS: Record<string, string> = {
  iraq: "🇮🇶 العراق",
  saudi: "🇸🇦 السعودية",
  uae: "🇦🇪 الإمارات",
  egypt: "🇪🇬 مصر",
};

const SECTIONS = [
  { id: "fridge", title: "مكونات ثلاجتي", route: "/sections/fridge", image: require("@/assets/images/feature-cards/fridge-card.jpg") },
  { id: "recipes", title: "مكتبة الوصفات", route: "/sections/recipes-library", image: require("@/assets/images/feature-cards/recipes-card.jpg") },
  { id: "shopping", title: "قائمة التسوق", route: "/sections/shopping-list", image: require("@/assets/images/feature-cards/shopping-card.jpg") },
  { id: "calories", title: "حاسبة السعرات", route: "/sections/calorie-calculator", image: require("@/assets/images/feature-cards/calories-card.jpg") },
  { id: "health", title: "نصائح غذائية", route: "/sections/health-tips", image: require("@/assets/images/feature-cards/health-card.jpg") },
  { id: "beverages", title: "المشروبات والعصائر", route: "/sections/beverages", image: require("@/assets/images/feature-cards/beverages-card.jpg") },
  { id: "saved", title: "وصفاتي المحفوظة", route: "/sections/saved-recipes", image: require("@/assets/images/feature-cards/saved-card.jpg") },
  { id: "community", title: "مجتمع الطبخ", route: "/(tabs)/community", image: require("@/assets/images/feature-cards/community-card.jpg") },
];

export default function HomeScreen() {
  const colors = useColors();
  const { profile } = useUser();
  const { isPremium } = useSubscriptionContext();
  const greeting = profile.name ? `أهلًا بك، ${profile.name}` : "أهلًا بك في ألف عافيات";
  const countryLabel = profile.country ? COUNTRY_LABELS[profile.country] : "";

  return (
    <ScreenContainer className="px-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              <Text style={{ fontSize: 21, fontWeight: "800", color: colors.foreground, textAlign: "right" }}>{greeting}</Text>
              {countryLabel ? (
                <Text style={{ marginTop: 5, color: colors.muted, fontSize: 12 }}>{countryLabel}</Text>
              ) : null}
            </View>
            <Image source={require("@/assets/images/icon.png")} style={{ width: 44, height: 44, borderRadius: 13, marginLeft: 12 }} />
          </View>
          {profile.healthCondition !== "none" ? (
            <View style={{ marginTop: 12, backgroundColor: `${colors.primary}12`, borderRadius: 12, padding: 11 }}>
              <Text style={{ fontSize: 12, lineHeight: 19, textAlign: "right", color: colors.primary }}>
                معلومات غذائية مرتبطة بحالتك الصحية: {profile.healthCondition === "diabetes" ? "السكري" : profile.healthCondition === "hypertension" ? "ضغط الدم" : profile.healthCondition === "obesity" ? "السمنة" : "الكوليسترول"}
              </Text>
            </View>
          ) : null}
        </View>

        <Animated.View entering={FadeInDown.delay(50).duration(350)} style={{ paddingHorizontal: 20, marginBottom: 18 }}>
          <TouchableOpacity
            onPress={() => router.push("/sections/meal-planner" as any)}
            activeOpacity={0.85}
            style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "#F0F7EC", borderWidth: 1, borderColor: "#C8E6C9", flexDirection: "row-reverse", alignItems: "center", padding: 13 }}
          >
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#2E5D1E", textAlign: "right" }}>مخطط الوجبات الأسبوعي</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: "#4F7138", marginTop: 4, textAlign: "right" }}>نظّم وجباتك أسبوعيًا مع تذكيرات مفيدة.</Text>
              <Text style={{ marginTop: 9, color: "#2E5D1E", fontSize: 12, fontWeight: "700" }}>استعرض المخطط ←</Text>
            </View>
            <Image source={require("@/assets/images/feature-cards/planner-card.jpg")} resizeMode="cover" style={{ width: 82, height: 82, borderRadius: 12, marginLeft: 12 }} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.foreground, textAlign: "right", marginBottom: 12 }}>استكشف ألف عافيات</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
            {SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => router.push(section.route as any)}
                accessibilityRole="button"
                accessibilityLabel={section.title}
                activeOpacity={0.75}
                style={{ width: "48%", aspectRatio: 0.98, backgroundColor: colors.surface, borderRadius: 17, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
              >
                <Image source={section.image} resizeMode="cover" style={{ width: "100%", height: "72%" }} />
                <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, textAlign: "center", lineHeight: 20 }} numberOfLines={2}>{section.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {!isPremium ? (
          <Animated.View entering={FadeInDown.delay(200).duration(350)} style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/subscription" as any)}
              activeOpacity={0.85}
              style={{ borderRadius: 16, backgroundColor: "#FFF3E0", borderWidth: 1, borderColor: "#FFE0B2", flexDirection: "row-reverse", alignItems: "center", padding: 14 }}
            >
              <Text style={{ fontSize: 24, marginLeft: 12 }}>✦</Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.foreground, textAlign: "right" }}>اكتشف الاشتراك المميز</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3, textAlign: "right", lineHeight: 18 }}>الوصفات الكاملة وأدوات التخطيط والتذكير.</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

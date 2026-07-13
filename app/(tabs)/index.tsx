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
  { id: "fridge",             emoji: "❄️", title: "ذكاء الثلاجة",    route: "/sections/fridge",             color: "#5D8A3C", bg: "#F0F7EC" },
  { id: "recipes-library",    emoji: "📖", title: "مكتبة الوصفات",   route: "/sections/recipes-library",    color: "#E85D5D", bg: "#FFF0F0" },
  { id: "shopping-list",      emoji: "🛒", title: "قائمة التسوق",    route: "/sections/shopping-list",      color: "#7B68EE", bg: "#F3F0FF" },
  { id: "calorie-calculator", emoji: "⚖️", title: "حاسبة السعرات",  route: "/sections/calorie-calculator", color: "#4ECDC4", bg: "#EEFBFA" },
  { id: "health-tips",        emoji: "🩺", title: "نصائح صحية",      route: "/sections/health-tips",        color: "#FF6B9D", bg: "#FFF0F5" },
  { id: "beverages",          emoji: "☕", title: "مشروبات وعصائر",  route: "/sections/beverages",          color: "#8B4513", bg: "#FFF8F0" },
  { id: "saved-recipes",      emoji: "💝", title: "وصفاتي المحفوظة", route: "/sections/saved-recipes",      color: "#E8A359", bg: "#FFF8F0" },
];

export default function HomeScreen() {
  const colors = useColors();
  const { profile } = useUser();
  const { isPremium } = useSubscriptionContext();

  const greeting = profile.name ? `أهلاً ${profile.name} 👋` : "أهلاً وسهلاً 👋";
  const countryLabel = profile.country ? COUNTRY_LABELS[profile.country] : "";

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground, textAlign: "right" }}>
                {greeting}
              </Text>
              {countryLabel ? (
                <View style={{ flexDirection: "row-reverse", alignItems: "center", marginTop: 4,
                  backgroundColor: `${colors.primary}12`, paddingHorizontal: 10, paddingVertical: 3,
                  borderRadius: 20 }}>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>{countryLabel}</Text>
                </View>
              ) : null}
            </View>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 44, height: 44, borderRadius: 12, marginLeft: 12 }}
            />
          </View>

          {/* Health badge */}
          {profile.healthCondition !== "none" && (
            <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
              backgroundColor: `${colors.primary}12`, flexDirection: "row-reverse", alignItems: "center" }}>
              <Text style={{ fontSize: 14 }}>🩺</Text>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600", marginRight: 6,
                textAlign: "right" }}>
                الوصفات مخصصة لحالتك الصحية (
                {profile.healthCondition === "diabetes" ? "السكري"
                  : profile.healthCondition === "hypertension" ? "ضغط الدم"
                  : profile.healthCondition === "obesity" ? "السمنة"
                  : "الكوليسترول"})
              </Text>
            </View>
          )}
        </View>

        {/* ─── بانر جدولة الطبخ ─── */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.push("/sections/meal-planner" as any)}
            activeOpacity={0.85}
            style={{
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "#F0F7EC",
              borderWidth: 1,
              borderColor: "#C8E6C9",
              flexDirection: "row-reverse",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            {/* النص */}
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#2E5D1E", textAlign: "right" }}>
                جدول الطبخ الأسبوعي 📅
              </Text>
              <Text style={{ fontSize: 12, color: "#5D8A3C", marginTop: 3, textAlign: "right" }}>
                نظّم وجباتك لكل أسبوع مع تنبيهات ذكية
              </Text>
              <View style={{ marginTop: 8, backgroundColor: "#5D8A3C", borderRadius: 20,
                paddingHorizontal: 14, paddingVertical: 5, alignSelf: "flex-end" }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>افتح الجدول ←</Text>
              </View>
            </View>
            {/* الأيقونة */}
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#C8E6C9",
              alignItems: "center", justifyContent: "center", marginLeft: 12 }}>
              <Text style={{ fontSize: 34 }}>🍽️</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── شبكة الأقسام ─── */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)}
          style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {SECTIONS.map((section, i) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => router.push(section.route as any)}
                activeOpacity={0.75}
                style={{
                  width: "47%",
                  aspectRatio: 1.1,
                  backgroundColor: section.bg,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: `${section.color}25`,
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 38, marginBottom: 8 }}>{section.emoji}</Text>
                <Text style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: colors.foreground,
                  textAlign: "center",
                  lineHeight: 18,
                }}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ─── بانر الاشتراك (للغير مشتركين فقط) ─── */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(200).duration(350)}
            style={{ paddingHorizontal: 20, marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/subscription" as any)}
              activeOpacity={0.85}
              style={{
                borderRadius: 16,
                backgroundColor: "#FFF3E0",
                borderWidth: 1,
                borderColor: "#FFE0B2",
                flexDirection: "row-reverse",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 28, marginLeft: 10 }}>👑</Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: "right" }}>
                  اشترك في النسخة الكاملة
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2, textAlign: "right" }}>
                  وصفات غير محدودة + ذكاء اصطناعي + تحذيرات صحية
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

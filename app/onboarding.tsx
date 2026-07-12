import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useUser, type HealthCondition, type Country } from "@/lib/user-context";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import * as Localization from "expo-localization";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function detectCountryFromLocale(): Country {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const tag = locales[0].languageTag?.toLowerCase() ?? "";
      const region = locales[0].regionCode?.toLowerCase() ?? "";
      if (tag.includes("iq") || region === "iq") return "iraq";
      if (tag.includes("sa") || region === "sa") return "saudi";
      if (tag.includes("ae") || region === "ae") return "uae";
      if (tag.includes("eg") || region === "eg") return "egypt";
    }
  } catch (_) {}
  return "iraq";
}

const HEALTH_CONDITIONS: { id: HealthCondition; label: string; emoji: string }[] = [
  { id: "diabetes", label: "السكري", emoji: "🩸" },
  { id: "hypertension", label: "ضغط الدم", emoji: "💓" },
  { id: "obesity", label: "السمنة", emoji: "⚖️" },
  { id: "cholesterol", label: "الكوليسترول", emoji: "🫀" },
  { id: "none", label: "لا أعاني من شيء 💪", emoji: "" },
];

const CONDITION_LABELS: Record<HealthCondition, string> = {
  diabetes: "السكري",
  hypertension: "ضغط الدم",
  obesity: "السمنة",
  cholesterol: "الكوليسترول",
  none: "",
};

const FEATURES = [
  { icon: "📚", label: "مكتبة وصفات" },
  { icon: "❄️", label: "ذكاء الثلاجة" },
  { icon: "🛡️", label: "تحذيرات صحية" },
  { icon: "📅", label: "جدولة وجبات" },
  { icon: "💊", label: "رفيق الدواء" },
  { icon: "💧", label: "رفيق الماء" },
  { icon: "♻️", label: "تجديد النعمة" },
  { icon: "🛒", label: "قائمة التسوق" },
];

export default function OnboardingScreen() {
  const { updateProfile } = useUser();
  const colors = useColors();
  const [customizeStep, setCustomizeStep] = useState<null | "disease" | "offer">(null);
  const [selectedCondition, setSelectedCondition] = useState<HealthCondition>("none");

  useEffect(() => {
    const country = detectCountryFromLocale();
    updateProfile({ country });
  }, []);

  const handleStart = async () => {
    await updateProfile({ onboardingComplete: true });
    router.replace("/(tabs)");
  };

  const handleCustomize = () => {
    setCustomizeStep("disease");
  };

  const handleDiseaseNext = async () => {
    await updateProfile({ healthCondition: selectedCondition });
    setCustomizeStep("offer");
  };

  const handleSubscribe = async () => {
    setCustomizeStep(null);
    await updateProfile({ onboardingComplete: true });
    router.replace("/(tabs)/subscription" as any);
  };

  const handleSkipOffer = async () => {
    setCustomizeStep(null);
    await updateProfile({ onboardingComplete: true });
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── خلفية تدرج لوني بسيط وأنيق ── */}
      <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1 }}>
        <LinearGradient
          colors={["#f0f7f0", "#dcedc8", "#c5e1a5", "#a5d6a7"]}
          locations={[0, 0.35, 0.65, 1]}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
      </Animated.View>

      {/* ── المحتوى ── */}
      <View style={{
        position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
        paddingHorizontal: 28, justifyContent: "center", alignItems: "center",
      }}>
        {/* الشعار */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center", marginTop: -SCREEN_HEIGHT * 0.05 }}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 90, height: 90, borderRadius: 22, marginBottom: 16 }}
          />
          <Text style={{ fontSize: 36, fontWeight: "bold", color: "#2e7d32", textAlign: "center", marginBottom: 6 }}>
            ألف عافيات
          </Text>
          <Text style={{ fontSize: 15, color: "#4a7c59", textAlign: "center", lineHeight: 24, marginBottom: 24 }}>
            نرتب مطبخك وصحتك معاً
          </Text>
        </Animated.View>

        {/* مميزات التطبيق — شبكة أيقونات صغيرة */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ width: "100%", marginBottom: 28 }}>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {FEATURES.map((f) => (
              <View key={f.label} style={{
                alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.75)",
                paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14,
                minWidth: 72,
                shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
                <Text style={{ fontSize: 20, marginBottom: 2 }}>{f.icon}</Text>
                <Text style={{ color: "#333", fontSize: 11, fontWeight: "600" }}>{f.label}</Text>
              </View>
            ))}
          </View>
          {/* والكثير غيرها */}
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <Text style={{ fontSize: 13, color: "#5a8a5a", fontWeight: "600" }}>
              ✨ والكثير غيرها...
            </Text>
          </View>
        </Animated.View>

        {/* الأزرار */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={{ width: "100%", gap: 12 }}>
          {/* زر ابدأ الآن */}
          <TouchableOpacity
            onPress={handleStart}
            style={{
              width: "100%", paddingVertical: 17, borderRadius: 18,
              alignItems: "center", backgroundColor: "#2e7d32",
              shadowColor: "#2e7d32", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#fff", fontSize: 19, fontWeight: "bold" }}>ابدأ الآن</Text>
          </TouchableOpacity>

          {/* زر تخصيص التجربة */}
          <TouchableOpacity
            onPress={handleCustomize}
            style={{
              width: "100%", paddingVertical: 15, borderRadius: 18,
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.7)",
              borderWidth: 1.5, borderColor: "#2e7d32",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#2e7d32", fontSize: 17, fontWeight: "600" }}>✨ تخصيص التجربة</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Modal: سؤال المرض ── */}
      <Modal visible={customizeStep === "disease"} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36,
          }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1a1a1a", textAlign: "center", marginBottom: 6 }}>
              🩺 ما هي حالتك الصحية؟
            </Text>
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20, lineHeight: 22 }}>
              سنخصص لك تحذيرات صحية دقيقة بناءً على حالتك
            </Text>

            <View style={{ gap: 10 }}>
              {HEALTH_CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCondition(c.id)}
                  style={{
                    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selectedCondition === c.id ? colors.primary : "#e5e7eb",
                    backgroundColor: selectedCondition === c.id ? `${colors.primary}12` : "#f9fafb",
                    flexDirection: "row-reverse", alignItems: "center",
                  }}
                  activeOpacity={0.7}
                >
                  {c.emoji !== "" && <Text style={{ fontSize: 22, marginLeft: 10 }}>{c.emoji}</Text>}
                  <Text style={{
                    flex: 1, fontSize: 16, fontWeight: "600", textAlign: "right",
                    color: selectedCondition === c.id ? colors.primary : "#1a1a1a",
                  }}>{c.label}</Text>
                  {selectedCondition === c.id && (
                    <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleDiseaseNext}
              style={{
                marginTop: 20, paddingVertical: 16, borderRadius: 18,
                alignItems: "center", backgroundColor: colors.primary,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkipOffer} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: "#999", fontSize: 14 }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: عرض الاشتراك مع التجربة المجانية ── */}
      <Modal visible={customizeStep === "offer"} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{
              backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
            }}>
              {/* رأس العرض */}
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontSize: 32 }}>💎</Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1a1a1a", textAlign: "center", marginTop: 8 }}>
                  ألف عافيات المميزة
                </Text>
                {selectedCondition !== "none" && (
                  <View style={{
                    marginTop: 10, paddingHorizontal: 16, paddingVertical: 8,
                    backgroundColor: "#FFF3CD", borderRadius: 12,
                  }}>
                    <Text style={{ color: "#856404", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                      🛡️ لديك {CONDITION_LABELS[selectedCondition]} — تحذيراتك الصحية جاهزة!
                    </Text>
                  </View>
                )}
              </View>

              {/* التجربة المجانية */}
              <View style={{
                backgroundColor: "#E8F5E9", borderRadius: 16, padding: 16,
                marginBottom: 20, borderWidth: 1.5, borderColor: colors.primary,
              }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary, textAlign: "center", marginBottom: 4 }}>
                  🎁 3 أيام مجاناً
                </Text>
                <Text style={{ fontSize: 14, color: "#2d6a2d", textAlign: "center", lineHeight: 22 }}>
                  استفد من جميع الميزات مجاناً{"\n"}يمكنك الإلغاء في أي وقت تشاء
                </Text>
              </View>

              {/* قائمة المميزات */}
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#333", textAlign: "right", marginBottom: 12 }}>
                ما ستحصل عليه:
              </Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {[
                  { icon: "🛡️", text: "تحذيرات صحية مخصصة لمرضك" },
                  { icon: "💊", text: "تذكير الأدوية بصوت مخصص" },
                  { icon: "❄️", text: "ذكاء الثلاجة بمحاولات غير محدودة" },
                  { icon: "♻️", text: "تجديد النعمة (5 مرات/يوم)" },
                  { icon: "📅", text: "جدولة الوجبات الأسبوعية" },
                  { icon: "📚", text: "مكتبة وصفات كاملة +250 وصفة" },
                ].map((f) => (
                  <View key={f.text} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                    <Text style={{ flex: 1, fontSize: 15, color: "#333", textAlign: "right" }}>{f.text}</Text>
                  </View>
                ))}
              </View>

              {/* زر الاشتراك */}
              <TouchableOpacity
                onPress={handleSubscribe}
                style={{
                  paddingVertical: 17, borderRadius: 18,
                  alignItems: "center", backgroundColor: colors.primary,
                  marginBottom: 12,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                  ابدأ التجربة المجانية 3 أيام
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3 }}>
                  ثم 5,250 د.ع/شهر • إلغاء في أي وقت
                </Text>
              </TouchableOpacity>

              {/* تخطي */}
              <TouchableOpacity onPress={handleSkipOffer} style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ color: "#999", fontSize: 14 }}>ليس الآن، ابدأ مجاناً</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

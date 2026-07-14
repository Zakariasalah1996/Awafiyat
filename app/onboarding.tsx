import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useUser, type HealthCondition, type Country } from "@/lib/user-context";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
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

// كل الميزات في مصفوفة واحدة - 8 ميزات في صفين (4+4)
const ALL_FEATURES = [
  { icon: "📚", label: "مكتبة وصفات" },
  { icon: "❄️", label: "ذكاء الثلاجة" },
  { icon: "🛡️", label: "تحذيرات صحية" },
  { icon: "📅", label: "جدولة وجبات" },
  { icon: "💊", label: "تذكير الدواء" },
  { icon: "💧", label: "تذكير الماء" },
  { icon: "♻️", label: "تجديد النعمة" },
  { icon: "🛒", label: "قائمة التسوق" },
];

export default function OnboardingScreen() {
  const { updateProfile } = useUser();
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
    <View style={styles.container}>
      {/* خلفية صورة المطبخ */}
      <ExpoImage
        source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663550643615/MMvdQJEHVXpvsqF4pAkPm2/onboarding-bg-Qgx2aFCsiFwY3vkx3FkPh9.webp" }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.22)" }]} />

      {/* المحتوى الرئيسي - بدون ScrollView */}
      <View style={styles.content}>

        {/* الشعار والعنوان */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.logoSection}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logoImage}
          />
          <Text style={styles.mainTitle}>ألف عافيات</Text>
          <Text style={styles.subtitle}>🌿 نرتّب مطبخك وصحتك معاً 🌿</Text>
        </Animated.View>

        {/* شبكة الميزات - صفين (4+4) */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.featuresGrid}>
          {ALL_FEATURES.map((f, i) => (
            <View key={f.label} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* والكثير غيرها */}
        <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.moreSection}>
          <Text style={styles.moreText}>💚 والكثير غيرها... 💚</Text>
        </Animated.View>

        {/* الأزرار */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.buttonsSection}>
          {/* زر ابدأ الآن */}
          <TouchableOpacity onPress={handleStart} style={styles.startButton} activeOpacity={0.85}>
            <LinearGradient
              colors={["#4caf50", "#2e7d32", "#1b5e20"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>🌿 ابدأ الآن 🍃</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* زر تخصيص التجربة */}
          <TouchableOpacity onPress={handleCustomize} style={styles.customizeButton} activeOpacity={0.8}>
            <Text style={styles.customizeButtonText}>✨ تخصيص التجربة</Text>
          </TouchableOpacity>

          {/* نص الخصوصية */}
          <View style={styles.privacyRow}>
            <Text style={{ fontSize: 18 }}>🛡️</Text>
            <Text style={styles.privacyText}>بياناتك آمنة وسرّية 100%</Text>
          </View>
        </Animated.View>
      </View>

      {/* ── Modal: سؤال المرض ── */}
      <Modal visible={customizeStep === "disease"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🩺 ما هي حالتك الصحية؟</Text>
            <Text style={styles.modalSubtitle}>
              سنخصص لك تحذيرات صحية دقيقة بناءً على حالتك
            </Text>

            <View style={{ gap: 8 }}>
              {HEALTH_CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCondition(c.id)}
                  style={[
                    styles.conditionOption,
                    {
                      borderColor: selectedCondition === c.id ? "#2e7d32" : "#e5e7eb",
                      backgroundColor: selectedCondition === c.id ? "#e8f5e9" : "#f9fafb",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {c.emoji !== "" && <Text style={{ fontSize: 20, marginLeft: 8 }}>{c.emoji}</Text>}
                  <Text style={[
                    styles.conditionLabel,
                    { color: selectedCondition === c.id ? "#2e7d32" : "#1a1a1a" },
                  ]}>{c.label}</Text>
                  {selectedCondition === c.id && (
                    <Text style={{ color: "#2e7d32", fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleDiseaseNext} style={styles.modalButton} activeOpacity={0.85}>
              <Text style={styles.modalButtonText}>متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkipOffer} style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={{ color: "#999", fontSize: 14 }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: عرض الاشتراك - بدون ScrollView ── */}
      <Modal visible={customizeStep === "offer"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.offerModalContent}>
            {/* الرأس */}
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>💎</Text>
              <Text style={styles.modalTitle}>ألف عافيات المميزة</Text>
              {selectedCondition !== "none" && (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionBadgeText}>
                    🛡️ لديك {CONDITION_LABELS[selectedCondition]} — تحذيراتك جاهزة!
                  </Text>
                </View>
              )}
            </View>

            {/* شارة التجربة المجانية */}
            <View style={styles.trialBadge}>
              <Text style={styles.trialTitle}>🎁 3 أيام مجاناً</Text>
              <Text style={styles.trialSubtitle}>استفد من جميع الميزات • إلغاء في أي وقت</Text>
            </View>

            {/* قائمة الميزات - مضغوطة */}
            <View style={{ gap: 7, marginBottom: 16 }}>
              {[
                { icon: "🛡️", text: "تحذيرات صحية مخصصة لمرضك" },
                { icon: "💊", text: "تذكير الأدوية بصوت مخصص" },
                { icon: "❄️", text: "ذكاء الثلاجة بمحاولات غير محدودة" },
                { icon: "♻️", text: "تجديد النعمة (5 مرات/يوم)" },
                { icon: "📅", text: "جدولة الوجبات الأسبوعية" },
                { icon: "📚", text: "مكتبة وصفات كاملة +250 وصفة" },
              ].map((f) => (
                <View key={f.text} style={styles.offerItem}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                  <Text style={styles.offerItemText}>{f.text}</Text>
                </View>
              ))}
            </View>

            {/* زر الاشتراك */}
            <TouchableOpacity onPress={handleSubscribe} style={styles.subscribeButton} activeOpacity={0.85}>
              <Text style={styles.subscribeButtonText}>ابدأ التجربة المجانية 3 أيام</Text>
              <Text style={styles.subscribeButtonSub}>ثم 5,250 د.ع/شهر • إلغاء في أي وقت</Text>
            </TouchableOpacity>

            {/* تخطي */}
            <TouchableOpacity onPress={handleSkipOffer} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: "#999", fontSize: 14 }}>ليس الآن، ابدأ مجاناً</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: SCREEN_HEIGHT * 0.06,
    paddingBottom: SCREEN_HEIGHT * 0.04,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2e7d32",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#5a8a5a",
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  featureCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    width: (SCREEN_WIDTH - 40 - 8 * 3) / 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  featureIcon: {
    fontSize: 22,
    marginBottom: 3,
  },
  featureLabel: {
    color: "#333",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  moreSection: {
    alignItems: "center",
  },
  moreText: {
    fontSize: 13,
    color: "#5a8a5a",
    fontWeight: "600",
  },
  buttonsSection: {
    width: "100%",
    gap: 10,
  },
  startButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#2e7d32",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  startButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  customizeButton: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    elevation: 2,
  },
  customizeButtonText: {
    color: "#2e7d32",
    fontSize: 15,
    fontWeight: "600",
  },
  privacyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  privacyText: {
    fontSize: 12,
    color: "#5a8a5a",
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  offerModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  conditionOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  conditionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#2e7d32",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  conditionBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#FFF3CD",
    borderRadius: 10,
  },
  conditionBadgeText: {
    color: "#856404",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  trialBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#2e7d32",
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
    textAlign: "center",
    marginBottom: 2,
  },
  trialSubtitle: {
    fontSize: 12,
    color: "#2d6a2d",
    textAlign: "center",
  },
  offerItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  offerItemText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    textAlign: "right",
  },
  subscribeButton: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#2e7d32",
    marginBottom: 4,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  subscribeButtonSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
});

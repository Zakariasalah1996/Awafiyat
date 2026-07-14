import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
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

const FEATURES_ROW1 = [
  { icon: "📚", label: "مكتبة وصفات" },
  { icon: "❄️", label: "ذكاء الثلاجة" },
  { icon: "🛡️", label: "تحذيرات صحية" },
];

const FEATURES_ROW2 = [
  { icon: "📅", label: "جدولة وجبات" },
  { icon: "💊", label: "تذكير الدواء" },
  { icon: "💧", label: "تذكير الماء" },
  { icon: "♻️", label: "تجديد النعمة" },
];

const FEATURES_ROW3 = [
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

  const renderFeatureCard = (feature: { icon: string; label: string }, delay: number) => (
    <Animated.View
      key={feature.label}
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.featureCard}
    >
      <Text style={styles.featureIcon}>{feature.icon}</Text>
      <Text style={styles.featureLabel}>{feature.label}</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* ── خلفية دافئة ── */}
      <LinearGradient
        colors={["#f7f3eb", "#f0ebe0", "#e8e4d8", "#f0ebe0", "#f7f3eb"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* زخرفة أوراق خضراء أعلى */}
      <View style={styles.topDecoration}>
        <Text style={styles.leafDecor}>🌿</Text>
        <Text style={[styles.leafDecor, { marginLeft: 20 }]}>🍃</Text>
        <Text style={[styles.leafDecor, { marginLeft: -10, marginTop: 10 }]}>🌱</Text>
      </View>

      {/* المحتوى الرئيسي */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* الشعار */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoSection}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logoImage}
          />
          <Text style={styles.mainTitle}>ألف عافيات</Text>
          <Text style={styles.subtitle}>🌿 نرتّب مطبخك وصحتك معاً 🌿</Text>
        </Animated.View>

        {/* قلب أخضر يسار */}
        <View style={styles.heartLeft}>
          <Text style={styles.heartText}>💚</Text>
        </View>

        {/* شبكة الميزات - صف أول (3) */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.featuresRow}>
          {FEATURES_ROW1.map((f, i) => renderFeatureCard(f, 300 + i * 80))}
        </Animated.View>

        {/* شبكة الميزات - صف ثاني (4) */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.featuresRow}>
          {FEATURES_ROW2.map((f, i) => renderFeatureCard(f, 500 + i * 80))}
        </Animated.View>

        {/* شبكة الميزات - صف ثالث (1) */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.featuresRow}>
          {FEATURES_ROW3.map((f, i) => renderFeatureCard(f, 700 + i * 80))}
        </Animated.View>

        {/* قلب أخضر يمين */}
        <View style={styles.heartRight}>
          <Text style={styles.heartText}>💚</Text>
        </View>

        {/* والكثير غيرها */}
        <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.moreSection}>
          <Text style={styles.moreText}>💚 والكثير غيرها... 💚</Text>
        </Animated.View>

        {/* الأزرار */}
        <Animated.View entering={FadeInUp.delay(900).duration(500)} style={styles.buttonsSection}>
          {/* زر ابدأ الآن */}
          <TouchableOpacity
            onPress={handleStart}
            style={styles.startButton}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#4caf50", "#2e7d32", "#1b5e20"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>ابدأ الآن</Text>
              <View style={styles.buttonLeafLeft}>
                <Text style={{ fontSize: 14 }}>🌿</Text>
              </View>
              <View style={styles.buttonLeafRight}>
                <Text style={{ fontSize: 14 }}>🍃</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* زر تخصيص التجربة */}
          <TouchableOpacity
            onPress={handleCustomize}
            style={styles.customizeButton}
            activeOpacity={0.8}
          >
            <Text style={styles.customizeButtonText}>✨ تخصيص التجربة</Text>
          </TouchableOpacity>

          {/* نص الخصوصية */}
          <View style={styles.privacySection}>
            <View style={styles.privacyRow}>
              <View style={styles.shieldIcon}>
                <Text style={{ fontSize: 28 }}>🛡️</Text>
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyTitle}>بياناتك آمنة وسرّية 100%</Text>
                <Text style={styles.privacySubtitle}>نحمي خصوصيتك ونضع صحتك في المقام الأول</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* زخرفة أسفل */}
      <View style={styles.bottomDecoration}>
        <Text style={styles.bottomLeaf}>🥬</Text>
        <Text style={[styles.bottomLeaf, { marginLeft: 15 }]}>🍅</Text>
        <Text style={[styles.bottomLeaf, { marginLeft: 10 }]}>🫑</Text>
      </View>

      {/* ── Modal: سؤال المرض ── */}
      <Modal visible={customizeStep === "disease"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🩺 ما هي حالتك الصحية؟</Text>
            <Text style={styles.modalSubtitle}>
              سنخصص لك تحذيرات صحية دقيقة بناءً على حالتك
            </Text>

            <View style={{ gap: 10 }}>
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
                  {c.emoji !== "" && <Text style={{ fontSize: 22, marginLeft: 10 }}>{c.emoji}</Text>}
                  <Text style={[
                    styles.conditionLabel,
                    { color: selectedCondition === c.id ? "#2e7d32" : "#1a1a1a" },
                  ]}>{c.label}</Text>
                  {selectedCondition === c.id && (
                    <Text style={{ color: "#2e7d32", fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleDiseaseNext}
              style={styles.modalButton}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkipOffer} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: "#999", fontSize: 14 }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: عرض الاشتراك ── */}
      <Modal visible={customizeStep === "offer"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontSize: 32 }}>💎</Text>
                <Text style={styles.modalTitle}>ألف عافيات المميزة</Text>
                {selectedCondition !== "none" && (
                  <View style={styles.conditionBadge}>
                    <Text style={styles.conditionBadgeText}>
                      🛡️ لديك {CONDITION_LABELS[selectedCondition]} — تحذيراتك الصحية جاهزة!
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.trialBadge}>
                <Text style={styles.trialTitle}>🎁 3 أيام مجاناً</Text>
                <Text style={styles.trialSubtitle}>
                  استفد من جميع الميزات مجاناً{"\n"}يمكنك الإلغاء في أي وقت تشاء
                </Text>
              </View>

              <Text style={styles.offerListTitle}>ما ستحصل عليه:</Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {[
                  { icon: "🛡️", text: "تحذيرات صحية مخصصة لمرضك" },
                  { icon: "💊", text: "تذكير الأدوية بصوت مخصص" },
                  { icon: "❄️", text: "ذكاء الثلاجة بمحاولات غير محدودة" },
                  { icon: "♻️", text: "تجديد النعمة (5 مرات/يوم)" },
                  { icon: "📅", text: "جدولة الوجبات الأسبوعية" },
                  { icon: "📚", text: "مكتبة وصفات كاملة +250 وصفة" },
                ].map((f) => (
                  <View key={f.text} style={styles.offerItem}>
                    <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                    <Text style={styles.offerItemText}>{f.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleSubscribe}
                style={styles.subscribeButton}
                activeOpacity={0.85}
              >
                <Text style={styles.subscribeButtonText}>ابدأ التجربة المجانية 3 أيام</Text>
                <Text style={styles.subscribeButtonSub}>ثم 5,250 د.ع/شهر • إلغاء في أي وقت</Text>
              </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topDecoration: {
    position: "absolute",
    top: 40,
    left: 20,
    flexDirection: "row",
    opacity: 0.6,
    zIndex: 1,
  },
  leafDecor: {
    fontSize: 28,
  },
  bottomDecoration: {
    position: "absolute",
    bottom: 20,
    left: 20,
    flexDirection: "row",
    opacity: 0.5,
  },
  bottomLeaf: {
    fontSize: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: 30,
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#2e7d32",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#5a8a5a",
    textAlign: "center",
    lineHeight: 24,
  },
  heartLeft: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.22,
    right: 10,
    opacity: 0.6,
  },
  heartRight: {
    alignSelf: "flex-start",
    marginLeft: 10,
    opacity: 0.6,
    marginTop: -5,
    marginBottom: 5,
  },
  heartText: {
    fontSize: 18,
  },
  featuresRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
    width: "100%",
  },
  featureCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 76,
    maxWidth: 86,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  featureIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  featureLabel: {
    color: "#333",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  moreSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  moreText: {
    fontSize: 14,
    color: "#5a8a5a",
    fontWeight: "600",
  },
  buttonsSection: {
    width: "100%",
    gap: 12,
  },
  startButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#2e7d32",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  startButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    position: "relative",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  buttonLeafLeft: {
    position: "absolute",
    left: 16,
    top: "50%",
    marginTop: -7,
  },
  buttonLeafRight: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -7,
  },
  customizeButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  customizeButtonText: {
    color: "#2e7d32",
    fontSize: 17,
    fontWeight: "600",
  },
  privacySection: {
    width: "100%",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.05)",
  },
  privacyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTextContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e7d32",
    textAlign: "right",
    marginBottom: 2,
  },
  privacySubtitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
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
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  conditionOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  conditionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#2e7d32",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  conditionBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
  },
  conditionBadgeText: {
    color: "#856404",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  trialBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#2e7d32",
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e7d32",
    textAlign: "center",
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 14,
    color: "#2d6a2d",
    textAlign: "center",
    lineHeight: 22,
  },
  offerListTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    textAlign: "right",
    marginBottom: 12,
  },
  offerItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  offerItemText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    textAlign: "right",
  },
  subscribeButton: {
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#2e7d32",
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  subscribeButtonSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 3,
  },
});

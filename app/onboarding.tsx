import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  I18nManager,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser, type HealthCondition, type Country } from "@/lib/user-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import * as Localization from "expo-localization";

// Force RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * يكتشف الدولة تلقائياً من إعدادات الجهاز (Locale)
 * ar-IQ → العراق | ar-SA → السعودية | ar-AE → الإمارات | ar-EG → مصر
 * أي دولة أخرى → العراق كافتراضي
 */
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
  // افتراضي: العراق
  return "iraq";
}

const HEALTH_CONDITIONS: { id: HealthCondition; label: string; emoji: string }[] = [
  { id: "diabetes", label: "السكري", emoji: "🩸" },
  { id: "hypertension", label: "ضغط الدم", emoji: "💓" },
  { id: "obesity", label: "السمنة", emoji: "⚖️" },
  { id: "cholesterol", label: "الكوليسترول", emoji: "🫀" },
  { id: "none", label: "لا أعاني من شيء 💪", emoji: "" },
];

export default function OnboardingScreen() {
  const { updateProfile } = useUser();
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [selectedCondition, setSelectedCondition] = useState<HealthCondition>("none");

  // كشف الدولة تلقائياً عند تحميل الشاشة
  useEffect(() => {
    const country = detectCountryFromLocale();
    updateProfile({ country });
  }, []);

  const handleStart = () => {
    setStep(1);
  };

  const finishOnboarding = async (condition: HealthCondition) => {
    await updateProfile({
      healthCondition: condition,
      onboardingComplete: true,
    });
    router.replace("/(tabs)");
  };

  // ─── Step 0: شاشة الترحيب ───
  if (step === 0) {
    return (
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1 }}>
          <Image
            source={require("@/assets/images/welcome-hero.jpg")}
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              position: "absolute",
              top: 0,
              left: 0,
            }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
            locations={[0, 0.25, 0.55, 0.85]}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
        </Animated.View>

        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center", marginTop: -SCREEN_HEIGHT * 0.12 }}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{
                width: 110,
                height: 110,
                borderRadius: 26,
                marginBottom: 24,
              }}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 42,
                fontWeight: "bold",
                color: "#FFFFFF",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              ألف عافيات
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.9)",
                textAlign: "center",
                lineHeight: 32,
              }}
            >
              أهلاً وسهلاً بك{"\n"}حيث نُطعم أجسادنا بالصحة والمحبة
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(700).duration(500)} style={{ marginTop: 40, width: "100%" }}>
            <TouchableOpacity
              onPress={handleStart}
              style={{
                width: "100%",
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: "center",
                backgroundColor: colors.primary,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "bold" }}>
                لنبدأ
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ─── Step 1: اختيار الحالة الصحية (مدمج مع نعم/لا) ───
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32, paddingVertical: 24 }}
        className="bg-background"
      >
        <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
          <Text className="text-5xl mb-4">🩺</Text>
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            ما هي حالتك الصحية؟
          </Text>
          <Text className="text-base text-muted text-center mb-8 leading-7">
            سنخصص لك وصفات وتحذيرات صحية مناسبة
          </Text>

          <View className="w-full gap-3">
            {HEALTH_CONDITIONS.map((condition) => (
              <TouchableOpacity
                key={condition.id}
                onPress={() => setSelectedCondition(condition.id)}
                className="w-full py-4 px-6 rounded-2xl border-2"
                style={{
                  borderColor:
                    selectedCondition === condition.id ? colors.primary : colors.border,
                  backgroundColor:
                    selectedCondition === condition.id ? `${colors.primary}15` : colors.surface,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                {condition.emoji !== "" && (
                  <Text style={{ fontSize: 24, marginLeft: 12 }}>{condition.emoji}</Text>
                )}
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "600",
                    flex: 1,
                    color: selectedCondition === condition.id ? colors.primary : colors.foreground,
                    textAlign: "right",
                  }}
                >
                  {condition.label}
                </Text>
                {selectedCondition === condition.id && (
                  <Text style={{ color: colors.primary, fontSize: 20, marginRight: 4 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => finishOnboarding(selectedCondition)}
            className="w-full py-4 rounded-2xl items-center mt-8"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">ابدأ الآن</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => finishOnboarding("none")}
            className="mt-4 py-2"
            activeOpacity={0.7}
          >
            <Text className="text-base text-muted">تخطي</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

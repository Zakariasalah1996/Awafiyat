import { useState } from "react";
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

// Force RTL - only if not already set to prevent restart loop
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COUNTRIES: { id: Country; label: string; flag: string }[] = [
  { id: "iraq", label: "العراق", flag: "🇮🇶" },
  { id: "saudi", label: "السعودية", flag: "🇸🇦" },
  { id: "uae", label: "الإمارات", flag: "🇦🇪" },
  { id: "egypt", label: "مصر", flag: "🇪🇬" },
];

const HEALTH_CONDITIONS: { id: HealthCondition; label: string; emoji: string }[] = [
  { id: "diabetes", label: "السكري", emoji: "🩸" },
  { id: "hypertension", label: "ضغط الدم", emoji: "💓" },
  { id: "obesity", label: "السمنة", emoji: "⚖️" },
  { id: "cholesterol", label: "الكوليسترول", emoji: "🫀" },
  { id: "none", label: "لا أعاني من شيء", emoji: "💪" },
];

const FEATURES = [
  { emoji: "📚", label: "مكتبة وصفات" },
  { emoji: "❄️", label: "ذكاء الثلاجة" },
  { emoji: "🛡️", label: "تحذيرات صحية" },
  { emoji: "📅", label: "جدولة وجبات" },
  { emoji: "💊", label: "رفيق الدواء" },
  { emoji: "💧", label: "رفيق الماء" },
  { emoji: "♻️", label: "تجديد النعمة" },
  { emoji: "🛒", label: "قائمة التسوق" },
];

export default function OnboardingScreen() {
  const { updateProfile } = useUser();
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<Country>("");
  const [hasCondition, setHasCondition] = useState<boolean | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<HealthCondition>("none");

  const handleStart = () => {
    setStep(1);
  };

  const handleCustomize = () => {
    setStep(1);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  const handleCountryContinue = async () => {
    await updateProfile({ country: selectedCountry });
    setStep(2);
  };

  const handleConditionAnswer = (answer: boolean) => {
    setHasCondition(answer);
    if (answer) {
      setStep(3);
    } else {
      finishOnboarding("none");
    }
  };

  const handleSelectCondition = (condition: HealthCondition) => {
    setSelectedCondition(condition);
  };

  const finishOnboarding = async (condition: HealthCondition) => {
    await updateProfile({
      healthCondition: condition,
      onboardingComplete: true,
    });
    if (condition !== "none") {
      router.replace("/sections/wellness/medication-setup" as any);
    } else {
      router.replace("/(tabs)");
    }
  };

  // Step 0: Welcome - تدرج أخضر بسيط مع أيقونات الميزات
  if (step === 0) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#e8f5e9", "#c8e6c9", "#a5d6a7", "#81c784"]}
          locations={[0, 0.3, 0.6, 1]}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* الشعار */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center" }}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{
                width: 100,
                height: 100,
                borderRadius: 22,
                marginBottom: 16,
              }}
            />
          </Animated.View>

          {/* اسم التطبيق */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "bold",
                color: "#2e7d32",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              ألف عافيات
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#4a7c4f",
                textAlign: "center",
                marginBottom: 28,
              }}
            >
              نرتب مطبخك وصحتك معاً
            </Text>
          </Animated.View>

          {/* أيقونات الميزات - 8 أيقونات في صفين */}
          <Animated.View entering={FadeIn.delay(600).duration(500)} style={{ width: "100%", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
              {FEATURES.map((feature, index) => (
                <View
                  key={index}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(46,125,50,0.2)",
                  }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 2 }}>{feature.emoji}</Text>
                  <Text style={{ fontSize: 9, color: "#2e7d32", fontWeight: "600", textAlign: "center" }}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ textAlign: "center", color: "#4a7c4f", fontSize: 13, marginTop: 10 }}>
              ✨ والكثير غيرها...
            </Text>
          </Animated.View>

          {/* الأزرار */}
          <Animated.View entering={FadeInUp.delay(800).duration(500)} style={{ width: "100%", marginTop: 24 }}>
            <TouchableOpacity
              onPress={handleStart}
              style={{
                width: "100%",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                backgroundColor: "#2e7d32",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>
                ابدأ الآن
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCustomize}
              style={{
                width: "100%",
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.8)",
                marginTop: 12,
                borderWidth: 1,
                borderColor: "rgba(46,125,50,0.3)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#2e7d32", fontSize: 16, fontWeight: "600" }}>
                ✨ تخصيص التجربة
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Step 1: Country selection
  if (step === 1) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 bg-background items-center justify-center px-8">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text className="text-6xl mb-6">🌍</Text>
            <Text className="text-2xl font-bold text-foreground text-center mb-3">
              اختر دولتك
            </Text>
            <Text className="text-base text-muted text-center mb-10 leading-7">
              سنعرض لك الوصفات المناسبة لمطبخ بلدك أولاً
            </Text>

            <View className="w-full gap-3">
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  onPress={() => handleCountrySelect(country.id)}
                  className="w-full py-4 px-6 rounded-2xl flex-row items-center border-2"
                  style={{
                    borderColor:
                      selectedCountry === country.id ? colors.primary : colors.border,
                    backgroundColor:
                      selectedCountry === country.id ? `${colors.primary}15` : colors.surface,
                    flexDirection: "row-reverse",
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-3xl ml-4">{country.flag}</Text>
                  <Text
                    className="text-lg font-semibold flex-1"
                    style={{
                      color:
                        selectedCountry === country.id ? colors.primary : colors.foreground,
                      textAlign: "right",
                    }}
                  >
                    {country.label}
                  </Text>
                  {selectedCountry === country.id && (
                    <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCountryContinue}
              className="w-full py-4 rounded-2xl items-center mt-8"
              style={{
                backgroundColor:
                  selectedCountry !== "" ? colors.primary : colors.muted,
              }}
              activeOpacity={0.8}
              disabled={selectedCountry === ""}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // Step 2: Health question
  if (step === 2) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 bg-background items-center justify-center px-8">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text className="text-6xl mb-6">🩺</Text>
            <Text className="text-2xl font-bold text-foreground text-center mb-3">
              هل تعاني من أي حالة صحية مزمنة؟
            </Text>
            <Text className="text-base text-muted text-center mb-10 leading-7">
              هذا يساعدنا في اقتراح وصفات تناسب صحتك
            </Text>

            <View className="w-full gap-4">
              <TouchableOpacity
                onPress={() => handleConditionAnswer(true)}
                className="w-full py-4 rounded-2xl items-center border-2"
                style={{ borderColor: colors.primary, backgroundColor: "transparent" }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  نعم، أعاني من حالة صحية
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleConditionAnswer(false)}
                className="w-full py-4 rounded-2xl items-center"
                style={{ backgroundColor: colors.primary }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-bold">
                  لا، الحمد لله بخير
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // Step 3: Select condition
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}
        className="bg-background"
      >
        <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            حدد نوع الحالة الصحية
          </Text>
          <Text className="text-base text-muted text-center mb-8 leading-7">
            لا تقلق، سنساعدك بوصفات تناسب حالتك
          </Text>

          <View className="w-full gap-3">
            {HEALTH_CONDITIONS.filter((c) => c.id !== "none").map((condition) => (
              <TouchableOpacity
                key={condition.id}
                onPress={() => handleSelectCondition(condition.id)}
                className="w-full py-4 px-6 rounded-2xl flex-row items-center border-2"
                style={{
                  borderColor:
                    selectedCondition === condition.id ? colors.primary : colors.border,
                  backgroundColor:
                    selectedCondition === condition.id ? `${colors.primary}15` : colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text className="text-2xl ml-4">{condition.emoji}</Text>
                <Text
                  className="text-lg font-semibold flex-1"
                  style={{
                    color:
                      selectedCondition === condition.id ? colors.primary : colors.foreground,
                  }}
                >
                  {condition.label}
                </Text>
                {selectedCondition === condition.id && (
                  <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => finishOnboarding(selectedCondition)}
            className="w-full py-4 rounded-2xl items-center mt-8"
            style={{
              backgroundColor:
                selectedCondition !== "none" ? colors.primary : colors.muted,
            }}
            activeOpacity={0.8}
            disabled={selectedCondition === "none"}
          >
            <Text className="text-white text-lg font-bold">متابعة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => finishOnboarding("none")}
            className="mt-4 py-2"
            activeOpacity={0.7}
          >
            <Text className="text-base text-muted underline">تخطي هذه الخطوة</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

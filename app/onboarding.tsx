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

// Force RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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
    router.replace("/(tabs)");
  };

  // Step 0: Welcome - تصميم مبهر
  if (step === 0) {
    return (
      <View style={{ flex: 1 }}>
        {/* صورة الخلفية */}
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
          {/* تدرج لوني يغطي الشاشة بالكامل */}
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

        {/* المحتوى فوق الصورة - يملأ الشاشة بالكامل */}
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
          {/* الشعار - في الأعلى */}
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

          {/* النص - أكبر وفي الوسط */}
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

          {/* زر لنبدأ - في وسط الشاشة بالضبط */}
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

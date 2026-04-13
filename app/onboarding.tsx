import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  I18nManager,
  Image,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser, type HealthCondition } from "@/lib/user-context";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

// Force RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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
  const [hasCondition, setHasCondition] = useState<boolean | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<HealthCondition>("none");

  const handleStart = () => {
    setStep(1);
  };

  const handleConditionAnswer = (answer: boolean) => {
    setHasCondition(answer);
    if (answer) {
      setStep(2);
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

  // Step 0: Welcome
  if (step === 0) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 bg-background items-center justify-center px-8">
          <Animated.View entering={FadeInDown.duration(600)} className="items-center">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 140, height: 140, borderRadius: 28 }}
            />
            <Text className="text-4xl font-bold text-foreground mt-6 text-center">
              ألف عافيات
            </Text>
            <Text className="text-lg text-muted mt-4 text-center leading-8">
              أهلاً وسهلاً بك{"\n"}حيث نُطعم أجسادنا بالصحة والمحبة
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)} className="w-full mt-12">
            <TouchableOpacity
              onPress={handleStart}
              className="w-full py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">يلا نبدأ</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // Step 1: Health question
  if (step === 1) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 bg-background items-center justify-center px-8">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text className="text-6xl mb-6">🩺</Text>
            <Text className="text-2xl font-bold text-foreground text-center mb-3">
              هل تعاني من أي عارض صحي مزمن؟
            </Text>
            <Text className="text-base text-muted text-center mb-10 leading-7">
              هذا يساعدنا نقترح عليك وصفات تناسب صحتك
            </Text>

            <View className="w-full gap-4">
              <TouchableOpacity
                onPress={() => handleConditionAnswer(true)}
                className="w-full py-4 rounded-2xl items-center border-2"
                style={{ borderColor: colors.primary, backgroundColor: "transparent" }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  نعم، أعاني من شيء
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

  // Step 2: Select condition
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
            لا تشيل هم، راح نساعدك بوصفات تناسبك
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

import { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useMedication } from "@/lib/medication-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

/**
 * تدفق إعداد رفيق الدواء - الشاشات الإنسانية
 * Step 0: السؤال الإنساني الأول (هل تتناول أدوية؟)
 * Step 1: ربط الدواء بالوجبات (هل تريد تذكيرك؟)
 * Step 2: رسالة النجاح (لا يتناول أدوية)
 */
export default function MedicationSetupScreen() {
  const colors = useColors();
  const { setSetupComplete, setTakesMedication } = useMedication();
  const [step, setStep] = useState(0);

  // الخطوة 0: السؤال الإنساني
  if (step === 0) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8 bg-background">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💚</Text>
            <Text
              className="text-lg text-muted text-center mb-2 leading-7"
              style={{ writingDirection: "rtl" }}
            >
              شفاك الله وعافاك، وجعلك دائماً في ألف عافية.
            </Text>
            <Text
              className="text-base text-muted text-center mb-10 leading-7"
              style={{ writingDirection: "rtl" }}
            >
              قبل أن نكمل، لدينا سؤال بسيط:
            </Text>

            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              هل تتناول أي أدوية بشكل منتظم؟
            </Text>

            <View className="w-full gap-4">
              <TouchableOpacity
                onPress={() => {
                  setTakesMedication(true);
                  setStep(1);
                }}
                className="w-full py-4 rounded-2xl items-center border-2"
                style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  💊 نعم، أتناول أدوية
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTakesMedication(false);
                  setStep(2);
                }}
                className="w-full py-4 rounded-2xl items-center"
                style={{ backgroundColor: colors.primary }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-bold">
                  💚 لا، لا أتناول أدوية
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // الخطوة 1: ربط الدواء بالوجبات
  if (step === 1) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8 bg-background">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🥗</Text>
            <Text
              className="text-base text-muted text-center mb-4 leading-7"
              style={{ writingDirection: "rtl" }}
            >
              بما أننا سنخطط لوجباتك، نود أن نسألك:
            </Text>

            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              هل ترغب في تذكيرك بمواعيد أدويتك؟
            </Text>

            <View className="w-full gap-4">
              <TouchableOpacity
                onPress={async () => {
                  await setSetupComplete(true);
                  router.replace("/sections/wellness/add-medication" as any);
                }}
                className="w-full py-4 rounded-2xl items-center border-2"
                style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  🥗 نعم، ذكّرني مع وجباتي
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await setSetupComplete(true);
                  router.replace("/(tabs)" as any);
                }}
                className="w-full py-4 rounded-2xl items-center"
                style={{ backgroundColor: colors.muted + "30" }}
                activeOpacity={0.8}
              >
                <Text className="text-base font-medium text-muted">
                  ⏰ ربما لاحقاً
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              className="text-xs text-muted text-center mt-6 leading-5"
              style={{ writingDirection: "rtl" }}
            >
              في أي وقت تشاء، توجّه إلى قسم "عافيتي" وكل شيء جاهز.
            </Text>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // الخطوة 2: رسالة لمن لا يتناول أدوية
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-8 bg-background">
        <Animated.View entering={FadeIn.duration(600)} className="items-center w-full">
          <Text style={{ fontSize: 56, marginBottom: 20 }}>🌿</Text>
          <Text
            className="text-xl font-bold text-foreground text-center mb-4"
            style={{ writingDirection: "rtl" }}
          >
            الحمد لله على نعمة الصحة والعافية!
          </Text>
          <Text
            className="text-base text-muted text-center mb-10 leading-7"
            style={{ writingDirection: "rtl" }}
          >
            نسأل الله أن يديم عليك تمام الصحة والعافية، ويبعد عنك كل سوء.
          </Text>

          <TouchableOpacity
            onPress={async () => {
              await setSetupComplete(true);
              router.replace("/(tabs)" as any);
            }}
            className="w-full py-4 rounded-2xl items-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">
              💚 الحمد لله، هيا بنا نبدأ
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

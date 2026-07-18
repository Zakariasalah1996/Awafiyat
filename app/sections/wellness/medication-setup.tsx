import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { SubscriptionFeatureGate } from "@/components/subscription-feature-gate";
import { useMedication } from "@/lib/medication-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { canUseMedicationReminders } from "@/lib/feature-access";
import Animated, { FadeIn } from "react-native-reanimated";

/**
 * تدفق إعداد رفيق الدواء - مباشر بدون أسئلة
 * يقوم بتعيين الإعداد كمكتمل والانتقال مباشرة لإضافة الدواء
 */
export default function MedicationSetupScreen() {
  const { setSetupComplete, setTakesMedication } = useMedication();
  const { isPremium } = useSubscriptionContext();

  useEffect(() => {
    if (!canUseMedicationReminders(isPremium)) return;

    const init = async () => {
      setTakesMedication(true);
      await setSetupComplete(true);
      router.replace("/sections/wellness/add-medication" as any);
    };
    init();
  }, [isPremium, setSetupComplete, setTakesMedication]);

  if (!canUseMedicationReminders(isPremium)) {
    return (
      <SubscriptionFeatureGate
        emoji="🔒"
        title="تذكير الدواء للمشتركين"
        description="يتطلب إعداد الدواء وجدولة تنبيهاته اشتراك ألف عافيات المميزة."
        buttonLabel="اشترك لبدء الإعداد"
      />
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-8 bg-background">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💊</Text>
          <Text
            className="text-base text-muted text-center"
            style={{ writingDirection: "rtl" }}
          >
            جاري التحضير...
          </Text>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

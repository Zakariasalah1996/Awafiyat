import { useState } from "react";
import { Text, View, TouchableOpacity, TextInput, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWater } from "@/lib/water-context";
import { scheduleWaterReminders, setupWaterChannel, setupWaterNotificationActions } from "@/lib/water-notifications";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function WaterSetupScreen() {
  const colors = useColors();
  const { completeSetup } = useWater();
  const [step, setStep] = useState<"weight" | "interval" | "done">("weight");
  const [weight, setWeight] = useState("");
  const [intervalHours, setIntervalHours] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  const calculatedGoal = weight ? Math.round(Number(weight) * 33) : 0;
  const calculatedCups = weight ? Math.ceil(calculatedGoal / 250) : 0;

  const handleWeightNext = () => {
    const w = Number(weight);
    if (w < 20 || w > 250 || isNaN(w)) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("interval");
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const w = Number(weight);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // إعداد القناة والأزرار
      await setupWaterChannel();
      await setupWaterNotificationActions();
      
      // حفظ الإعدادات
      await completeSetup(w, intervalHours);
      
      // جدولة التذكيرات
      await scheduleWaterReminders(intervalHours, 7, 23);
      
      setStep("done");
    } catch (e) {
      console.error("[WaterSetup] Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    router.back();
  };

  if (step === "done") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View entering={FadeInUp.duration(500)} className="items-center">
            <Text style={{ fontSize: 80 }}>💧</Text>
            <Text
              className="text-2xl font-bold text-foreground mt-6 text-center"
              style={{ writingDirection: "rtl" }}
            >
              تم تفعيل رفيق الماء!
            </Text>
            <Text
              className="text-base text-muted mt-3 text-center leading-7"
              style={{ writingDirection: "rtl" }}
            >
              سنذكّرك بشرب الماء كل {intervalHours === 1 ? "ساعة" : `${intervalHours} ساعات`}{"\n"}
              هدفك اليومي: {calculatedCups} أكواب ({(calculatedGoal / 1000).toFixed(1)} لتر)
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="w-full mt-10">
            <TouchableOpacity
              onPress={handleGoHome}
              className="w-full py-4 rounded-2xl items-center"
              style={{ backgroundColor: "#2196F3" }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">هيا نبدأ! 💪</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-8">
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} className="items-center mb-8">
            <Text style={{ fontSize: 60 }}>💧</Text>
            <Text
              className="text-2xl font-bold text-foreground mt-4 text-center"
              style={{ writingDirection: "rtl" }}
            >
              رفيق الماء
            </Text>
            <Text
              className="text-base text-muted mt-2 text-center"
              style={{ writingDirection: "rtl" }}
            >
              لنحسب احتياجك اليومي من الماء
            </Text>
          </Animated.View>

          {step === "weight" && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              {/* سؤال الوزن */}
              <View
                className="rounded-2xl p-6 border mb-6"
                style={{ backgroundColor: "#EDF7FF", borderColor: "#B3D9FF40" }}
              >
                <Text
                  className="text-lg font-bold text-foreground mb-2 text-center"
                  style={{ writingDirection: "rtl" }}
                >
                  كم وزنك؟ (بالكيلوغرام)
                </Text>
                <Text
                  className="text-sm text-muted mb-4 text-center"
                  style={{ writingDirection: "rtl" }}
                >
                  نحتاج وزنك لحساب كمية الماء المناسبة لجسمك
                </Text>

                <View className="items-center">
                  <TextInput
                    value={weight}
                    onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ""))}
                    placeholder="مثال: 70"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={handleWeightNext}
                    className="text-center text-3xl font-bold rounded-xl px-6 py-4 w-48"
                    style={{
                      backgroundColor: "#fff",
                      borderWidth: 2,
                      borderColor: weight ? "#2196F3" : colors.border,
                      color: colors.foreground,
                    }}
                  />
                  <Text className="text-sm text-muted mt-2">كغ</Text>
                </View>

                {/* عرض الحساب */}
                {weight && Number(weight) >= 20 && (
                  <Animated.View entering={FadeInDown.duration(300)} className="mt-5 items-center">
                    <View
                      className="rounded-xl p-4 w-full"
                      style={{ backgroundColor: "#fff" }}
                    >
                      <Text
                        className="text-sm text-muted text-center mb-2"
                        style={{ writingDirection: "rtl" }}
                      >
                        احتياجك اليومي المقدّر:
                      </Text>
                      <Text
                        className="text-2xl font-bold text-center"
                        style={{ color: "#2196F3" }}
                      >
                        {calculatedCups} أكواب
                      </Text>
                      <Text className="text-xs text-muted text-center mt-1">
                        ({(calculatedGoal / 1000).toFixed(1)} لتر ≈ {calculatedGoal} مل)
                      </Text>
                    </View>
                    <Text
                      className="text-xs text-muted mt-3 text-center leading-5"
                      style={{ writingDirection: "rtl" }}
                    >
                      المعادلة: وزنك × 33 مل = احتياجك اليومي
                    </Text>
                  </Animated.View>
                )}
              </View>

              {/* زر التالي */}
              <TouchableOpacity
                onPress={handleWeightNext}
                disabled={!weight || Number(weight) < 20 || Number(weight) > 250}
                className="w-full py-4 rounded-2xl items-center"
                style={{
                  backgroundColor: weight && Number(weight) >= 20 ? "#2196F3" : colors.border,
                  opacity: weight && Number(weight) >= 20 ? 1 : 0.5,
                }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-bold">التالي</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === "interval" && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              {/* اختيار فترة التذكير */}
              <View
                className="rounded-2xl p-6 border mb-6"
                style={{ backgroundColor: "#EDF7FF", borderColor: "#B3D9FF40" }}
              >
                <Text
                  className="text-lg font-bold text-foreground mb-2 text-center"
                  style={{ writingDirection: "rtl" }}
                >
                  كم مرة تريد أن نذكّرك؟
                </Text>
                <Text
                  className="text-sm text-muted mb-5 text-center"
                  style={{ writingDirection: "rtl" }}
                >
                  سنرسل لك تذكيراً لطيفاً بشرب الماء
                </Text>

                {[
                  { value: 1, label: "كل ساعة", desc: "للمهتمين جداً بالترطيب" },
                  { value: 2, label: "كل ساعتين", desc: "الأنسب لمعظم الناس (مُوصى به)" },
                  { value: 3, label: "كل 3 ساعات", desc: "تذكير خفيف ولطيف" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setIntervalHours(option.value);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="rounded-xl p-4 mb-3 border"
                    style={{
                      backgroundColor: intervalHours === option.value ? "#E3F2FD" : "#fff",
                      borderColor: intervalHours === option.value ? "#2196F3" : colors.border,
                      borderWidth: intervalHours === option.value ? 2 : 1,
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center" style={{ flexDirection: "row-reverse" }}>
                      <View
                        className="w-6 h-6 rounded-full border-2 items-center justify-center mr-3"
                        style={{
                          borderColor: intervalHours === option.value ? "#2196F3" : colors.border,
                          backgroundColor: intervalHours === option.value ? "#2196F3" : "transparent",
                        }}
                      >
                        {intervalHours === option.value && (
                          <View className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </View>
                      <View className="flex-1" style={{ alignItems: "flex-end" }}>
                        <Text
                          className="text-base font-bold text-foreground"
                          style={{ writingDirection: "rtl" }}
                        >
                          {option.label}
                        </Text>
                        <Text
                          className="text-xs text-muted mt-1"
                          style={{ writingDirection: "rtl" }}
                        >
                          {option.desc}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ملخص */}
              <View
                className="rounded-xl p-4 mb-6"
                style={{ backgroundColor: `${colors.primary}10` }}
              >
                <Text
                  className="text-sm text-muted text-center leading-6"
                  style={{ writingDirection: "rtl" }}
                >
                  ✨ هدفك: {calculatedCups} أكواب يومياً{"\n"}
                  ⏰ تذكير: {intervalHours === 1 ? "كل ساعة" : `كل ${intervalHours} ساعات`} (من 7 صباحاً حتى 11 مساءً)
                </Text>
              </View>

              {/* أزرار */}
              <TouchableOpacity
                onPress={handleFinish}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl items-center mb-3"
                style={{ backgroundColor: "#2196F3", opacity: isLoading ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-bold">
                  {isLoading ? "جاري التفعيل..." : "تفعيل رفيق الماء 💧"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep("weight")}
                className="w-full py-3 rounded-2xl items-center"
                activeOpacity={0.7}
              >
                <Text className="text-muted text-base">رجوع</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView, TextInput, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWater } from "@/lib/water-context";
import { scheduleWaterReminders, cancelWaterReminders } from "@/lib/water-notifications";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

export default function WaterSettingsScreen() {
  const colors = useColors();
  const { state, updateSettings } = useWater();
  const { settings } = state;

  const [weight, setWeight] = useState(String(settings.weight));
  const [intervalHours, setIntervalHours] = useState(settings.reminderIntervalHours);
  const [remindersEnabled, setRemindersEnabled] = useState(settings.remindersEnabled);
  const [saved, setSaved] = useState(false);

  const calculatedGoal = weight ? Math.round(Number(weight) * 33) : settings.dailyGoalMl;
  const calculatedCups = Math.ceil(calculatedGoal / settings.cupSizeMl);

  const handleSave = async () => {
    const w = Number(weight);
    if (w < 20 || w > 250 || isNaN(w)) {
      Alert.alert("خطأ", "يرجى إدخال وزن صحيح (20-250 كغ)");
      return;
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await updateSettings({
      weight: w,
      reminderIntervalHours: intervalHours,
      remindersEnabled,
    });

    // تحديث التذكيرات
    if (remindersEnabled) {
      await scheduleWaterReminders(intervalHours, settings.wakeHour, settings.sleepHour);
    } else {
      await cancelWaterReminders();
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center" style={{ flexDirection: "row-reverse" }}>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.border}50` }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text
              className="text-xl font-bold text-foreground flex-1 mr-3"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              إعدادات شرب الماء
            </Text>
          </View>
        </View>

        {/* الوزن */}
        <View className="px-6 mb-5">
          <View
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text
              className="text-base font-bold text-foreground mb-3"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              الوزن (كغ)
            </Text>
            <TextInput
              value={weight}
              onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ""))}
              placeholder="مثال: 70"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              returnKeyType="done"
              className="text-center text-2xl font-bold rounded-xl px-4 py-3"
              style={{
                backgroundColor: colors.background,
                borderWidth: 1.5,
                borderColor: colors.border,
                color: colors.foreground,
              }}
            />
            <Text
              className="text-sm text-muted mt-2 text-center"
              style={{ writingDirection: "rtl" }}
            >
              هدفك المحسوب: {calculatedCups} أكواب ({(calculatedGoal / 1000).toFixed(1)} لتر)
            </Text>
          </View>
        </View>

        {/* التذكيرات */}
        <View className="px-6 mb-5">
          <View
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between mb-4" style={{ flexDirection: "row-reverse" }}>
              <Text
                className="text-base font-bold text-foreground"
                style={{ writingDirection: "rtl" }}
              >
                التذكيرات
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setRemindersEnabled(!remindersEnabled);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="w-14 h-8 rounded-full justify-center px-1"
                style={{
                  backgroundColor: remindersEnabled ? "#2196F3" : colors.border,
                }}
                activeOpacity={0.8}
              >
                <View
                  className="w-6 h-6 rounded-full bg-white"
                  style={{
                    alignSelf: remindersEnabled ? "flex-end" : "flex-start",
                  }}
                />
              </TouchableOpacity>
            </View>

            {remindersEnabled && (
              <View>
                <Text
                  className="text-sm text-muted mb-3"
                  style={{ textAlign: "right", writingDirection: "rtl" }}
                >
                  ذكّرني كل:
                </Text>
                <View className="flex-row" style={{ flexDirection: "row-reverse", gap: 8 }}>
                  {[
                    { value: 1, label: "ساعة" },
                    { value: 2, label: "ساعتين" },
                    { value: 3, label: "3 ساعات" },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setIntervalHours(opt.value);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className="flex-1 py-3 rounded-xl items-center border"
                      style={{
                        backgroundColor: intervalHours === opt.value ? "#E3F2FD" : colors.background,
                        borderColor: intervalHours === opt.value ? "#2196F3" : colors.border,
                        borderWidth: intervalHours === opt.value ? 2 : 1,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: intervalHours === opt.value ? "#2196F3" : colors.foreground }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* معلومات */}
        <View className="px-6 mb-6">
          <View
            className="rounded-xl p-4"
            style={{ backgroundColor: "#E8F5E9" }}
          >
            <Text
              className="text-sm leading-6 text-center"
              style={{ color: "#2E7D32", writingDirection: "rtl" }}
            >
              💡 المعادلة: وزنك × 33 مل = احتياجك اليومي{"\n"}
              التذكيرات تعمل من 7 صباحاً حتى 11 مساءً
            </Text>
          </View>
        </View>

        {/* زر الحفظ */}
        <View className="px-6">
          <TouchableOpacity
            onPress={handleSave}
            className="w-full py-4 rounded-2xl items-center"
            style={{ backgroundColor: saved ? "#4CAF50" : "#2196F3" }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">
              {saved ? "✅ تم الحفظ" : "حفظ الإعدادات"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

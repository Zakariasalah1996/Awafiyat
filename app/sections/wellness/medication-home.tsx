import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  useMedication,
  type Medication,
  TIME_PERIODS,
} from "@/lib/medication-context";
import { useUser } from "@/lib/user-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { cancelMedicationReminder } from "@/lib/medication-notifications";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "يومياً",
  weekly: "أسبوعياً",
  monthly: "شهرياً",
};

const DAY_LABELS: Record<string, string> = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الاثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
};

export default function MedicationHomeScreen() {
  const colors = useColors();
  const { state, deleteMedication, canAddMoreMedications, recordIntake, getIntakeForDate, getWeeklyAdherence } = useMedication();
  const { profile } = useUser();

  const activeMeds = state.medications.filter((m) => m.isActive);
  const hasMeds = activeMeds.length > 0;
  const today = new Date().toISOString().split("T")[0];

  const handleAddMedication = () => {
    if (!canAddMoreMedications(profile.isSubscribed)) {
      Alert.alert(
        "اشتراك مطلوب 👑",
        "الدواء الأول مجاني! لإضافة أدوية إضافية، يرجى الاشتراك في النسخة الكاملة.",
        [
          { text: "لاحقاً", style: "cancel" },
          {
            text: "اشترك الآن",
            onPress: () => router.push("/(tabs)/subscription" as any),
          },
        ]
      );
      return;
    }
    router.push("/sections/wellness/add-medication" as any);
  };

  const handleEditMedication = (med: Medication) => {
    router.push(`/sections/wellness/edit-medication?id=${med.id}` as any);
  };

  const handleDeleteMedication = (med: Medication) => {
    Alert.alert(
      "حذف الدواء",
      `هل تريد حذف "${med.name}" من قائمة أدويتك؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await cancelMedicationReminder(med);
            await deleteMedication(med.id);
          },
        },
      ]
    );
  };

  const handleRecordIntake = async (medId: string, timeIndex: number, taken: boolean) => {
    await recordIntake(medId, timeIndex, taken);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "م" : "ص";
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h}:${String(minute).padStart(2, "0")} ${period}`;
  };

  // إذا لم يكمل الإعداد بعد
  if (!state.setupComplete) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8 bg-background">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 64, marginBottom: 20 }}>💊</Text>
            <Text
              className="text-2xl font-bold text-foreground text-center mb-3"
              style={{ writingDirection: "rtl" }}
            >
              رفيق الدواء
            </Text>
            <Text
              className="text-base text-muted text-center mb-10 leading-7"
              style={{ writingDirection: "rtl" }}
            >
              سجّل أدويتك ونذكّرك بمواعيدها بكل حب ورعاية
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/sections/wellness/medication-setup" as any)}
              className="w-full py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">ابدأ الإعداد</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">رجوع</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <View
            className="flex-row items-center justify-between"
            style={{ flexDirection: "row-reverse" }}
          >
            <View style={{ alignItems: "flex-end" }}>
              <Text
                className="text-2xl font-bold text-foreground"
                style={{ textAlign: "right", writingDirection: "rtl" }}
              >
                رفيق الدواء 💊
              </Text>
              <Text
                className="text-sm text-muted mt-1"
                style={{ textAlign: "right", writingDirection: "rtl" }}
              >
                {hasMeds
                  ? "أدويتك مسجلة وسنذكّرك بمواعيدها"
                  : "أضف دواءك الأول"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-forward" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* قائمة الأدوية */}
        {hasMeds ? (
          <View className="px-5 gap-4">
            {activeMeds.map((med, idx) => {
              const adherence = getWeeklyAdherence(med.id);
              const todayIntake = getIntakeForDate(med.id, today);

              return (
                <Animated.View
                  key={med.id}
                  entering={FadeInDown.delay(idx * 80).duration(400)}
                >
                  <View
                    className="rounded-2xl p-4 border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    {/* Header: اسم + أزرار */}
                    <View
                      className="flex-row items-center justify-between"
                      style={{ flexDirection: "row-reverse" }}
                    >
                      <View className="flex-row items-center flex-1" style={{ flexDirection: "row-reverse" }}>
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: `${colors.primary}15` }}
                        >
                          <Text style={{ fontSize: 20 }}>💊</Text>
                        </View>
                        <View className="mr-3 flex-1" style={{ alignItems: "flex-end" }}>
                          <Text
                            className="text-base font-bold text-foreground"
                            style={{ textAlign: "right" }}
                          >
                            {med.name}
                          </Text>
                          <Text className="text-xs text-muted mt-0.5" style={{ writingDirection: "rtl" }}>
                            {FREQUENCY_LABELS[med.frequency]}
                            {med.frequency === "daily" && med.timesPerDay > 1
                              ? ` - ${med.timesPerDay} مرات`
                              : ""}
                            {med.frequency === "weekly" && med.dayOfWeek
                              ? ` - ${DAY_LABELS[med.dayOfWeek]}`
                              : ""}
                            {med.frequency === "monthly" && med.dayOfMonth
                              ? ` - يوم ${med.dayOfMonth}`
                              : ""}
                          </Text>
                          {med.dosage && (
                            <Text className="text-xs text-muted" style={{ writingDirection: "rtl" }}>
                              الجرعة: {med.dosage}
                            </Text>
                          )}
                          {med.note && (
                            <Text className="text-xs" style={{ color: colors.warning, writingDirection: "rtl" }}>
                              📝 {med.note}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* أزرار تعديل وحذف */}
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleEditMedication(med)}
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: `${colors.primary}15` }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="edit" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMedication(med)}
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: `${colors.error}15` }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="delete" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* نسبة الالتزام */}
                    {adherence > 0 && (
                      <View className="mt-3 flex-row items-center gap-2" style={{ flexDirection: "row-reverse" }}>
                        <View className="flex-1 h-2 rounded-full" style={{ backgroundColor: colors.border }}>
                          <View
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: adherence >= 80 ? colors.success : adherence >= 50 ? colors.warning : colors.error,
                              width: `${adherence}%`,
                            }}
                          />
                        </View>
                        <Text className="text-xs font-bold" style={{ color: adherence >= 80 ? colors.success : adherence >= 50 ? colors.warning : colors.error }}>
                          {adherence}%
                        </Text>
                      </View>
                    )}

                    {/* أوقات الدواء + سجل التناول */}
                    <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                      {med.times.map((time, tIdx) => {
                        const period = TIME_PERIODS.find((p) => p.id === time.period);
                        const intakeRecord = todayIntake.find((r) => r.timeIndex === tIdx);
                        const isTaken = intakeRecord?.taken === true;
                        const isMissed = intakeRecord?.taken === false;

                        return (
                          <View
                            key={tIdx}
                            className="flex-row items-center justify-between py-2"
                            style={{ flexDirection: "row-reverse" }}
                          >
                            <View className="flex-row items-center gap-2" style={{ flexDirection: "row-reverse" }}>
                              <Text style={{ fontSize: 16 }}>{period?.emoji || "⏰"}</Text>
                              <Text className="text-sm text-foreground font-medium">
                                {period?.label} - {formatTime(time.hour, time.minute)}
                              </Text>
                            </View>

                            {/* أزرار تسجيل التناول */}
                            <View className="flex-row gap-2">
                              {isTaken ? (
                                <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: `${colors.success}20` }}>
                                  <Text className="text-xs font-bold" style={{ color: colors.success }}>
                                    تناولته ✅
                                  </Text>
                                </View>
                              ) : isMissed ? (
                                <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: `${colors.error}20` }}>
                                  <Text className="text-xs font-bold" style={{ color: colors.error }}>
                                    فاتني ❌
                                  </Text>
                                </View>
                              ) : (
                                <>
                                  <TouchableOpacity
                                    onPress={() => handleRecordIntake(med.id, tIdx, true)}
                                    className="px-3 py-1.5 rounded-full"
                                    style={{ backgroundColor: `${colors.success}15` }}
                                    activeOpacity={0.7}
                                  >
                                    <Text className="text-xs font-bold" style={{ color: colors.success }}>
                                      تناولته ✅
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleRecordIntake(med.id, tIdx, false)}
                                    className="px-3 py-1.5 rounded-full"
                                    style={{ backgroundColor: `${colors.error}10` }}
                                    activeOpacity={0.7}
                                  >
                                    <Text className="text-xs font-bold" style={{ color: colors.error }}>
                                      فاتني
                                    </Text>
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} className="px-5">
            <View
              className="rounded-2xl p-8 items-center border"
              style={{
                backgroundColor: `${colors.primary}05`,
                borderColor: `${colors.primary}20`,
                borderStyle: "dashed",
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💊</Text>
              <Text
                className="text-base text-muted text-center leading-6"
                style={{ writingDirection: "rtl" }}
              >
                لم تسجل أي دواء بعد.{"\n"}أضف دواءك الأول وسنذكّرك بمواعيده.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* زر إضافة دواء */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-5 mt-6">
          <TouchableOpacity
            onPress={handleAddMedication}
            className="w-full py-4 rounded-2xl items-center flex-row justify-center"
            style={{
              backgroundColor: colors.primary,
              flexDirection: "row-reverse",
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
            <Text className="text-white text-lg font-bold mr-2">
              {hasMeds ? "إضافة دواء آخر" : "إضافة دواء"}
            </Text>
          </TouchableOpacity>

          {/* ملاحظة الاشتراك */}
          {!profile.isSubscribed && activeMeds.length >= 1 && (
            <View className="mt-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "#FFF3E0" }}>
              <Text
                className="text-xs text-center leading-5"
                style={{ color: "#E65100", writingDirection: "rtl" }}
              >
                👑 الدواء الأول مجاني! لإضافة أدوية إضافية، اشترك في النسخة الكاملة.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

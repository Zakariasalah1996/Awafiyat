import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  useMedication,
  type MedicationFrequency,
  type DayOfWeek,
  type MedicationTime,
} from "@/lib/medication-context";
import { scheduleMedicationReminder } from "@/lib/medication-notifications";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: "sat", label: "السبت", short: "سبت" },
  { id: "sun", label: "الأحد", short: "أحد" },
  { id: "mon", label: "الاثنين", short: "اثنين" },
  { id: "tue", label: "الثلاثاء", short: "ثلاثاء" },
  { id: "wed", label: "الأربعاء", short: "أربعاء" },
  { id: "thu", label: "الخميس", short: "خميس" },
  { id: "fri", label: "الجمعة", short: "جمعة" },
];

const QUICK_TIMES: { label: string; emoji: string; hour: number; minute: number }[] = [
  { label: "مع الفطور", emoji: "☀️", hour: 8, minute: 0 },
  { label: "مع الغداء", emoji: "🌞", hour: 14, minute: 0 },
  { label: "مع العشاء", emoji: "🌙", hour: 20, minute: 0 },
];

type Step = "name" | "frequency" | "times_per_day" | "day_of_week" | "day_of_month" | "time_select" | "success";

export default function AddMedicationScreen() {
  const colors = useColors();
  const { addMedication } = useMedication();

  const [step, setStep] = useState<Step>("name");
  const [medName, setMedName] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>("daily");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("sat");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [selectedTimes, setSelectedTimes] = useState<MedicationTime[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [customHour, setCustomHour] = useState(8);
  const [customMinute, setCustomMinute] = useState(0);
  const [showCustomTime, setShowCustomTime] = useState(false);

  const handleSelectFrequency = (freq: MedicationFrequency) => {
    setFrequency(freq);
    if (freq === "daily") {
      setStep("times_per_day");
    } else if (freq === "weekly") {
      setTimesPerDay(1);
      setStep("day_of_week");
    } else {
      setTimesPerDay(1);
      setStep("day_of_month");
    }
  };

  const handleSelectTimesPerDay = (count: number) => {
    setTimesPerDay(count);
    setSelectedTimes([]);
    setCurrentTimeIndex(0);
    setStep("time_select");
  };

  const handleSelectTime = async (hour: number, minute: number, label?: string) => {
    const newTime: MedicationTime = { hour, minute, label };
    const updatedTimes = [...selectedTimes, newTime];
    setSelectedTimes(updatedTimes);

    if (updatedTimes.length < timesPerDay) {
      // نحتاج أوقات إضافية
      setCurrentTimeIndex(updatedTimes.length);
      setShowCustomTime(false);
    } else {
      // انتهينا - حفظ الدواء
      const med = await addMedication({
        name: medName,
        frequency,
        timesPerDay,
        times: updatedTimes,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      });
      // جدولة الإشعارات
      await scheduleMedicationReminder(med);
      setStep("success");
    }
  };

  const handleCustomTimeConfirm = () => {
    handleSelectTime(customHour, customMinute, "وقت مخصص");
  };

  // === شاشة اسم الدواء ===
  if (step === "name") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💊</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              ما اسم دوائك؟
            </Text>

            <TextInput
              value={medName}
              onChangeText={setMedName}
              placeholder="مثال: ميتفورمين، أملوديبين..."
              placeholderTextColor={colors.muted}
              className="w-full py-4 px-5 rounded-2xl text-base text-right"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: medName ? colors.primary : colors.border,
                color: colors.foreground,
                writingDirection: "rtl",
                fontSize: 16,
              }}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (medName.trim()) setStep("frequency");
              }}
            />

            <TouchableOpacity
              onPress={() => setStep("frequency")}
              className="w-full py-4 rounded-2xl items-center mt-6"
              style={{
                backgroundColor: medName.trim() ? colors.primary : colors.muted + "40",
              }}
              activeOpacity={0.8}
              disabled={!medName.trim()}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">إلغاء</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // === شاشة التكرار ===
  if (step === "frequency") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              كم مرة تتناول "{medName}"؟
            </Text>

            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={() => handleSelectFrequency("daily")}
                className="w-full py-4 px-6 rounded-2xl items-center border-2"
                style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  ☀️ يومياً
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFrequency("weekly")}
                className="w-full py-4 px-6 rounded-2xl items-center border-2"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold text-foreground">
                  📅 أسبوعياً
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFrequency("monthly")}
                className="w-full py-4 px-6 rounded-2xl items-center border-2"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-bold text-foreground">
                  🌙 شهرياً
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setStep("name")}
              className="mt-6 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">رجوع</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // === شاشة عدد المرات يومياً ===
  if (step === "times_per_day") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔢</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              وكم مرة في اليوم؟
            </Text>

            <View className="w-full flex-row justify-center gap-4" style={{ flexDirection: "row-reverse" }}>
              {[1, 2, 3].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleSelectTimesPerDay(count)}
                  className="w-20 h-20 rounded-2xl items-center justify-center border-2"
                  style={{
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}10`,
                  }}
                  activeOpacity={0.8}
                >
                  <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setStep("frequency")}
              className="mt-8 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">رجوع</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // === شاشة اختيار اليوم (أسبوعي) ===
  if (step === "day_of_week") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-6 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              في أي يوم من الأسبوع؟
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
              style={{ flexDirection: "row-reverse" }}
            >
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => setDayOfWeek(day.id)}
                  className="px-4 py-3 rounded-xl items-center border-2"
                  style={{
                    borderColor: dayOfWeek === day.id ? colors.primary : colors.border,
                    backgroundColor: dayOfWeek === day.id ? `${colors.primary}15` : colors.surface,
                    minWidth: 70,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: dayOfWeek === day.id ? colors.primary : colors.foreground }}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setCurrentTimeIndex(0);
                setSelectedTimes([]);
                setStep("time_select");
              }}
              className="w-full py-4 rounded-2xl items-center mt-8"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("frequency")}
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

  // === شاشة اختيار اليوم (شهري) ===
  if (step === "day_of_month") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-6 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-6"
              style={{ writingDirection: "rtl" }}
            >
              في أي يوم من الشهر؟
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setDayOfMonth(day)}
                  className="w-12 h-12 rounded-full items-center justify-center border-2"
                  style={{
                    borderColor: dayOfMonth === day ? colors.primary : colors.border,
                    backgroundColor: dayOfMonth === day ? `${colors.primary}15` : "transparent",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: dayOfMonth === day ? colors.primary : colors.foreground }}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setCurrentTimeIndex(0);
                setSelectedTimes([]);
                setStep("time_select");
              }}
              className="w-full py-4 rounded-2xl items-center mt-8"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("frequency")}
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

  // === شاشة اختيار الوقت ===
  if (step === "time_select") {
    const timeLabel = timesPerDay > 1
      ? `الوقت ${currentTimeIndex + 1} من ${timesPerDay}`
      : "في أي وقت؟";

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⏰</Text>
            <Text
              className="text-base text-muted text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              خذ دواءك مع إحدى الوجبات... أسهل للتذكر!
            </Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-8"
              style={{ writingDirection: "rtl" }}
            >
              {timeLabel}
            </Text>

            {!showCustomTime ? (
              <View className="w-full gap-3">
                {QUICK_TIMES.map((qt) => (
                  <TouchableOpacity
                    key={qt.label}
                    onPress={() => handleSelectTime(qt.hour, qt.minute, qt.label)}
                    className="w-full py-4 px-6 rounded-2xl flex-row items-center justify-between border-2"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      flexDirection: "row-reverse",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-base font-bold text-foreground">
                      {qt.emoji} {qt.label}
                    </Text>
                    <Text className="text-sm text-muted">
                      {qt.hour > 12 ? qt.hour - 12 : qt.hour}:00 {qt.hour >= 12 ? "م" : "ص"}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setShowCustomTime(true)}
                  className="w-full py-4 px-6 rounded-2xl items-center border-2 mt-2"
                  style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}08` }}
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-medium" style={{ color: colors.primary }}>
                    ⏰ وقت آخر
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="w-full items-center">
                {/* اختيار ساعة مخصصة */}
                <View className="flex-row items-center gap-4 mb-6">
                  <View className="items-center">
                    <Text className="text-xs text-muted mb-2">الدقيقة</Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => setCustomMinute((p) => (p + 15) % 60)}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <MaterialIcons name="add" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text className="text-2xl font-bold text-foreground w-12 text-center">
                        {String(customMinute).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCustomMinute((p) => (p - 15 + 60) % 60)}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <MaterialIcons name="remove" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text className="text-3xl font-bold text-foreground">:</Text>

                  <View className="items-center">
                    <Text className="text-xs text-muted mb-2">الساعة</Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => setCustomHour((p) => (p + 1) % 24)}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <MaterialIcons name="add" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text className="text-2xl font-bold text-foreground w-12 text-center">
                        {String(customHour).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCustomHour((p) => (p - 1 + 24) % 24)}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <MaterialIcons name="remove" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Text className="text-sm text-muted mb-6">
                  {customHour >= 12 ? "مساءً" : "صباحاً"} - {customHour > 12 ? customHour - 12 : customHour === 0 ? 12 : customHour}:{String(customMinute).padStart(2, "0")} {customHour >= 12 ? "م" : "ص"}
                </Text>

                <TouchableOpacity
                  onPress={handleCustomTimeConfirm}
                  className="w-full py-4 rounded-2xl items-center"
                  style={{ backgroundColor: colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-lg font-bold">تأكيد الوقت</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCustomTime(false)}
                  className="mt-4 py-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-base text-muted">رجوع للأوقات السريعة</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // === شاشة النجاح ===
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-8 bg-background">
        <Animated.View entering={FadeIn.duration(600)} className="items-center w-full">
          <Text style={{ fontSize: 56, marginBottom: 20 }}>😍👍🏼</Text>
          <Text
            className="text-2xl font-bold text-foreground text-center mb-4"
            style={{ writingDirection: "rtl" }}
          >
            تم بنجاح!
          </Text>
          <Text
            className="text-base text-muted text-center leading-7 mb-10"
            style={{ writingDirection: "rtl" }}
          >
            تم حفظ دوائك "{medName}". نسأل الله ألا ترى تعباً، وأن تكون كل جرعة خطوة نحو صحة أفضل وألف عافية.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/sections/wellness/medication-home" as any)}
            className="w-full py-4 rounded-2xl items-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">
              ✅ حسناً، دعني أستكشف
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

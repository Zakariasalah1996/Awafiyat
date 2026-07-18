import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { SubscriptionFeatureGate } from "@/components/subscription-feature-gate";
import { useColors } from "@/hooks/use-colors";
import {
  useMedication,
  type MedicationFrequency,
  type DayOfWeek,
  type MedicationTime,
  type TimePeriod,
  TIME_PERIODS,
} from "@/lib/medication-context";
import { scheduleMedicationReminder } from "@/lib/medication-notifications";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { canUseMedicationReminders } from "@/lib/feature-access";
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

const DOSAGE_OPTIONS = [
  "حبة واحدة",
  "حبتين",
  "3 حبات",
  "نصف حبة",
  "5 مل",
  "10 مل",
  "ملعقة صغيرة",
  "ملعقة كبيرة",
];

const NOTE_OPTIONS = [
  "بعد الأكل",
  "قبل الأكل",
  "على معدة فارغة",
  "مع كوب ماء كبير",
  "قبل النوم مباشرة",
  "بعد الفطور",
];

type Step = "name" | "dosage" | "note" | "frequency" | "times_per_day" | "day_of_week" | "day_of_month" | "period_select" | "time_select" | "success";

export default function AddMedicationScreen() {
  const colors = useColors();
  const { addMedication } = useMedication();
  const { isPremium } = useSubscriptionContext();

  const [step, setStep] = useState<Step>("name");
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [note, setNote] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>("daily");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("sat");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [selectedPeriods, setSelectedPeriods] = useState<TimePeriod[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<MedicationTime[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  // 12-hour picker state
  const [pickerHour, setPickerHour] = useState(8); // 1-12
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState<"am" | "pm">("am");

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
    setSelectedPeriods([]);
    setSelectedTimes([]);
    setCurrentTimeIndex(0);
    setStep("period_select");
  };

  const handlePeriodsSelected = () => {
    setCurrentTimeIndex(0);
    // تعيين الوقت الافتراضي للفترة الأولى
    const firstPeriod = TIME_PERIODS.find((p) => p.id === selectedPeriods[0]);
    if (firstPeriod) {
      const defaultH = firstPeriod.defaultHour;
      setPickerHour(defaultH > 12 ? defaultH - 12 : defaultH === 0 ? 12 : defaultH);
      setPickerMinute(0);
      setPickerAmPm(defaultH >= 12 ? "pm" : "am");
    }
    setStep("time_select");
  };

  const togglePeriod = (period: TimePeriod) => {
    setSelectedPeriods((prev) => {
      if (prev.includes(period)) {
        return prev.filter((p) => p !== period);
      }
      if (prev.length < timesPerDay) {
        return [...prev, period];
      }
      // استبدال الأخير
      return [...prev.slice(0, -1), period];
    });
  };

  const get24Hour = (): number => {
    let h = pickerHour;
    if (pickerAmPm === "am") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return h;
  };

  const handleTimeConfirm = async () => {
    if (!canUseMedicationReminders(isPremium)) return;

    const hour24 = get24Hour();
    const period = selectedPeriods[currentTimeIndex];
    const newTime: MedicationTime = { hour: hour24, minute: pickerMinute, period };
    const updatedTimes = [...selectedTimes, newTime];
    setSelectedTimes(updatedTimes);

    if (updatedTimes.length < timesPerDay) {
      // نحتاج أوقات إضافية
      const nextIndex = updatedTimes.length;
      setCurrentTimeIndex(nextIndex);
      const nextPeriod = TIME_PERIODS.find((p) => p.id === selectedPeriods[nextIndex]);
      if (nextPeriod) {
        const defaultH = nextPeriod.defaultHour;
        setPickerHour(defaultH > 12 ? defaultH - 12 : defaultH === 0 ? 12 : defaultH);
        setPickerMinute(0);
        setPickerAmPm(defaultH >= 12 ? "pm" : "am");
      }
    } else {
      // انتهينا - حفظ الدواء
      const finalDosage = dosage === "custom" ? customDosage : dosage;
      const finalNote = note === "custom" ? customNote : note;
      const med = await addMedication({
        name: medName,
        frequency,
        timesPerDay,
        times: updatedTimes,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
        dosage: finalDosage || undefined,
        note: finalNote || undefined,
      });
      // جدولة الإشعارات
      await scheduleMedicationReminder(med);
      setStep("success");
    }
  };

  const formatTime12 = (hour: number, minute: number): string => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? "م" : "ص";
    return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
  };

  if (!canUseMedicationReminders(isPremium)) {
    return (
      <SubscriptionFeatureGate
        emoji="🔒"
        title="إضافة الدواء للمشتركين"
        description="اشترك في ألف عافيات المميزة لإضافة الدواء وتحديد الجرعات وجدولة التنبيهات المحلية."
        buttonLabel="اشترك لإضافة الدواء"
      />
    );
  }

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
                if (medName.trim()) setStep("dosage");
              }}
            />

            <TouchableOpacity
              onPress={() => setStep("dosage")}
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

  // === شاشة كمية الجرعة ===
  if (step === "dosage") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💊</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              كم الجرعة؟
            </Text>
            <Text
              className="text-sm text-muted text-center mb-6"
              style={{ writingDirection: "rtl" }}
            >
              (اختياري - يظهر في التذكير)
            </Text>

            <View className="w-full flex-row flex-wrap justify-center gap-2" style={{ flexDirection: "row-reverse" }}>
              {DOSAGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setDosage(dosage === opt ? "" : opt)}
                  className="px-4 py-3 rounded-xl border-2 mb-2"
                  style={{
                    borderColor: dosage === opt ? colors.primary : colors.border,
                    backgroundColor: dosage === opt ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: dosage === opt ? colors.primary : colors.foreground }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setDosage(dosage === "custom" ? "" : "custom")}
                className="px-4 py-3 rounded-xl border-2 mb-2"
                style={{
                  borderColor: dosage === "custom" ? colors.primary : colors.border,
                  backgroundColor: dosage === "custom" ? `${colors.primary}15` : colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: dosage === "custom" ? colors.primary : colors.foreground }}
                >
                  ✏️ أخرى
                </Text>
              </TouchableOpacity>
            </View>

            {dosage === "custom" && (
              <TextInput
                value={customDosage}
                onChangeText={setCustomDosage}
                placeholder="اكتب الجرعة..."
                placeholderTextColor={colors.muted}
                className="w-full py-3 px-4 rounded-xl text-right mt-3"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                  writingDirection: "rtl",
                }}
              />
            )}

            <TouchableOpacity
              onPress={() => setStep("note")}
              className="w-full py-4 rounded-2xl items-center mt-6"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setDosage("");
                setStep("note");
              }}
              className="mt-3 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">تخطي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("name")}
              className="mt-2 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-sm text-muted">رجوع</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // === شاشة الملاحظة ===
  if (step === "note") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              هل هناك ملاحظة؟
            </Text>
            <Text
              className="text-sm text-muted text-center mb-6"
              style={{ writingDirection: "rtl" }}
            >
              (اختياري - تظهر في التذكير لمساعدتك)
            </Text>

            <View className="w-full flex-row flex-wrap justify-center gap-2" style={{ flexDirection: "row-reverse" }}>
              {NOTE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setNote(note === opt ? "" : opt)}
                  className="px-4 py-3 rounded-xl border-2 mb-2"
                  style={{
                    borderColor: note === opt ? colors.primary : colors.border,
                    backgroundColor: note === opt ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: note === opt ? colors.primary : colors.foreground }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setNote(note === "custom" ? "" : "custom")}
                className="px-4 py-3 rounded-xl border-2 mb-2"
                style={{
                  borderColor: note === "custom" ? colors.primary : colors.border,
                  backgroundColor: note === "custom" ? `${colors.primary}15` : colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: note === "custom" ? colors.primary : colors.foreground }}
                >
                  ✏️ أخرى
                </Text>
              </TouchableOpacity>
            </View>

            {note === "custom" && (
              <TextInput
                value={customNote}
                onChangeText={setCustomNote}
                placeholder="اكتب الملاحظة..."
                placeholderTextColor={colors.muted}
                className="w-full py-3 px-4 rounded-xl text-right mt-3"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                  writingDirection: "rtl",
                }}
              />
            )}

            <TouchableOpacity
              onPress={() => setStep("frequency")}
              className="w-full py-4 rounded-2xl items-center mt-6"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setNote("");
                setStep("frequency");
              }}
              className="mt-3 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">تخطي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("dosage")}
              className="mt-2 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-sm text-muted">رجوع</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
              كم مرة تتناول «{medName}»؟
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
              onPress={() => setStep("note")}
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
              كم مرة في اليوم؟
            </Text>

            <View className="w-full flex-row justify-center gap-3" style={{ flexDirection: "row-reverse" }}>
              {[1, 2, 3, 4].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleSelectTimesPerDay(count)}
                  className="w-16 h-16 rounded-2xl items-center justify-center border-2"
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

            <View
              style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, justifyContent: "center", paddingHorizontal: 4 }}
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
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedPeriods([]);
                setSelectedTimes([]);
                setCurrentTimeIndex(0);
                setStep("period_select");
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
                setSelectedPeriods([]);
                setSelectedTimes([]);
                setCurrentTimeIndex(0);
                setStep("period_select");
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

  // === شاشة اختيار الفترات الزمنية ===
  if (step === "period_select") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🕐</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              متى تتناول دواءك؟
            </Text>
            <Text
              className="text-sm text-muted text-center mb-6"
              style={{ writingDirection: "rtl" }}
            >
              اختر {timesPerDay} {timesPerDay === 1 ? "فترة" : timesPerDay === 2 ? "فترتين" : "فترات"}
            </Text>

            <View className="w-full gap-3">
              {TIME_PERIODS.map((period) => {
                const isSelected = selectedPeriods.includes(period.id);
                return (
                  <TouchableOpacity
                    key={period.id}
                    onPress={() => togglePeriod(period.id)}
                    className="w-full py-4 px-5 rounded-2xl flex-row items-center justify-between border-2"
                    style={{
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? `${colors.primary}12` : colors.surface,
                      flexDirection: "row-reverse",
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 24 }}>{period.emoji}</Text>
                      <View>
                        <Text
                          className="text-base font-bold"
                          style={{ color: isSelected ? colors.primary : colors.foreground, writingDirection: "rtl" }}
                        >
                          {period.label}
                        </Text>
                        <Text className="text-xs text-muted" style={{ writingDirection: "rtl" }}>
                          {period.rangeLabel}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handlePeriodsSelected}
              className="w-full py-4 rounded-2xl items-center mt-6"
              style={{
                backgroundColor: selectedPeriods.length === timesPerDay ? colors.primary : colors.muted + "40",
              }}
              activeOpacity={0.8}
              disabled={selectedPeriods.length !== timesPerDay}
            >
              <Text className="text-white text-lg font-bold">متابعة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (frequency === "daily") setStep("times_per_day");
                else if (frequency === "weekly") setStep("day_of_week");
                else setStep("day_of_month");
              }}
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

  // === شاشة اختيار الوقت (12 ساعة) ===
  if (step === "time_select") {
    const currentPeriod = TIME_PERIODS.find((p) => p.id === selectedPeriods[currentTimeIndex]);
    const periodLabel = currentPeriod?.label || "";
    const timeLabel = timesPerDay > 1
      ? `${periodLabel} - الجرعة ${currentTimeIndex + 1} من ${timesPerDay}`
      : `${periodLabel} - في أي ساعة؟`;

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⏰</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              {timeLabel}
            </Text>
            {currentPeriod && (
              <Text className="text-sm text-muted text-center mb-8" style={{ writingDirection: "rtl" }}>
                {currentPeriod.emoji} {currentPeriod.rangeLabel}
              </Text>
            )}

            {/* 12-hour picker */}
            <View className="items-center mb-8">
              {/* AM/PM toggle */}
              <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                  onPress={() => setPickerAmPm("am")}
                  className="px-6 py-3 rounded-xl border-2"
                  style={{
                    borderColor: pickerAmPm === "am" ? colors.primary : colors.border,
                    backgroundColor: pickerAmPm === "am" ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: pickerAmPm === "am" ? colors.primary : colors.foreground }}
                  >
                    صباحاً
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPickerAmPm("pm")}
                  className="px-6 py-3 rounded-xl border-2"
                  style={{
                    borderColor: pickerAmPm === "pm" ? colors.primary : colors.border,
                    backgroundColor: pickerAmPm === "pm" ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: pickerAmPm === "pm" ? colors.primary : colors.foreground }}
                  >
                    مساءً
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hour and Minute */}
              <View className="flex-row items-center gap-4">
                <View className="items-center">
                  <Text className="text-xs text-muted mb-2">الدقيقة</Text>
                  <View className="items-center gap-2">
                    <TouchableOpacity
                      onPress={() => setPickerMinute((p) => (p + 5) % 60)}
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text className="text-3xl font-bold text-foreground w-14 text-center">
                      {String(pickerMinute).padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPickerMinute((p) => (p - 5 + 60) % 60)}
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-4xl font-bold text-foreground">:</Text>

                <View className="items-center">
                  <Text className="text-xs text-muted mb-2">الساعة</Text>
                  <View className="items-center gap-2">
                    <TouchableOpacity
                      onPress={() => setPickerHour((p) => (p % 12) + 1)}
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text className="text-3xl font-bold text-foreground w-14 text-center">
                      {pickerHour}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPickerHour((p) => ((p - 2 + 12) % 12) + 1)}
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text className="text-base text-muted mt-4">
                {formatTime12(get24Hour(), pickerMinute)}
              </Text>
            </View>

            {/* الأوقات المختارة سابقاً */}
            {selectedTimes.length > 0 && (
              <View className="w-full mb-4 p-3 rounded-xl" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xs text-muted text-right mb-2" style={{ writingDirection: "rtl" }}>
                  الأوقات المحددة:
                </Text>
                {selectedTimes.map((t, i) => {
                  const p = TIME_PERIODS.find((tp) => tp.id === t.period);
                  return (
                    <Text key={i} className="text-sm text-foreground text-right" style={{ writingDirection: "rtl" }}>
                      {p?.emoji} {p?.label}: {formatTime12(t.hour, t.minute)}
                    </Text>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={handleTimeConfirm}
              className="w-full py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">
                {selectedTimes.length + 1 < timesPerDay ? "تأكيد والتالي" : "تأكيد وحفظ"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("period_select")}
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
            تم حفظ دوائك «{medName}». نسأل الله ألا ترى تعباً، وأن تكون كل جرعة خطوة نحو صحة أفضل وألف عافية.
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

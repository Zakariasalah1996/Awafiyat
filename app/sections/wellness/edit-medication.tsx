import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  useMedication,
  type MedicationFrequency,
  type DayOfWeek,
  type MedicationTime,
  type TimePeriod,
  TIME_PERIODS,
} from "@/lib/medication-context";
import {
  cancelMedicationReminder,
  scheduleMedicationReminder,
} from "@/lib/medication-notifications";
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

export default function EditMedicationScreen() {
  const colors = useColors();
  const { state, updateMedication, deleteMedication } = useMedication();
  const params = useLocalSearchParams<{ id: string }>();
  const medId = params.id;

  const medication = state.medications.find((m) => m.id === medId);

  const [medName, setMedName] = useState(medication?.name || "");
  const [dosage, setDosage] = useState(medication?.dosage || "");
  const [customDosage, setCustomDosage] = useState("");
  const [note, setNote] = useState(medication?.note || "");
  const [customNote, setCustomNote] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>(medication?.frequency || "daily");
  const [timesPerDay, setTimesPerDay] = useState(medication?.timesPerDay || 1);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(medication?.dayOfWeek || "sat");
  const [dayOfMonth, setDayOfMonth] = useState(medication?.dayOfMonth || 1);
  const [times, setTimes] = useState<MedicationTime[]>(medication?.times || []);

  // لتعديل وقت معين
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState<"am" | "pm">("am");

  useEffect(() => {
    // تحديد إذا كانت الجرعة مخصصة
    if (medication?.dosage && !DOSAGE_OPTIONS.includes(medication.dosage)) {
      setDosage("custom");
      setCustomDosage(medication.dosage);
    }
    if (medication?.note && !NOTE_OPTIONS.includes(medication.note)) {
      setNote("custom");
      setCustomNote(medication.note);
    }
  }, []);

  if (!medication) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8 bg-background">
          <Text className="text-xl text-muted text-center">لم يتم العثور على الدواء</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 py-3 px-6 rounded-xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-bold">رجوع</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const formatTime12 = (hour: number, minute: number): string => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? "م" : "ص";
    return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
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

  const startEditTime = (index: number) => {
    const t = times[index];
    const h12 = t.hour > 12 ? t.hour - 12 : t.hour === 0 ? 12 : t.hour;
    setPickerHour(h12);
    setPickerMinute(t.minute);
    setPickerAmPm(t.hour >= 12 ? "pm" : "am");
    setEditingTimeIndex(index);
  };

  const confirmEditTime = () => {
    if (editingTimeIndex === null) return;
    const hour24 = get24Hour();
    const updatedTimes = [...times];
    updatedTimes[editingTimeIndex] = {
      ...updatedTimes[editingTimeIndex],
      hour: hour24,
      minute: pickerMinute,
    };
    setTimes(updatedTimes);
    setEditingTimeIndex(null);
  };

  const handleSave = async () => {
    const finalDosage = dosage === "custom" ? customDosage : dosage;
    const finalNote = note === "custom" ? customNote : note;

    // إلغاء الإشعارات القديمة
    await cancelMedicationReminder(medication);

    // تحديث الدواء
    const updatedMed = {
      ...medication,
      name: medName,
      dosage: finalDosage || undefined,
      note: finalNote || undefined,
      frequency,
      timesPerDay,
      times,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
    };

    await updateMedication(medId, updatedMed);

    // إعادة جدولة الإشعارات
    await scheduleMedicationReminder(updatedMed);

    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      "حذف الدواء",
      `هل أنت متأكد من حذف "${medication.name}"؟ سيتم إلغاء جميع التذكيرات.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await cancelMedicationReminder(medication);
            await deleteMedication(medId);
            router.back();
          },
        },
      ]
    );
  };

  // إذا نعدّل وقت معين
  if (editingTimeIndex !== null) {
    const currentPeriod = TIME_PERIODS.find((p) => p.id === times[editingTimeIndex]?.period);
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 px-8 bg-background justify-center">
          <View className="items-center w-full">
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⏰</Text>
            <Text
              className="text-xl font-bold text-foreground text-center mb-2"
              style={{ writingDirection: "rtl" }}
            >
              تعديل وقت {currentPeriod?.label || ""}
            </Text>
            <Text className="text-sm text-muted text-center mb-8">
              {currentPeriod?.emoji} {currentPeriod?.rangeLabel}
            </Text>

            {/* AM/PM */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setPickerAmPm("am")}
                className="px-6 py-3 rounded-xl border-2"
                style={{
                  borderColor: pickerAmPm === "am" ? colors.primary : colors.border,
                  backgroundColor: pickerAmPm === "am" ? `${colors.primary}15` : colors.surface,
                }}
              >
                <Text className="text-base font-bold" style={{ color: pickerAmPm === "am" ? colors.primary : colors.foreground }}>
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
              >
                <Text className="text-base font-bold" style={{ color: pickerAmPm === "pm" ? colors.primary : colors.foreground }}>
                  مساءً
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hour/Minute picker */}
            <View className="flex-row items-center gap-4 mb-6">
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

            <Text className="text-base text-muted mb-6">
              {formatTime12(get24Hour(), pickerMinute)}
            </Text>

            <TouchableOpacity
              onPress={confirmEditTime}
              className="w-full py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">تأكيد</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEditingTimeIndex(null)}
              className="mt-4 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // === الشاشة الرئيسية للتعديل ===
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6" style={{ flexDirection: "row-reverse" }}>
            <Text className="text-2xl font-bold text-foreground" style={{ writingDirection: "rtl" }}>
              تعديل الدواء
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialIcons name="close" size={28} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* اسم الدواء */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-muted mb-2 text-right" style={{ writingDirection: "rtl" }}>
              💊 اسم الدواء
            </Text>
            <TextInput
              value={medName}
              onChangeText={setMedName}
              className="w-full py-3 px-4 rounded-xl text-right"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.foreground,
                writingDirection: "rtl",
                fontSize: 16,
              }}
            />
          </View>

          {/* الجرعة */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-muted mb-2 text-right" style={{ writingDirection: "rtl" }}>
              💊 الجرعة
            </Text>
            <View className="flex-row flex-wrap gap-2" style={{ flexDirection: "row-reverse" }}>
              {DOSAGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setDosage(dosage === opt ? "" : opt)}
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    borderColor: dosage === opt ? colors.primary : colors.border,
                    backgroundColor: dosage === opt ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-bold" style={{ color: dosage === opt ? colors.primary : colors.foreground }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setDosage(dosage === "custom" ? "" : "custom")}
                className="px-3 py-2 rounded-lg border"
                style={{
                  borderColor: dosage === "custom" ? colors.primary : colors.border,
                  backgroundColor: dosage === "custom" ? `${colors.primary}15` : colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-bold" style={{ color: dosage === "custom" ? colors.primary : colors.foreground }}>
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
                className="w-full py-2 px-3 rounded-lg text-right mt-2"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                  writingDirection: "rtl",
                }}
              />
            )}
          </View>

          {/* الملاحظة */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-muted mb-2 text-right" style={{ writingDirection: "rtl" }}>
              📝 ملاحظة
            </Text>
            <View className="flex-row flex-wrap gap-2" style={{ flexDirection: "row-reverse" }}>
              {NOTE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setNote(note === opt ? "" : opt)}
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    borderColor: note === opt ? colors.primary : colors.border,
                    backgroundColor: note === opt ? `${colors.primary}15` : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-bold" style={{ color: note === opt ? colors.primary : colors.foreground }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setNote(note === "custom" ? "" : "custom")}
                className="px-3 py-2 rounded-lg border"
                style={{
                  borderColor: note === "custom" ? colors.primary : colors.border,
                  backgroundColor: note === "custom" ? `${colors.primary}15` : colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-bold" style={{ color: note === "custom" ? colors.primary : colors.foreground }}>
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
                className="w-full py-2 px-3 rounded-lg text-right mt-2"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                  writingDirection: "rtl",
                }}
              />
            )}
          </View>

          {/* الأوقات */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-muted mb-2 text-right" style={{ writingDirection: "rtl" }}>
              ⏰ أوقات التناول
            </Text>
            {times.map((t, i) => {
              const period = TIME_PERIODS.find((p) => p.id === t.period);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => startEditTime(i)}
                  className="w-full py-3 px-4 rounded-xl mb-2 flex-row items-center justify-between"
                  style={{ backgroundColor: colors.surface, flexDirection: "row-reverse" }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{period?.emoji}</Text>
                    <Text className="text-base font-bold text-foreground">{period?.label}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text className="text-base text-foreground">{formatTime12(t.hour, t.minute)}</Text>
                    <MaterialIcons name="edit" size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* التكرار */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-muted mb-2 text-right" style={{ writingDirection: "rtl" }}>
              📅 التكرار
            </Text>
            <View className="flex-row gap-2" style={{ flexDirection: "row-reverse" }}>
              {(["daily", "weekly", "monthly"] as MedicationFrequency[]).map((freq) => {
                const labels = { daily: "يومياً", weekly: "أسبوعياً", monthly: "شهرياً" };
                return (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    className="px-4 py-2 rounded-lg border"
                    style={{
                      borderColor: frequency === freq ? colors.primary : colors.border,
                      backgroundColor: frequency === freq ? `${colors.primary}15` : colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-bold" style={{ color: frequency === freq ? colors.primary : colors.foreground }}>
                      {labels[freq]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* يوم الأسبوع */}
            {frequency === "weekly" && (
              <View
                style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, paddingVertical: 8, marginTop: 8, justifyContent: "center" }}
              >
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    onPress={() => setDayOfWeek(day.id)}
                    className="px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: dayOfWeek === day.id ? colors.primary : colors.border,
                      backgroundColor: dayOfWeek === day.id ? `${colors.primary}15` : colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold" style={{ color: dayOfWeek === day.id ? colors.primary : colors.foreground }}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* يوم الشهر */}
            {frequency === "monthly" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
                style={{ marginTop: 8 }}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setDayOfMonth(day)}
                    className="w-10 h-10 rounded-full items-center justify-center border"
                    style={{
                      borderColor: dayOfMonth === day ? colors.primary : colors.border,
                      backgroundColor: dayOfMonth === day ? `${colors.primary}15` : "transparent",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold" style={{ color: dayOfMonth === day ? colors.primary : colors.foreground }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* أزرار الحفظ والحذف */}
          <TouchableOpacity
            onPress={handleSave}
            className="w-full py-4 rounded-2xl items-center mt-4"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">💾 حفظ التعديلات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            className="w-full py-4 rounded-2xl items-center mt-3"
            style={{ backgroundColor: colors.error + "15", borderWidth: 1, borderColor: colors.error }}
            activeOpacity={0.8}
          >
            <Text className="text-lg font-bold" style={{ color: colors.error }}>🗑️ حذف الدواء</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

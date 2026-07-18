import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useMedication } from "@/lib/medication-context";
import { useWater } from "@/lib/water-context";
import { useUser } from "@/lib/user-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function WellnessScreen() {
  const colors = useColors();
  const { state } = useMedication();
  const { state: waterState } = useWater();
  const { profile } = useUser();

  const activeMeds = state.medications.filter((m) => m.isActive);
  const hasMeds = activeMeds.length > 0;

  const waterSetupDone = waterState.settings.setupComplete;
  const waterProgress = waterState.settings.dailyGoalMl > 0
    ? Math.min(100, Math.round((waterState.todayLog.totalMl / waterState.settings.dailyGoalMl) * 100))
    : 0;
  const waterCupsToday = waterState.todayLog.cupsCount;
  const waterTotalCups = Math.ceil(waterState.settings.dailyGoalMl / waterState.settings.cupSizeMl);

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View style={{ alignItems: "flex-end" }}>
            <Text
              className="text-2xl font-bold text-foreground"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              عافيتي 💚
            </Text>
            <Text
              className="text-base text-muted mt-1"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              صحتك تهمنا، ونحن هنا لنساعدك
            </Text>
          </View>
        </View>

        {/* قسم رفيق الدواء */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="px-5 mb-4">
          <TouchableOpacity
            onPress={() => router.push("/sections/wellness/medication-home" as any)}
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: "#F0F7EC",
              borderColor: `${colors.primary}30`,
            }}
            activeOpacity={0.7}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: "row-reverse" }}
            >
              <View className="flex-row items-center" style={{ flexDirection: "row-reverse" }}>
                <View
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Text style={{ fontSize: 28 }}>💊</Text>
                </View>
                <View className="mr-4" style={{ alignItems: "flex-end" }}>
                  <Text
                    className="text-lg font-bold text-foreground"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    رفيق الدواء
                  </Text>
                  <Text
                    className="text-sm text-muted mt-1"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    {hasMeds
                      ? `${activeMeds.length} ${activeMeds.length === 1 ? "دواء" : "أدوية"} مسجلة`
                      : "سجّل أدويتك ونذكّرك بمواعيدها"}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-left" size={24} color={colors.muted} />
            </View>

            {/* عرض ملخص الأدوية إذا وجدت */}
            {hasMeds && (
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: `${colors.primary}15` }}>
                {activeMeds.slice(0, 3).map((med, idx) => (
                  <View
                    key={med.id}
                    className="flex-row items-center py-2"
                    style={{ flexDirection: "row-reverse" }}
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}15` }}
                    >
                      <Text style={{ fontSize: 14 }}>💊</Text>
                    </View>
                    <Text
                      className="text-sm font-medium text-foreground flex-1 mr-3"
                      style={{ textAlign: "right" }}
                    >
                      {med.name}
                    </Text>
                    <Text className="text-xs text-muted">
                      {med.frequency === "daily"
                        ? `${med.timesPerDay}x يومياً`
                        : med.frequency === "weekly"
                          ? "أسبوعياً"
                          : "شهرياً"}
                    </Text>
                  </View>
                ))}
                {activeMeds.length > 3 && (
                  <Text className="text-xs text-muted text-center mt-2">
                    +{activeMeds.length - 3} أدوية أخرى
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* قسم شرب الماء */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} className="px-5 mb-4">
          <TouchableOpacity
            onPress={() => {
              if (waterSetupDone) {
                router.push("/sections/wellness/water-home" as any);
              } else {
                router.push("/sections/wellness/water-setup" as any);
              }
            }}
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: "#EDF7FF",
              borderColor: "#B3D9FF30",
            }}
            activeOpacity={0.7}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: "row-reverse" }}
            >
              <View className="flex-row items-center" style={{ flexDirection: "row-reverse" }}>
                <View
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: "#B3D9FF30" }}
                >
                  <Text style={{ fontSize: 28 }}>💧</Text>
                </View>
                <View className="mr-4" style={{ alignItems: "flex-end" }}>
                  <Text
                    className="text-lg font-bold text-foreground"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    رفيق الماء
                  </Text>
                  <Text
                    className="text-sm text-muted mt-1"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    {waterSetupDone
                      ? `${waterCupsToday} من ${waterTotalCups} أكواب اليوم`
                      : "تابع صحتك المائية وحافظ على ترطيب جسمك"}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-left" size={24} color={colors.muted} />
            </View>

            {/* شريط التقدم إذا تم الإعداد */}
            {waterSetupDone && (
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: "#B3D9FF20" }}>
                <View className="flex-row items-center justify-between mb-2" style={{ flexDirection: "row-reverse" }}>
                  <Text
                    className="text-xs text-muted"
                    style={{ writingDirection: "rtl" }}
                  >
                    {waterProgress}% من الهدف اليومي
                  </Text>
                  <Text className="text-xs" style={{ color: "#2196F3" }}>
                    {waterState.todayLog.totalMl} / {waterState.settings.dailyGoalMl} مل
                  </Text>
                </View>
                <View
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#E3F2FD" }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${waterProgress}%`,
                      backgroundColor: waterProgress >= 100 ? "#4CAF50" : "#2196F3",
                    }}
                  />
                </View>
                {waterProgress >= 100 && (
                  <Text
                    className="text-xs mt-2 text-center"
                    style={{ color: "#4CAF50", writingDirection: "rtl" }}
                  >
                    🎉 أكملت هدفك اليومي!
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* بطاقة تحفيزية */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-5 mt-2">
          <View
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}20`,
            }}
          >
            <View
              className="flex-row items-center mb-2"
              style={{ flexDirection: "row-reverse" }}
            >
              <Text className="text-lg mr-2">🌿</Text>
              <Text
                className="text-base font-bold"
                style={{ color: colors.primary }}
              >
                دعاء العافية
              </Text>
            </View>
            <Text
              className="text-sm text-muted leading-6"
              style={{ textAlign: "right", writingDirection: "rtl" }}
            >
              «اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت»
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

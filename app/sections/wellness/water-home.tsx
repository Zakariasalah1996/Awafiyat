import { useEffect, useState, useCallback } from "react";
import { Text, View, TouchableOpacity, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWater, type WaterDayLog } from "@/lib/water-context";
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle } from "react-native-svg";

// ============================================================
// شاشة شرب الماء الرئيسية - العداد الدائري + تسجيل الأكواب
// ============================================================

const CIRCLE_SIZE = 220;
const STROKE_WIDTH = 14;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// رسائل تشجيعية
const ENCOURAGEMENT_MESSAGES = [
  "أحسنت! استمر 💪",
  "رائع! جسمك يشكرك 💧",
  "ممتاز! كل كوب يصنع فرقاً ✨",
  "بارك الله فيك! 🌿",
  "هيا نكمل المشوار! 🎯",
  "صحتك أولوية! 💙",
];

const COMPLETION_MESSAGES = [
  "🎉 مبارك! أكملت هدفك اليومي!",
  "🏆 بطل! شربت كل الماء المطلوب!",
  "✨ رائع! جسمك ممتن لك اليوم!",
];

export default function WaterHomeScreen() {
  const colors = useColors();
  const {
    state,
    drinkCup,
    undoLastCup,
    getProgressPercent,
    getRemainingCups,
    getRemainingMl,
    getTotalCupsGoal,
    getWeekLog,
    updateSettings,
  } = useWater();

  const [weekLog, setWeekLog] = useState<WaterDayLog[]>([]);
  const [showMessage, setShowMessage] = useState("");
  const buttonScale = useSharedValue(1);

  const progress = getProgressPercent();
  const remainingCups = getRemainingCups();
  const totalCups = getTotalCupsGoal();
  const isComplete = progress >= 100;

  // تحميل سجل الأسبوع
  useEffect(() => {
    loadWeekLog();
  }, [state.todayLog.cupsCount]);

  const loadWeekLog = async () => {
    const logs = await getWeekLog();
    setWeekLog(logs);
  };

  // حساب strokeDashoffset
  const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * Math.min(progress, 100)) / 100;

  const handleDrinkCup = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    buttonScale.value = withSpring(0.9, { damping: 15 }, () => {
      buttonScale.value = withSpring(1);
    });

    await drinkCup();

    // رسالة تشجيعية
    const newProgress = ((state.todayLog.totalMl + state.settings.cupSizeMl) / state.settings.dailyGoalMl) * 100;
    if (newProgress >= 100) {
      const msg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      setShowMessage(msg);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (state.todayLog.cupsCount % 3 === 2) {
      // كل 3 أكواب رسالة تشجيعية
      const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
      setShowMessage(msg);
    }

    // إخفاء الرسالة بعد 3 ثوانٍ
    setTimeout(() => setShowMessage(""), 3000);
  }, [state, drinkCup, buttonScale]);

  const handleUndo = useCallback(async () => {
    if (state.todayLog.cupsCount <= 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await undoLastCup();
  }, [state.todayLog.cupsCount, undoLastCup]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // أيام الأسبوع بالعربي
  const dayNames = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

  return (
    <ScreenContainer className="px-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                className="text-2xl font-bold text-foreground"
                style={{ writingDirection: "rtl" }}
              >
                💧 رفيق الماء
              </Text>
              <Text
                className="text-sm text-muted mt-1"
                style={{ writingDirection: "rtl" }}
              >
                هدفك: {totalCups} أكواب ({(state.settings.dailyGoalMl / 1000).toFixed(1)} لتر)
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/sections/wellness/water-settings" as any)}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.border}50` }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="settings" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* العداد الدائري */}
        <Animated.View entering={FadeInUp.duration(500)} className="items-center mt-6 mb-4">
          <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, position: "relative" }}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* الدائرة الخلفية */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={colors.border}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                opacity={0.3}
              />
              {/* الدائرة المتقدمة */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={isComplete ? "#4CAF50" : "#2196F3"}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            {/* المحتوى داخل الدائرة */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isComplete ? (
                <>
                  <Text style={{ fontSize: 36 }}>🎉</Text>
                  <Text className="text-sm font-bold mt-1" style={{ color: "#4CAF50" }}>
                    أكملت الهدف!
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-4xl font-bold" style={{ color: "#2196F3" }}>
                    {state.todayLog.cupsCount}
                  </Text>
                  <Text className="text-sm text-muted">من {totalCups} أكواب</Text>
                  <Text className="text-lg font-bold mt-1" style={{ color: "#2196F3" }}>
                    {progress}%
                  </Text>
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* رسالة تشجيعية */}
        {showMessage ? (
          <Animated.View entering={FadeInDown.duration(300)} className="px-6 mb-4">
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: isComplete ? "#E8F5E9" : "#E3F2FD" }}
            >
              <Text
                className="text-sm font-medium text-center"
                style={{ color: isComplete ? "#2E7D32" : "#1565C0", writingDirection: "rtl" }}
              >
                {showMessage}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* معلومات سريعة */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="px-6 mb-6">
          <View className="flex-row" style={{ flexDirection: "row-reverse", gap: 12 }}>
            <View
              className="flex-1 rounded-xl p-4 items-center"
              style={{ backgroundColor: "#EDF7FF" }}
            >
              <Text style={{ fontSize: 20 }}>🥤</Text>
              <Text className="text-lg font-bold mt-1" style={{ color: "#2196F3" }}>
                {state.todayLog.totalMl} مل
              </Text>
              <Text className="text-xs text-muted mt-1">شربت اليوم</Text>
            </View>
            <View
              className="flex-1 rounded-xl p-4 items-center"
              style={{ backgroundColor: "#FFF3E0" }}
            >
              <Text style={{ fontSize: 20 }}>⏳</Text>
              <Text className="text-lg font-bold mt-1" style={{ color: "#F57C00" }}>
                {remainingCups}
              </Text>
              <Text className="text-xs text-muted mt-1">أكواب متبقية</Text>
            </View>
            <View
              className="flex-1 rounded-xl p-4 items-center"
              style={{ backgroundColor: "#E8F5E9" }}
            >
              <Text style={{ fontSize: 20 }}>💪</Text>
              <Text className="text-lg font-bold mt-1" style={{ color: "#388E3C" }}>
                {getRemainingMl()} مل
              </Text>
              <Text className="text-xs text-muted mt-1">متبقي</Text>
            </View>
          </View>
        </Animated.View>

        {/* زر شربت كوب */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} className="px-6 mb-6">
          <Animated.View style={animatedButtonStyle}>
            <TouchableOpacity
              onPress={handleDrinkCup}
              className="w-full py-5 rounded-2xl items-center flex-row justify-center"
              style={{
                backgroundColor: isComplete ? "#4CAF50" : "#2196F3",
                flexDirection: "row-reverse",
                gap: 10,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24 }}>💧</Text>
              <Text className="text-white text-xl font-bold">
                {isComplete ? "شربت كوب إضافي" : "شربت كوب"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* زر تراجع */}
          {state.todayLog.cupsCount > 0 && (
            <TouchableOpacity
              onPress={handleUndo}
              className="mt-3 py-2 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-sm text-muted">↩️ تراجع عن آخر كوب</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* سجل الأسبوع */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-6">
          <Text
            className="text-base font-bold text-foreground mb-3"
            style={{ textAlign: "right", writingDirection: "rtl" }}
          >
            سجل الأسبوع
          </Text>
          <View
            className="rounded-2xl p-4 border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row justify-between" style={{ flexDirection: "row-reverse" }}>
              {weekLog.slice(-7).map((log, idx) => {
                const dayProgress = log.goalMl > 0 ? Math.min(100, Math.round((log.totalMl / log.goalMl) * 100)) : 0;
                const isToday = log.date === state.todayLog.date;
                const date = new Date(log.date);
                const dayIdx = date.getDay(); // 0=Sunday
                // تحويل لنظام عربي (0=سبت)
                const arabicDayIdx = (dayIdx + 1) % 7;
                
                return (
                  <View key={log.date || idx} className="items-center" style={{ flex: 1 }}>
                    <Text
                      className="text-xs mb-2"
                      style={{ color: isToday ? "#2196F3" : colors.muted, fontWeight: isToday ? "700" : "400" }}
                    >
                      {dayNames[arabicDayIdx]}
                    </Text>
                    {/* شريط عمودي */}
                    <View
                      className="w-5 rounded-full overflow-hidden"
                      style={{ height: 50, backgroundColor: `${colors.border}40` }}
                    >
                      <View
                        className="w-full rounded-full"
                        style={{
                          height: `${dayProgress}%`,
                          backgroundColor: dayProgress >= 100 ? "#4CAF50" : "#2196F3",
                          position: "absolute",
                          bottom: 0,
                        }}
                      />
                    </View>
                    <Text
                      className="text-xs mt-1"
                      style={{ color: dayProgress >= 100 ? "#4CAF50" : colors.muted }}
                    >
                      {dayProgress}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* نصيحة يومية */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} className="px-6 mt-5">
          <View
            className="rounded-2xl p-4 border"
            style={{ backgroundColor: "#F3E5F5", borderColor: "#CE93D820" }}
          >
            <Text
              className="text-sm leading-6 text-center"
              style={{ color: "#6A1B9A", writingDirection: "rtl" }}
            >
              🌿 هل تعلم؟ شرب الماء الكافي يُحسّن التركيز والذاكرة، ويُقلل الصداع، ويُنعش البشرة!
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

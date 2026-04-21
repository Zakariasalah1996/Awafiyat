import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAlarm } from "@/lib/alarm-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

// إضاءة الشاشة عند المنبه
let Brightness: any = null;
try {
  if (Platform.OS !== "web") {
    Brightness = require("expo-brightness");
  }
} catch {}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MEAL_LABELS: Record<string, string> = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🍲",
  dinner: "🥘",
};

const MEAL_GREETINGS: Record<string, string> = {
  breakfast: "صباح الخير! حان وقت إعداد الفطور",
  lunch: "حان وقت الغداء! هل أنتِ مستعدة؟",
  dinner: "مساء الخير! حان وقت إعداد العشاء",
};

// ألوان دافئة لكل وجبة
const MEAL_COLORS: Record<string, { bg: string; accent: string; light: string }> = {
  breakfast: { bg: "#FFF8E1", accent: "#F59E0B", light: "#FFFBEB" },
  lunch: { bg: "#F0FDF4", accent: "#4A7C59", light: "#ECFDF5" },
  dinner: { bg: "#EFF6FF", accent: "#3B82F6", light: "#F0F9FF" },
};

const DEFAULT_COLORS = { bg: "#F0FDF4", accent: "#4A7C59", light: "#ECFDF5" };

export function AlarmScreen() {
  const { alarm, stopAlarm } = useAlarm();
  const router = useRouter();

  // أنيميشن لطيف - نبض هادئ بدلاً من اهتزاز عنيف
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const prevBrightnessRef = useRef<number | null>(null);

  useEffect(() => {
    if (!alarm.isRinging) return;

    // إضاءة الشاشة وإبقائها مضاءة
    if (Platform.OS !== "web") {
      activateKeepAwakeAsync("alarm").catch(() => {});
      // رفع سطوع الشاشة للحد الأقصى
      if (Brightness) {
        Brightness.getBrightnessAsync?.().then((b: number) => {
          prevBrightnessRef.current = b;
          Brightness.setBrightnessAsync?.(1.0).catch(() => {});
        }).catch(() => {});
      }
    }

    // ظهور تدريجي لطيف
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // نبض هادئ ولطيف للأيقونة
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      // إعادة السطوع الأصلي وإلغاء إبقاء الشاشة
      if (Platform.OS !== "web") {
        deactivateKeepAwake("alarm");
        if (Brightness && prevBrightnessRef.current !== null) {
          Brightness.setBrightnessAsync?.(prevBrightnessRef.current).catch(() => {});
        }
      }
    };
  }, [alarm.isRinging]);

  if (!alarm.isRinging) return null;

  const mealType = alarm.mealType || "lunch";
  const mealLabel = MEAL_LABELS[mealType] || "الوجبة";
  const mealIcon = MEAL_ICONS[mealType] || "🍽️";
  const greeting = MEAL_GREETINGS[mealType] || `حان وقت إعداد ${mealLabel}!`;
  const colors = MEAL_COLORS[mealType] || DEFAULT_COLORS;

  const handleViewRecipe = () => {
    stopAlarm();
    if (alarm.recipeId) {
      router.push({
        pathname: "/sections/recipe-detail" as any,
        params: { id: alarm.recipeId },
      });
    }
  };

  const handleDismiss = () => {
    stopAlarm();
  };

  // الحصول على الوقت الحالي بالعربي
  const now = new Date();
  const timeStr = now.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: colors.bg, opacity: fadeAnim },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* الوقت الحالي */}
        <Text style={[styles.timeText, { color: colors.accent + "99" }]}>
          {timeStr}
        </Text>

        {/* أيقونة الوجبة - نبض لطيف */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.light,
              borderColor: colors.accent + "30",
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.mealIcon}>{mealIcon}</Text>
        </Animated.View>

        {/* التحية اللطيفة */}
        <Text style={[styles.greeting, { color: colors.accent }]}>
          {greeting}
        </Text>

        {/* اسم الوصفة المقترحة */}
        {alarm.recipeName ? (
          <View style={[styles.recipeCard, { backgroundColor: "#FFFFFF", borderColor: colors.accent + "20" }]}>
            <Text style={[styles.recipeLabel, { color: "#9CA3AF" }]}>
              الوصفة المقترحة لكِ
            </Text>
            <Text style={[styles.recipeName, { color: "#1F2937" }]}>
              {alarm.recipeName}
            </Text>
          </View>
        ) : null}

        {/* الأزرار */}
        <View style={styles.buttonsContainer}>
          {/* زر عرض الوصفة - الزر الرئيسي */}
          {alarm.recipeId ? (
            <TouchableOpacity
              onPress={handleViewRecipe}
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonIcon}>📖</Text>
              <Text style={styles.primaryButtonText}>عرض الوصفة</Text>
            </TouchableOpacity>
          ) : null}

          {/* زر إيقاف المنبه */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={[
              styles.dismissButton,
              {
                backgroundColor: alarm.recipeId ? "#FFFFFF" : colors.accent,
                borderColor: colors.accent + "40",
                borderWidth: alarm.recipeId ? 1.5 : 0,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonIcon}>✕</Text>
            <Text
              style={[
                styles.dismissButtonText,
                { color: alarm.recipeId ? colors.accent : "#FFFFFF" },
              ]}
            >
              إيقاف
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
    maxWidth: 400,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 24,
    letterSpacing: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
  },
  mealIcon: {
    fontSize: 56,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 34,
  },
  recipeCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeLabel: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: "center",
  },
  recipeName: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonIcon: {
    fontSize: 22,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  dismissButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dismissButtonIcon: {
    fontSize: 18,
    color: "inherit",
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

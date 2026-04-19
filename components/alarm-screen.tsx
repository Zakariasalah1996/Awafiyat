import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useAlarm } from "@/lib/alarm-context";
import { useColors } from "@/hooks/use-colors";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
};

export function AlarmScreen() {
  const { alarm, stopAlarm } = useAlarm();
  const colors = useColors();
  const router = useRouter();

  // أنيميشن نبض للجرس
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alarm.isRinging) return;

    // نبض متكرر
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    // اهتزاز الجرس
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ])
    );

    pulse.start();
    shake.start();

    return () => {
      pulse.stop();
      shake.stop();
    };
  }, [alarm.isRinging]);

  if (!alarm.isRinging) return null;

  const mealLabel = MEAL_LABELS[alarm.mealType] || "الوجبة";

  return (
    <View style={[styles.overlay, { backgroundColor: "#000000ee" }]}>
      <View style={styles.container}>
        {/* أيقونة الجرس المتحركة */}
        <Animated.View
          style={{
            transform: [
              { scale: pulseAnim },
              { translateX: shakeAnim },
            ],
          }}
        >
          <Text style={styles.bellIcon}>🔔</Text>
        </Animated.View>

        {/* العنوان */}
        <Text style={[styles.title, { color: "#ffffff" }]}>
          حان وقت {mealLabel}!
        </Text>

        {/* اسم الوصفة */}
        {alarm.recipeName ? (
          <View style={[styles.recipeCard, { backgroundColor: colors.primary + "30" }]}>
            <Text style={[styles.recipeLabel, { color: "#ffffffaa" }]}>
              الوصفة المخططة:
            </Text>
            <Text style={[styles.recipeName, { color: "#ffffff" }]}>
              {alarm.recipeName}
            </Text>
          </View>
        ) : null}

        {/* زر إيقاف المنبه - كبير وواضح */}
        <TouchableOpacity
          onPress={stopAlarm}
          style={[styles.stopButton, { backgroundColor: "#EF4444" }]}
          activeOpacity={0.8}
        >
          <Text style={styles.stopButtonText}>إيقاف المنبه</Text>
        </TouchableOpacity>

        {/* زر عرض الوصفة */}
        {alarm.recipeId ? (
          <TouchableOpacity
            onPress={() => {
              stopAlarm();
              router.push({
                pathname: "/sections/recipe-detail" as any,
                params: { id: alarm.recipeId },
              });
            }}
            style={[styles.viewButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>عرض الوصفة</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
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
  },
  bellIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  recipeCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    width: "100%",
    alignItems: "center",
  },
  recipeLabel: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  recipeName: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 32,
  },
  stopButton: {
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  viewButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

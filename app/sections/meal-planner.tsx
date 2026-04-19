import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  Platform,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { RECIPES, getRecipesByMealType } from "@/lib/data/recipes";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getFoodCategoryImage } from "@/lib/food-category-images";
import { getRecipeCustomImage } from "@/lib/recipe-image-sync";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleAllMealReminders } from "@/lib/notifications";
import { useAlarm } from "@/lib/alarm-context";

I18nManager.forceRTL(true);

const DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const MEAL_PLAN_STORAGE_KEY = "@awafiyat_meal_plan";
const MEAL_TIMES_STORAGE_KEY = "@awafiyat_meal_times";
const TIMES_SET_KEY = "@awafiyat_times_set";

// تحويل الفترة إلى عربي
const getPeriodLabel = (hour: number): string => {
  if (hour >= 5 && hour < 12) return "صباحاً";
  if (hour >= 12 && hour < 17) return "ظهراً";
  return "مساءً";
};

// إنشاء قائمة الأوقات المتاحة
const generateTimeOptions = (): { value: string; label: string; hour: number }[] => {
  const options: { value: string; label: string; hour: number }[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hour12 = h % 12 || 12;
      const minuteStr = String(m).padStart(2, "0");
      const period = getPeriodLabel(h);
      const value = `${String(h).padStart(2, "0")}:${minuteStr}`;
      const label = `${hour12}:${minuteStr} ${period}`;
      options.push({ value, label, hour: h });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const MEALS = [
  { key: "breakfast" as const, label: "فطور", emoji: "🌅", defaultTime: "08:00" },
  { key: "lunch" as const, label: "غداء", emoji: "☀️", defaultTime: "13:00" },
  { key: "dinner" as const, label: "عشاء", emoji: "🌙", defaultTime: "20:00" },
];

// تحويل الوقت المخزن إلى عرض عربي
const formatTimeArabic = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours);
  const hour12 = h % 12 || 12;
  const period = getPeriodLabel(h);
  return `${hour12}:${minutes} ${period}`;
};

interface MealPlan {
  [day: string]: {
    breakfast: { recipeId: string; recipeName: string } | null;
    lunch: { recipeId: string; recipeName: string } | null;
    dinner: { recipeId: string; recipeName: string } | null;
  };
}

interface MealTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export default function MealPlannerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile, updateProfile } = useUser();
  const isSubscribed = profile.isSubscribed;

  const [step, setStep] = useState<"times" | "plan" | "done">("times");
  const [mealTimes, setMealTimes] = useState<MealTimes>({
    breakfast: "08:00",
    lunch: "13:00",
    dinner: "20:00",
  });
  const [selectedDay, setSelectedDay] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    const plan: MealPlan = {};
    DAYS.forEach((day) => {
      plan[day] = { breakfast: null, lunch: null, dinner: null };
    });
    return plan;
  });
  const [showRecipePicker, setShowRecipePicker] = useState<{
    day: string;
    meal: "breakfast" | "lunch" | "dinner";
  } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<"breakfast" | "lunch" | "dinner" | null>(null);
  const [timesAlreadySet, setTimesAlreadySet] = useState(false);
  const [loading, setLoading] = useState(true);

  // منبه الطبخ - يستخدم AlarmContext العالمي
  const { alarm, startAlarm: globalStartAlarm, stopAlarm: globalStopAlarm } = useAlarm();

  // تحميل البيانات المحفوظة
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTimes, savedPlan, savedTimesSet] = await Promise.all([
          AsyncStorage.getItem(MEAL_TIMES_STORAGE_KEY),
          AsyncStorage.getItem(MEAL_PLAN_STORAGE_KEY),
          AsyncStorage.getItem(TIMES_SET_KEY),
        ]);
        if (savedTimes) {
          setMealTimes(JSON.parse(savedTimes));
        }
        if (savedPlan) {
          setMealPlan(JSON.parse(savedPlan));
        }
        if (savedTimesSet === "true") {
          setTimesAlreadySet(true);
          setStep("plan"); // تخطي شاشة الأوقات إذا سبق تحديدها
        }
      } catch (e) {
        console.error("Failed to load meal data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // حفظ الأوقات عند التغيير
  const saveMealTimes = async (times: MealTimes) => {
    try {
      await AsyncStorage.setItem(MEAL_TIMES_STORAGE_KEY, JSON.stringify(times));
    } catch (e) {
      console.error("Failed to save meal times:", e);
    }
  };

  // حفظ الجدول عند التغيير
  const saveMealPlan = async (plan: MealPlan) => {
    try {
      await AsyncStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {
      console.error("Failed to save meal plan:", e);
    }
  };

  // تشغيل المنبه عبر AlarmContext العالمي
  const handleStartAlarm = useCallback((recipeName: string, recipeId?: string) => {
    globalStartAlarm(recipeName, recipeId);
  }, [globalStartAlarm]);

  const availableDays = isSubscribed ? DAYS : DAYS.slice(0, 2);

  const suggestedRecipes = useMemo(() => {
    if (!showRecipePicker) return [];
    const mealType = showRecipePicker.meal;
    let recipes = getRecipesByMealType(mealType);
    if (profile.healthCondition !== "none") {
      recipes.sort((a, b) => {
        const aMatch =
          a.healthTags.includes(profile.healthCondition as any) ||
          a.healthTags.includes("all");
        const bMatch =
          b.healthTags.includes(profile.healthCondition as any) ||
          b.healthTags.includes("all");
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    return recipes.slice(0, 20);
  }, [showRecipePicker, profile.healthCondition]);

  const handleAutoFill = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const newPlan: MealPlan = {};
    const breakfastRecipes = getRecipesByMealType("breakfast");
    const lunchRecipes = getRecipesByMealType("lunch");
    const dinnerRecipes = getRecipesByMealType("dinner");

    // خلط الوصفات عشوائياً لمنع التكرار
    const shuffled = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledBreakfast = shuffled(breakfastRecipes);
    const shuffledLunch = shuffled(lunchRecipes);
    const shuffledDinner = shuffled(dinnerRecipes);

    // تتبع الوصفات المستخدمة لمنع التكرار
    const usedBreakfast = new Set<string>();
    const usedLunch = new Set<string>();
    const usedDinner = new Set<string>();

    availableDays.forEach((day, index) => {
      // اختيار وصفة غير مكررة
      const pickUnique = (recipes: typeof breakfastRecipes, used: Set<string>) => {
        for (const r of recipes) {
          if (!used.has(r.id)) {
            used.add(r.id);
            return { recipeId: r.id, recipeName: r.name };
          }
        }
        // إذا نفذت الوصفات، نبدأ من جديد
        if (recipes.length > 0) {
          const r = recipes[index % recipes.length];
          return { recipeId: r.id, recipeName: r.name };
        }
        return null;
      };

      newPlan[day] = {
        breakfast: pickUnique(shuffledBreakfast, usedBreakfast),
        lunch: pickUnique(shuffledLunch, usedLunch),
        dinner: pickUnique(shuffledDinner, usedDinner),
      };
    });

    DAYS.forEach((day) => {
      if (!newPlan[day]) {
        newPlan[day] = { breakfast: null, lunch: null, dinner: null };
      }
    });
    setMealPlan(newPlan);
    saveMealPlan(newPlan);
  }, [availableDays, profile.healthCondition]);

  const selectRecipe = (recipeId: string, recipeName: string) => {
    if (!showRecipePicker) return;
    const updated = {
      ...mealPlan,
      [showRecipePicker.day]: {
        ...mealPlan[showRecipePicker.day],
        [showRecipePicker.meal]: { recipeId, recipeName },
      },
    };
    setMealPlan(updated);
    saveMealPlan(updated);
    setShowRecipePicker(null);
  };

  const handleSelectTime = (mealKey: "breakfast" | "lunch" | "dinner", timeValue: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = { ...mealTimes, [mealKey]: timeValue };
    setMealTimes(updated);
    saveMealTimes(updated);
    setShowTimePicker(null);
  };

  const getFilteredTimeOptions = (mealKey: "breakfast" | "lunch" | "dinner") => {
    switch (mealKey) {
      case "breakfast":
        return TIME_OPTIONS.filter((t) => t.hour >= 5 && t.hour <= 11);
      case "lunch":
        return TIME_OPTIONS.filter((t) => t.hour >= 11 && t.hour <= 16);
      case "dinner":
        return TIME_OPTIONS.filter((t) => t.hour >= 17 && t.hour <= 23);
      default:
        return TIME_OPTIONS;
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted" style={{ fontSize: 16 }}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // شاشة المنبه الآن تُعرض عبر AlarmScreen في _layout.tsx (فوق كل شيء)

  // شاشة ضبط أوقات الوجبات
  if (step === "times") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View
            className="px-5 pt-4 pb-2 flex-row items-center justify-between"
            style={{ flexDirection: "row-reverse" }}
          >
            <Text
              className="text-foreground font-bold"
              style={{ fontSize: 22, textAlign: "right" }}
            >
              جدول الطبخ
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="chevron.right" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View className="px-5 mt-4">
            <Text
              className="text-foreground font-bold mb-1"
              style={{ fontSize: 18, textAlign: "right", writingDirection: "rtl" }}
            >
              ما أوقات وجباتك المعتادة؟
            </Text>
            <Text
              className="text-muted mb-6"
              style={{ fontSize: 14, textAlign: "right", writingDirection: "rtl" }}
            >
              حددي أوقات الطبخ لنذكّرك في الوقت المناسب
            </Text>

            {MEALS.map((meal) => (
              <View
                key={meal.key}
                className="rounded-2xl p-5 mb-4"
                style={{ backgroundColor: colors.surface }}
              >
                <View
                  className="flex-row items-center gap-3 mb-3"
                  style={{ flexDirection: "row-reverse" }}
                >
                  <Text style={{ fontSize: 28 }}>{meal.emoji}</Text>
                  <Text
                    className="text-foreground font-bold"
                    style={{ fontSize: 17 }}
                  >
                    متى تعدّين {meal.label === "فطور" ? "الفطور" : meal.label === "غداء" ? "الغداء" : "العشاء"}؟
                  </Text>
                </View>

                {/* زر اختيار الوقت */}
                <TouchableOpacity
                  onPress={() => setShowTimePicker(meal.key)}
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row-reverse",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, color: colors.primary }}>🕐</Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: colors.foreground,
                    }}
                  >
                    {formatTimeArabic(mealTimes[meal.key])}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={async () => {
                await saveMealTimes(mealTimes);
                await AsyncStorage.setItem(TIMES_SET_KEY, "true");
                setTimesAlreadySet(true);
                setStep("plan");
              }}
              className="rounded-2xl py-4 items-center mt-2"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold" style={{ fontSize: 17 }}>
                تم، نبدأ نخطط الجدول
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(null)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "60%",
                paddingBottom: 30,
              }}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.foreground,
                    textAlign: "right",
                  }}
                >
                  {showTimePicker === "breakfast"
                    ? "🌅 وقت الفطور"
                    : showTimePicker === "lunch"
                    ? "☀️ وقت الغداء"
                    : "🌙 وقت العشاء"}
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={{ fontSize: 16, color: colors.primary, fontWeight: "600" }}>
                    إلغاء
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={showTimePicker ? getFilteredTimeOptions(showTimePicker) : []}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = showTimePicker && mealTimes[showTimePicker] === item.value;
                  return (
                    <TouchableOpacity
                      onPress={() => showTimePicker && handleSelectTime(showTimePicker, item.value)}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: isSelected ? colors.primary + "15" : "transparent",
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.border,
                      }}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? colors.primary : colors.foreground,
                        }}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Text style={{ fontSize: 20, color: colors.primary }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // شاشة اكتمال الجدول
  if (step === "done") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text
            className="text-foreground font-bold mt-4"
            style={{ fontSize: 24, textAlign: "center" }}
          >
            تم تنظيم الجدول!
          </Text>
          <Text
            className="text-muted mt-3"
            style={{
              fontSize: 16,
              textAlign: "center",
              lineHeight: 26,
              writingDirection: "rtl",
            }}
          >
            سنبدأ من باجر بإذن الله{"\n"}
            سنذكّرك بأوقات الوجبات{"\n"}
            ألف عافية مقدماً
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-2xl py-4 px-8 mt-8"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold" style={{ fontSize: 17 }}>
              تمام، رجعني للرئيسية
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Recipe Picker Modal
  if (showRecipePicker) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View
          className="px-5 pt-4 pb-2 flex-row items-center justify-between"
          style={{ flexDirection: "row-reverse" }}
        >
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 18, textAlign: "right" }}
          >
            اختاري وصفة لـ{showRecipePicker.meal === "breakfast" ? "الفطور" : showRecipePicker.meal === "lunch" ? "الغداء" : "العشاء"}
          </Text>
          <TouchableOpacity onPress={() => setShowRecipePicker(null)}>
            <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={suggestedRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: recipe }) => (
            <TouchableOpacity
              onPress={() => selectRecipe(recipe.id, recipe.name)}
              className="mx-5 mb-2 rounded-xl overflow-hidden flex-row items-center"
              style={{
                backgroundColor: colors.surface,
                flexDirection: "row-reverse",
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 60, height: 60 }}>
                <Image
                  source={getRecipeCustomImage(recipe.id) ? { uri: getRecipeCustomImage(recipe.id)! } : (recipe.image ? getFoodCategoryImage(recipe.image) : getFoodCategoryImage("iraqi-rice"))}
                  style={{ width: 60, height: 60 }}
                  contentFit="cover"
                />
              </View>
              <View className="flex-1 mx-3 py-3">
                <Text
                  className="text-foreground font-bold"
                  style={{ fontSize: 15, textAlign: "right", writingDirection: "rtl" }}
                >
                  {recipe.name}
                </Text>
                <Text className="text-muted" style={{ fontSize: 12, textAlign: "right" }}>
                  {recipe.calories} سعرة | {recipe.prepTime + recipe.cookTime} دقيقة
                </Text>
              </View>
              <View style={{ paddingLeft: 12 }}>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      </ScreenContainer>
    );
  }

  // شاشة تخطيط الجدول
  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View
          className="px-5 pt-4 pb-2 flex-row items-center justify-between"
          style={{ flexDirection: "row-reverse" }}
        >
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "right" }}
          >
            شنو نطبخ؟
          </Text>
          <View className="flex-row items-center gap-2" style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => setStep("times")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="chevron.right" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* تعديل الأوقات */}
        {timesAlreadySet && (
          <TouchableOpacity
            onPress={() => setStep("times")}
            className="mx-5 mb-2 rounded-xl py-2 flex-row items-center justify-center gap-2"
            style={{
              backgroundColor: colors.surface,
              flexDirection: "row-reverse",
              borderWidth: 1,
              borderColor: colors.border,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14 }}>🕐</Text>
            <Text className="text-muted" style={{ fontSize: 13 }}>
              تعديل أوقات الوجبات
            </Text>
          </TouchableOpacity>
        )}

        {/* Auto Fill Button */}
        <View className="px-5 mt-2 mb-4">
          <TouchableOpacity
            onPress={handleAutoFill}
            className="rounded-xl py-3 flex-row items-center justify-center gap-2"
            style={{
              backgroundColor: colors.primary + "15",
              flexDirection: "row-reverse",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>✨</Text>
            <Text
              className="text-primary font-bold"
              style={{ fontSize: 15 }}
            >
              تعبئة الجدول تلقائياً
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 8,
            flexDirection: "row-reverse",
          }}
          className="mb-4"
        >
          {DAYS.map((day, index) => {
            const isAvailable = index < availableDays.length;
            const isSelected = selectedDay === index;
            return (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  if (isAvailable) setSelectedDay(index);
                }}
                className="rounded-xl px-4 py-2 items-center"
                style={{
                  backgroundColor: isSelected
                    ? colors.primary
                    : isAvailable
                    ? colors.surface
                    : colors.border + "40",
                  opacity: isAvailable ? 1 : 0.5,
                  minWidth: 70,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? "#fff" : isAvailable ? colors.foreground : colors.muted,
                  }}
                >
                  {day}
                </Text>
                {!isAvailable && (
                  <Text style={{ fontSize: 8, color: colors.muted }}>🔒</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subscription Notice */}
        {!isSubscribed && (
          <View
            className="mx-5 mb-4 rounded-xl p-3"
            style={{ backgroundColor: colors.warning + "15" }}
          >
            <Text
              className="text-foreground"
              style={{
                fontSize: 12,
                textAlign: "right",
                writingDirection: "rtl",
              }}
            >
              النسخة المجانية تشمل يومين فقط. اشتركي للحصول على جدول أسبوعي كامل!
            </Text>
          </View>
        )}

        {/* Meal Cards for Selected Day */}
        <View className="px-5">
          {MEALS.map((meal) => {
            const dayName = DAYS[selectedDay];
            const planned = mealPlan[dayName]?.[meal.key];
            return (
              <View
                key={meal.key}
                className="rounded-2xl mb-3 overflow-hidden"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  className="p-4 flex-row items-center justify-between"
                  style={{ flexDirection: "row-reverse" }}
                >
                  <View
                    className="flex-row items-center gap-2"
                    style={{ flexDirection: "row-reverse" }}
                  >
                    <Text style={{ fontSize: 24 }}>{meal.emoji}</Text>
                    <View>
                      <Text
                        className="text-foreground font-bold"
                        style={{ fontSize: 16, textAlign: "right" }}
                      >
                        {meal.label}
                      </Text>
                      <Text className="text-muted" style={{ fontSize: 12 }}>
                        {formatTimeArabic(mealTimes[meal.key])}
                      </Text>
                    </View>
                  </View>

                  {planned ? (
                    <View className="flex-row items-center gap-2" style={{ flexDirection: "row-reverse" }}>
                      <View
                        className="rounded-lg px-3 py-1"
                        style={{ backgroundColor: colors.primary + "15", maxWidth: 150 }}
                      >
                        <Text
                          className="text-primary font-bold"
                          style={{ fontSize: 13 }}
                          numberOfLines={1}
                        >
                          {planned.recipeName}
                        </Text>
                      </View>
                      {/* زر المنبه */}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "تشغيل المنبه",
                            `هل تريدين تشغيل منبه الطبخ لـ "${planned.recipeName}"؟`,
                            [
                              { text: "إلغاء", style: "cancel" },
                              {
                                text: "تشغيل",
                                onPress: () => handleStartAlarm(planned.recipeName, planned.recipeId),
                              },
                            ]
                          );
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: colors.warning + "20",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>🔔</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setShowRecipePicker({ day: dayName, meal: meal.key })
                        }
                      >
                        <IconSymbol name="pencil" size={18} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        setShowRecipePicker({ day: dayName, meal: meal.key })
                      }
                      className="rounded-lg px-3 py-2 flex-row items-center gap-1"
                      style={{
                        backgroundColor: colors.primary + "10",
                        flexDirection: "row-reverse",
                      }}
                    >
                      <IconSymbol name="plus.circle.fill" size={16} color={colors.primary} />
                      <Text className="text-primary" style={{ fontSize: 13 }}>
                        اختاري وصفة
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Save Button */}
        <View className="px-5 mt-6">
          <TouchableOpacity
            onPress={async () => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              await saveMealPlan(mealPlan);
              // جدولة الإشعارات التلقائية مع أسماء الوصفات
              try {
                const todayIndex = new Date().getDay();
                // تحويل getDay (0=أحد) إلى ترتيب DAYS (0=سبت)
                const dayMap = [1, 2, 3, 4, 5, 6, 0]; // Sun=1, Mon=2, ..., Sat=0
                const todayDayIndex = dayMap[todayIndex];
                const todayName = DAYS[todayDayIndex];
                const todayMeals = mealPlan[todayName];
                await scheduleAllMealReminders(mealTimes, todayMeals || undefined);
              } catch (e) {
                console.warn("Failed to schedule meal reminders:", e);
              }
              setStep("done");
            }}
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold" style={{ fontSize: 17 }}>
              حفظ الجدول
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

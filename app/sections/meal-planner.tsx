import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { RECIPES, getRecipesByMealType } from "@/lib/data/recipes";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

I18nManager.forceRTL(true);

const DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const MEALS = [
  { key: "breakfast" as const, label: "فطور", emoji: "🌅", defaultTime: "08:00 AM" },
  { key: "lunch" as const, label: "غداء", emoji: "☀️", defaultTime: "01:00 PM" },
  { key: "dinner" as const, label: "عشاء", emoji: "🌙", defaultTime: "08:00 PM" },
];

// دالة لتحويل الوقت من 24 ساعة إلى 12 ساعة
const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  let hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${ampm}`;
};

// دالة لتحويل الوقت من 12 ساعة إلى 24 ساعة
const convertTo24Hour = (time12: string): string => {
  const [time, ampm] = time12.split(" ");
  let [hours, minutes] = time.split(":");
  let hour = parseInt(hours);
  if (ampm === "AM" && hour === 12) hour = 0;
  if (ampm === "PM" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${minutes}`;
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
  const { profile } = useUser();
  const isSubscribed = profile.isSubscribed;

  const [step, setStep] = useState<"times" | "plan" | "done">("times");
  const [mealTimes, setMealTimes] = useState<MealTimes>({
    breakfast: "08:00 AM",
    lunch: "01:00 PM",
    dinner: "08:00 PM",
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

  // الأيام المتاحة (يومين مجاني، أسبوع كامل للمشتركين)
  const availableDays = isSubscribed ? DAYS : DAYS.slice(0, 2);

  const suggestedRecipes = useMemo(() => {
    if (!showRecipePicker) return [];
    const mealType = showRecipePicker.meal;
    let recipes = getRecipesByMealType(mealType);
    // ترتيب حسب الحالة الصحية
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

    availableDays.forEach((day, index) => {
      newPlan[day] = {
        breakfast: breakfastRecipes[index % breakfastRecipes.length]
          ? {
              recipeId: breakfastRecipes[index % breakfastRecipes.length].id,
              recipeName: breakfastRecipes[index % breakfastRecipes.length].name,
            }
          : null,
        lunch: lunchRecipes[index % lunchRecipes.length]
          ? {
              recipeId: lunchRecipes[index % lunchRecipes.length].id,
              recipeName: lunchRecipes[index % lunchRecipes.length].name,
            }
          : null,
        dinner: dinnerRecipes[index % dinnerRecipes.length]
          ? {
              recipeId: dinnerRecipes[index % dinnerRecipes.length].id,
              recipeName: dinnerRecipes[index % dinnerRecipes.length].name,
            }
          : null,
      };
    });
    // أيام غير متاحة
    DAYS.forEach((day) => {
      if (!newPlan[day]) {
        newPlan[day] = { breakfast: null, lunch: null, dinner: null };
      }
    });
    setMealPlan(newPlan);
  }, [availableDays, profile.healthCondition]);

  const selectRecipe = (recipeId: string, recipeName: string) => {
    if (!showRecipePicker) return;
    setMealPlan((prev) => ({
      ...prev,
      [showRecipePicker.day]: {
        ...prev[showRecipePicker.day],
        [showRecipePicker.meal]: { recipeId, recipeName },
      },
    }));
    setShowRecipePicker(null);
  };

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
              متى تاكلين عادةً؟
            </Text>
            <Text
              className="text-muted mb-6"
              style={{ fontSize: 14, textAlign: "right", writingDirection: "rtl" }}
            >
              حددي أوقات وجباتج حتى ننبهج بالوقت المناسب
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
                    متى تاكلين {meal.label === "فطور" ? "الفطور" : meal.label === "غداء" ? "الغداء" : "العشاء"}؟
                  </Text>
                </View>
                <View
                  className="flex-row items-center justify-center gap-2"
                  style={{ flexDirection: "row-reverse" }}
                >
                  <TextInput
                    className="text-foreground text-center rounded-xl"
                    style={{
                      width: 120,
                      height: 50,
                      backgroundColor: colors.background,
                      fontSize: 22,
                      fontWeight: "700",
                      borderWidth: 2,
                      borderColor: colors.primary,
                    }}
                    value={mealTimes[meal.key]}
                    onChangeText={(t) =>
                      setMealTimes((prev) => ({ ...prev, [meal.key]: t }))
                    }
                    placeholder="00:00"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text className="text-muted" style={{ fontSize: 13 }}>
                    (مثال: {meal.defaultTime})
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setStep("plan")}
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
            راح ننبهج بأوقات الوجبات{"\n"}
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
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {suggestedRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              onPress={() => selectRecipe(recipe.id, recipe.name)}
              className="mx-5 mb-2 rounded-xl p-4 flex-row items-center"
              style={{
                backgroundColor: colors.surface,
                flexDirection: "row-reverse",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>
                {recipe.category === "hearty" ? "🍖" : recipe.category === "quick" ? "⚡" : "🥗"}
              </Text>
              <View className="flex-1 mx-3">
                <Text
                  className="text-foreground font-bold"
                  style={{ fontSize: 15, textAlign: "right", writingDirection: "rtl" }}
                >
                  {recipe.name}
                </Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  {recipe.calories} سعرة | {recipe.prepTime + recipe.cookTime} دقيقة
                </Text>
              </View>
              <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              عبّي الجدول تلقائياً
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
                        {mealTimes[meal.key]}
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
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

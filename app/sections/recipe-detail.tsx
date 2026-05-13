import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { getRecipeById } from "@/lib/data/recipes";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getFoodCategoryImage } from "@/lib/food-category-images";
import { getRecipeCustomImage } from "@/lib/recipe-image-sync";
import { useRecipeImagesVersion } from "@/hooks/use-recipe-images";
import * as Haptics from "expo-haptics";
import type { HealthCondition } from "@/lib/user-context";

I18nManager.forceRTL(true);

// تحذيرات صحية حسب الحالة المرضية - كل تحذير يحتوي على المكون الضار
const HEALTH_WARNINGS: Record<string, { keywords: string[]; harmfulItem: string }[]> = {
  diabetes: [
    { keywords: ["سكر", "شيرة", "عسل", "دبس", "مربى"], harmfulItem: "السكريات" },
    { keywords: ["رز أبيض", "خبز أبيض", "طحين"], harmfulItem: "الكربوهيدرات المكررة" },
    { keywords: ["تمر", "رطب"], harmfulItem: "التمر" },
  ],
  hypertension: [
    { keywords: ["ملح", "مخلل", "مملح"], harmfulItem: "الملح" },
    { keywords: ["صلصة صويا", "مرقة"], harmfulItem: "الصوديوم العالي" },
    { keywords: ["كافيين", "قهوة", "شاي أسود"], harmfulItem: "الكافيين" },
  ],
  obesity: [
    { keywords: ["سمن", "زبدة", "كريمة", "دهن"], harmfulItem: "الدهون العالية" },
    { keywords: ["قلي", "مقلي"], harmfulItem: "الأطعمة المقلية" },
    { keywords: ["سكر", "شيرة", "حلويات"], harmfulItem: "السكريات" },
  ],
  cholesterol: [
    { keywords: ["كبدة", "كلاوي", "مخ"], harmfulItem: "الأحشاء الداخلية" },
    { keywords: ["زبدة", "سمن", "دهن حر"], harmfulItem: "الدهون المشبعة" },
    { keywords: ["صفار البيض", "بيض"], harmfulItem: "صفار البيض" },
    { keywords: ["جلد الدجاج"], harmfulItem: "جلد الدجاج" },
  ],
};

function getRecipeHealthWarnings(
  ingredients: { name: string; amount: string }[],
  steps: string[],
  category: string,
  calories: number,
  carbs: number,
  fat: number,
  healthCondition: HealthCondition
): string[] {
  if (healthCondition === "none") return [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const allText = [
    ...ingredients.map((i) => i.name.toLowerCase()),
    ...steps.map((s) => s.toLowerCase()),
  ].join(" ");

  const conditionWarnings = HEALTH_WARNINGS[healthCondition] || [];
  for (const w of conditionWarnings) {
    for (const kw of w.keywords) {
      if (allText.includes(kw) && !seen.has(w.harmfulItem)) {
        seen.add(w.harmfulItem);
        warnings.push(w.harmfulItem);
        break;
      }
    }
  }

  // تحذيرات بناءً على القيم الغذائية
  if (healthCondition === "diabetes" && carbs > 50) {
    const item = `الكربوهيدرات العالية (${carbs}g)`;
    if (!seen.has(item)) { seen.add(item); warnings.push(item); }
  }
  if (healthCondition === "obesity" && calories > 500) {
    const item = `السعرات العالية (${calories} سعرة)`;
    if (!seen.has(item)) { seen.add(item); warnings.push(item); }
  }
  if (healthCondition === "cholesterol" && fat > 20) {
    const item = `الدهون العالية (${fat}g)`;
    if (!seen.has(item)) { seen.add(item); warnings.push(item); }
  }
  if (category === "dessert" && (healthCondition === "diabetes" || healthCondition === "obesity")) {
    const item = "الحلويات";
    if (!seen.has(item)) { seen.add(item); warnings.push(item); }
  }

  return warnings;
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, saveRecipe, unsaveRecipe, rateRecipe, incrementRecipesViewed } = useUser();
  const _imagesVersion = useRecipeImagesVersion();
  const recipe = getRecipeById(id || "");

  const [userRating, setUserRating] = useState(() => {
    const existing = profile.triedRecipes.find((r) => r.recipeId === id);
    return existing?.rating || 0;
  });

  const isSaved = profile.savedRecipes.includes(id || "");

  const handleSave = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isSaved) {
      await unsaveRecipe(id || "");
    } else {
      await saveRecipe(id || "");
    }
  }, [isSaved, id, saveRecipe, unsaveRecipe]);

  const handleRate = useCallback(
    async (rating: number) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setUserRating(rating);
      await rateRecipe(id || "", rating);
    },
    [id, rateRecipe]
  );

  if (!recipe) {
    return (
      <ScreenContainer className="p-6" edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-xl text-foreground">الوصفة غير موجودة</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">الرجوع</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const difficultyLabel =
    recipe.difficulty === "easy"
      ? "سهلة"
      : recipe.difficulty === "medium"
      ? "متوسطة"
      : "صعبة";

  const difficultyColor =
    recipe.difficulty === "easy"
      ? colors.success
      : recipe.difficulty === "medium"
      ? colors.warning
      : colors.error;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <IconSymbol
              name={isSaved ? "heart.fill" : "heart"}
              size={28}
              color={isSaved ? colors.error : colors.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Recipe Image */}
        <View
          className="mx-5 rounded-2xl overflow-hidden"
          style={{ height: 220 }}
        >
          <Image
            source={getRecipeCustomImage(recipe.id) ? { uri: getRecipeCustomImage(recipe.id)! } : (recipe.image ? getFoodCategoryImage(recipe.image) : getFoodCategoryImage("iraqi-rice"))}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />
          <View
            className="absolute bottom-3 left-3 rounded-full px-3 py-1"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>
              {recipe.isIraqi ? "🇮🇶 أكلة عراقية" : "🌍 أكلة عربية"}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <View className="px-5 mt-4">
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 24, textAlign: "right", writingDirection: "rtl" }}
          >
            {recipe.name}
          </Text>
          <Text
            className="text-muted mt-2"
            style={{
              fontSize: 15,
              lineHeight: 24,
              textAlign: "right",
              writingDirection: "rtl",
            }}
          >
            {recipe.description}
          </Text>
        </View>

        {/* تحذيرات صحية - تحت اسم الوصفة مباشرة */}
        {(() => {
          const healthWarnings = getRecipeHealthWarnings(
            recipe.ingredients,
            recipe.steps,
            recipe.category,
            recipe.calories,
            recipe.carbs,
            recipe.fat,
            profile.healthCondition
          );
          if (healthWarnings.length === 0) return null;
          const condLabel =
            profile.healthCondition === "diabetes" ? "السكري" :
            profile.healthCondition === "hypertension" ? "ارتفاع الضغط" :
            profile.healthCondition === "obesity" ? "السمنة" :
            profile.healthCondition === "cholesterol" ? "الكوليسترول" : "";
          const harmfulItems = healthWarnings.join(" و");
          return (
            <View
              className="mx-5 mt-3 rounded-xl p-4"
              style={{ backgroundColor: colors.error + "12", borderWidth: 1.5, borderColor: colors.error + "40" }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: colors.error, textAlign: "right", writingDirection: "rtl", marginBottom: 6 }}
              >
                ⚠️ تحذير صحي لك ({condLabel})
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 24,
                  color: colors.foreground,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                هذه الوصفة تحتوي على {harmfulItems} قد يضر بصحتك، قلل منه أو قم بتغيير الوصفة رجاءً 💚
              </Text>
            </View>
          );
        })()}

        {/* Quick Info Cards */}
        <View className="flex-row px-5 mt-4 gap-2">
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text style={{ fontSize: 20 }}>⏱️</Text>
            <Text className="text-foreground font-bold mt-1" style={{ fontSize: 13 }}>
              {recipe.prepTime + recipe.cookTime} دقيقة
            </Text>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              الوقت الكلي
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text style={{ fontSize: 20 }}>👥</Text>
            <Text className="text-foreground font-bold mt-1" style={{ fontSize: 13 }}>
              {recipe.servings} أشخاص
            </Text>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              الحصص
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text className="text-foreground font-bold mt-1" style={{ fontSize: 13 }}>
              {recipe.calories} سعرة
            </Text>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              لكل حصة
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text style={{ fontSize: 20, color: difficultyColor }}>●</Text>
            <Text
              className="font-bold mt-1"
              style={{ fontSize: 13, color: difficultyColor }}
            >
              {difficultyLabel}
            </Text>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              الصعوبة
            </Text>
          </View>
        </View>

        {/* Nutrition Info */}
        <View className="mx-5 mt-4 rounded-xl p-4" style={{ backgroundColor: colors.surface }}>
          <Text
            className="text-foreground font-bold mb-3"
            style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
          >
            القيمة الغذائية (لكل حصة)
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-primary font-bold" style={{ fontSize: 18 }}>
                {recipe.protein}g
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                بروتين
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-primary font-bold" style={{ fontSize: 18 }}>
                {recipe.carbs}g
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                كربوهيدرات
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-primary font-bold" style={{ fontSize: 18 }}>
                {recipe.fat}g
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                دهون
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-primary font-bold" style={{ fontSize: 18 }}>
                {recipe.fiber}g
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                ألياف
              </Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View className="px-5 mt-5">
          <Text
            className="text-foreground font-bold mb-3"
            style={{ fontSize: 18, textAlign: "right", writingDirection: "rtl" }}
          >
            المكونات
          </Text>
          {recipe.ingredients.map((ing, index) => (
            <View
              key={index}
              className="flex-row items-center py-2 border-b border-border"
              style={{ flexDirection: "row-reverse" }}
            >
              <View
                className="rounded-full mr-3 items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: colors.primary + "20",
                  marginLeft: 10,
                }}
              >
                <Text className="text-primary font-bold" style={{ fontSize: 12 }}>
                  {index + 1}
                </Text>
              </View>
              <Text
                className="text-foreground flex-1"
                style={{
                  fontSize: 15,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                {ing.name}
              </Text>
              <Text className="text-muted" style={{ fontSize: 14 }}>
                {ing.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* Steps */}
        <View className="px-5 mt-5">
          <Text
            className="text-foreground font-bold mb-3"
            style={{ fontSize: 18, textAlign: "right", writingDirection: "rtl" }}
          >
            طريقة التحضير
          </Text>
          {recipe.steps.map((step, index) => (
            <View
              key={index}
              className="flex-row mb-3"
              style={{ flexDirection: "row-reverse" }}
            >
              <View
                className="rounded-full items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: colors.primary,
                  marginLeft: 12,
                  flexShrink: 0,
                }}
              >
                <Text className="text-white font-bold" style={{ fontSize: 14 }}>
                  {index + 1}
                </Text>
              </View>
              <View
                className="flex-1 rounded-xl p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <Text
                  className="text-foreground"
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }}
                >
                  {step}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* تم نقل التحذيرات الصحية لأعلى الصفحة تحت اسم الوصفة */}

        {/* Tips */}
        {recipe.tips && (
          <View
            className="mx-5 mt-4 rounded-xl p-4"
            style={{ backgroundColor: colors.primary + "15" }}
          >
            <Text
              className="text-primary font-bold mb-2"
              style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
            >
              نصيحة من عافيات
            </Text>
            <Text
              className="text-foreground"
              style={{
                fontSize: 14,
                lineHeight: 22,
                textAlign: "right",
                writingDirection: "rtl",
              }}
            >
              {recipe.tips}
            </Text>
          </View>
        )}

        {/* Rating */}
        <View className="px-5 mt-5">
          <Text
            className="text-foreground font-bold mb-3"
            style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
          >
            قيمي هاي الأكلة
          </Text>
          <View className="flex-row justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                <Text
                  style={{
                    fontSize: 32,
                    color: star <= userRating ? "#FFD700" : colors.border,
                  }}
                >
                  {star <= userRating ? "★" : "☆"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {userRating > 0 && (
            <Text
              className="text-muted text-center mt-2"
              style={{ fontSize: 13 }}
            >
              شكراً على تقييمج! ألف عافية
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

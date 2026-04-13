import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import {
  RECIPES,
  type Recipe,
  type MealType,
  type RecipeCategory,
  getRecipesByMealType,
  getRecipesByCategory,
  getRecipesByHealth,
  searchRecipes,
} from "@/lib/data/recipes";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

I18nManager.forceRTL(true);

type FilterType = "all" | "quick" | "hearty" | "healthy" | "dessert";

const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
  { key: "all", label: "الكل", emoji: "📋" },
  { key: "quick", label: "سريعة", emoji: "⚡" },
  { key: "hearty", label: "دسمة", emoji: "🍖" },
  { key: "healthy", label: "صحية", emoji: "🥗" },
  { key: "dessert", label: "حلويات", emoji: "🍰" },
];

const MEAL_FILTERS: { key: MealType | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "breakfast", label: "فطور" },
  { key: "lunch", label: "غداء" },
  { key: "dinner", label: "عشاء" },
];

export default function RecipesLibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ category?: string; mealType?: string }>();
  const { profile, saveRecipe, unsaveRecipe } = useUser();

  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (params.category as FilterType) || "all"
  );
  const [activeMeal, setActiveMeal] = useState<MealType | "all">(
    (params.mealType as MealType) || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecipes = useMemo(() => {
    let result = [...RECIPES];

    // فلتر البحث
    if (searchQuery.trim()) {
      result = searchRecipes(searchQuery);
    }

    // فلتر التصنيف
    if (activeFilter !== "all") {
      result = result.filter((r) => r.category === activeFilter);
    }

    // فلتر الوجبة
    if (activeMeal !== "all") {
      result = result.filter((r) => r.mealType.includes(activeMeal));
    }

    // فلتر الحالة الصحية
    if (profile.healthCondition !== "none") {
      // نعرض الوصفات المناسبة للحالة الصحية أولاً
      result.sort((a, b) => {
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

    return result;
  }, [activeFilter, activeMeal, searchQuery, profile.healthCondition]);

  const handleToggleSave = useCallback(
    async (recipeId: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (profile.savedRecipes.includes(recipeId)) {
        await unsaveRecipe(recipeId);
      } else {
        await saveRecipe(recipeId);
      }
    },
    [profile.savedRecipes, saveRecipe, unsaveRecipe]
  );

  const renderRecipeCard = useCallback(
    ({ item }: { item: Recipe }) => {
      const isSaved = profile.savedRecipes.includes(item.id);
      const totalTime = item.prepTime + item.cookTime;
      const isHealthMatch =
        item.healthTags.includes(profile.healthCondition as any) ||
        item.healthTags.includes("all");

      return (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/sections/recipe-detail" as any,
              params: { id: item.id },
            })
          }
          className="mx-5 mb-3 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          {/* Recipe Header with emoji */}
          <View
            className="p-4 items-center"
            style={{
              backgroundColor: colors.primary + "10",
              height: 100,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 40 }}>
              {item.category === "hearty"
                ? "🍖"
                : item.category === "quick"
                ? "⚡"
                : item.category === "healthy"
                ? "🥗"
                : "🍰"}
            </Text>
            {item.isIraqi && (
              <View
                className="absolute top-2 left-2 rounded-full px-2 py-1"
                style={{ backgroundColor: colors.primary + "30" }}
              >
                <Text style={{ fontSize: 10, color: colors.primary }}>
                  عراقية 🇮🇶
                </Text>
              </View>
            )}
            {isHealthMatch && profile.healthCondition !== "none" && (
              <View
                className="absolute top-2 right-2 rounded-full px-2 py-1"
                style={{ backgroundColor: colors.success + "30" }}
              >
                <Text style={{ fontSize: 10, color: colors.success }}>
                  مناسبة لصحتك
                </Text>
              </View>
            )}
          </View>

          {/* Recipe Info */}
          <View className="p-4">
            <View className="flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
              <Text
                className="text-foreground font-bold flex-1"
                style={{
                  fontSize: 16,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <TouchableOpacity onPress={() => handleToggleSave(item.id)}>
                <IconSymbol
                  name={isSaved ? "heart.fill" : "heart"}
                  size={22}
                  color={isSaved ? colors.error : colors.muted}
                />
              </TouchableOpacity>
            </View>
            <Text
              className="text-muted mt-1"
              style={{
                fontSize: 13,
                textAlign: "right",
                writingDirection: "rtl",
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            {/* Quick Stats */}
            <View
              className="flex-row mt-3 gap-3"
              style={{ flexDirection: "row-reverse" }}
            >
              <View className="flex-row items-center gap-1" style={{ flexDirection: "row-reverse" }}>
                <Text style={{ fontSize: 12 }}>⏱️</Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  {totalTime} د
                </Text>
              </View>
              <View className="flex-row items-center gap-1" style={{ flexDirection: "row-reverse" }}>
                <Text style={{ fontSize: 12 }}>🔥</Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  {item.calories} سعرة
                </Text>
              </View>
              <View className="flex-row items-center gap-1" style={{ flexDirection: "row-reverse" }}>
                <Text style={{ fontSize: 12 }}>👥</Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  {item.servings} أشخاص
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, profile.savedRecipes, profile.healthCondition, handleToggleSave, router]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
        <Text
          className="text-foreground font-bold"
          style={{ fontSize: 22, textAlign: "right" }}
        >
          مكتبة الوصفات
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

      {/* Search Bar */}
      <View className="px-5 mb-3">
        <View
          className="flex-row items-center rounded-xl px-4"
          style={{
            backgroundColor: colors.surface,
            height: 44,
            flexDirection: "row-reverse",
          }}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            className="flex-1 text-foreground mx-2"
            style={{
              fontSize: 15,
              textAlign: "right",
              writingDirection: "rtl",
              height: 44,
            }}
            placeholder="ابحثي عن وصفة..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filters */}
      <View className="mb-2">
        <FlatList
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          data={FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.key)}
              className="rounded-full px-4 py-2 flex-row items-center gap-1"
              style={{
                backgroundColor:
                  activeFilter === item.key ? colors.primary : colors.surface,
                flexDirection: "row-reverse",
              }}
            >
              <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: activeFilter === item.key ? "700" : "500",
                  color: activeFilter === item.key ? "#fff" : colors.foreground,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Meal Type Filters */}
      <View className="mb-3">
        <FlatList
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
          data={MEAL_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveMeal(item.key)}
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor:
                  activeMeal === item.key ? colors.secondary || colors.primary + "30" : "transparent",
                borderWidth: 1,
                borderColor:
                  activeMeal === item.key ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeMeal === item.key ? "700" : "400",
                  color: activeMeal === item.key ? colors.primary : colors.muted,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results Count */}
      <View className="px-5 mb-2">
        <Text
          className="text-muted"
          style={{ fontSize: 13, textAlign: "right", writingDirection: "rtl" }}
        >
          {filteredRecipes.length} وصفة
        </Text>
      </View>

      {/* Recipe List */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text style={{ fontSize: 48 }}>🍽️</Text>
            <Text
              className="text-muted mt-3"
              style={{ fontSize: 16, textAlign: "center" }}
            >
              ما لگينا وصفات بهالبحث{"\n"}جربي كلمات ثانية عيني
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

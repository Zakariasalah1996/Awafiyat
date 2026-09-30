import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import {
  RECIPES,
  type Recipe,
  type MealType,
  type RecipeCategory,
  getRecipesByMealType,
  getRecipesByCategory,
  getRecipesByHealth,
  searchRecipes,
  isRecipeFree,
} from "@/lib/data/recipes";

import { getPreviouslyUnlockedRecipes } from "@/lib/previously-unlocked-content";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getFoodCategoryImage } from "@/lib/food-category-images";
import { useRecipeImages, getImageFromMap } from "@/hooks/use-recipe-images";
import {
  CUISINE_GROUPS,
  type CuisineGroupKey,
  filterRecipesByCuisineGroup,
  getCuisineGroup,
  getCuisineGroupKey,
} from "@/lib/cuisine-groups";
import * as Haptics from "expo-haptics";

I18nManager.forceRTL(true);

type FilterType = "all" | "quick" | "hearty" | "healthy" | "dessert" | "appetizer" | "snack";

const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
  { key: "all", label: "الكل", emoji: "📋" },
  { key: "quick", label: "سريعة", emoji: "⚡" },
  { key: "hearty", label: "دسمة", emoji: "🍖" },
  { key: "healthy", label: "صحية", emoji: "🥗" },
  { key: "dessert", label: "حلويات", emoji: "🍰" },
  { key: "appetizer", label: "مقبلات", emoji: "🥙" },
  { key: "snack", label: "وجبات خفيفة", emoji: "🥜" },
];

const MEAL_FILTERS: { key: MealType | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "breakfast", label: "فطور" },
  { key: "lunch", label: "غداء" },
  { key: "dinner", label: "عشاء" },
];

const PROFILE_CUISINE: Record<string, CuisineGroupKey> = {
  iraq: "iraqi",
  saudi: "gulf",
  uae: "gulf",
  egypt: "egyptian_nile",
};

export default function RecipesLibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ category?: string; mealType?: string; cuisine?: CuisineGroupKey }>();
  const { profile, saveRecipe, unsaveRecipe } = useUser();
  const { isPremium } = useSubscriptionContext();
  const recipeImages = useRecipeImages();
  const [previouslyUnlocked, setPreviouslyUnlocked] = useState<Set<string>>(new Set());
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockedRecipe, setLockedRecipe] = useState<Recipe | null>(null);

  // الاحتفاظ بإمكانية قراءة الوصفات التي فُتحت في الإصدارات السابقة.
  useEffect(() => {
    let active = true;
    void getPreviouslyUnlockedRecipes().then((ids) => {
      if (active) setPreviouslyUnlocked(new Set(ids));
    });
    return () => { active = false; };
  }, []);

  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (params.category as FilterType) || "all"
  );
  const [activeMeal, setActiveMeal] = useState<MealType | "all">(
    (params.mealType as MealType) || "all"
  );
  const [activeCuisine, setActiveCuisine] = useState<CuisineGroupKey>(
    (params.cuisine as CuisineGroupKey) || "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // تقديم مجموعة مطبخ المستخدم دون تحويل واجهة التطبيق إلى قائمة دول منفصلة.
  const userCuisine = profile.country ? PROFILE_CUISINE[profile.country] : undefined;

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

    // فلتر المطبخ الإقليمي
    if (activeCuisine !== "all") {
      result = filterRecipesByCuisineGroup(result, activeCuisine);
    }

    // ترتيب: مطبخ المستخدم المفضل أولاً عند عرض المكتبة كاملة.
    if (userCuisine && activeCuisine === "all") {
      result.sort((a, b) => {
        const aMatch = getCuisineGroupKey(a) === userCuisine;
        const bMatch = getCuisineGroupKey(b) === userCuisine;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }

    // فلتر الحالة الصحية
    if (profile.healthCondition !== "none") {
      const healthSorted = [...result];
      healthSorted.sort((a, b) => {
        const aOrig = getCuisineGroupKey(a) === userCuisine ? 0 : 1;
        const bOrig = getCuisineGroupKey(b) === userCuisine ? 0 : 1;
        if (aOrig !== bOrig) return aOrig - bOrig;
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
      return healthSorted;
    }

    return result;
  }, [activeFilter, activeMeal, activeCuisine, searchQuery, profile.healthCondition, userCuisine]);

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
      const cuisine = getCuisineGroup(item);
      const isFree = isRecipeFree(item.id);
      const isLocked = !isFree && !isPremium && !previouslyUnlocked.has(item.id);

      return (
        <TouchableOpacity
          onPress={() => {
            if (isLocked) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              setLockedRecipe(item);
              setShowLockModal(true);
              return;
            }
            router.push({
              pathname: "/sections/recipe-detail" as any,
              params: { id: item.id },
            });
          }}
          className="mx-5 mb-3 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          {/* Recipe Image */}
          <View
            className="overflow-hidden"
            style={{
              height: 140,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            <Image
              source={getImageFromMap(recipeImages, item.id) ? { uri: getImageFromMap(recipeImages, item.id)! } : (item.image ? getFoodCategoryImage(item.image) : getFoodCategoryImage("iraqi-rice"))}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
            {/* بطاقة المطبخ الإقليمي */}
            {cuisine.key !== "global" ? (
              <View
                className="absolute top-2 left-2 rounded-full px-2 py-1"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              >
                <Text style={{ fontSize: 10, color: "#fff" }}>
                  {cuisine.icon} {cuisine.shortLabel}
                </Text>
              </View>
            ) : null}

            {/* Lock badge */}
            {isLocked ? (
              <View
                className="absolute top-2 right-2 rounded-full px-2.5 py-1.5"
                style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
              >
                <Text style={{ fontSize: 14 }}>🔒</Text>
              </View>
            ) : null}

            {/* Locked overlay */}
            {isLocked ? (
              <View
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
              />
            ) : null}

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
    [colors, profile.savedRecipes, profile.healthCondition, handleToggleSave, router, recipeImages, previouslyUnlocked, isPremium]
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
            placeholder="ابحث عن وصفة..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* بطاقات المطابخ الإقليمية */}
      <View className="mb-3">
        <View className="px-5 mb-2">
          <Text className="text-foreground" style={{ fontSize: 15, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }}>
            تصفح حسب المطبخ
          </Text>
        </View>
        <FlatList
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          data={CUISINE_GROUPS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveCuisine(item.key)}
              activeOpacity={0.75}
              className="rounded-2xl px-3 py-2"
              style={{
                backgroundColor:
                  activeCuisine === item.key ? colors.primary : colors.surface,
                width: 118,
                minHeight: 86,
                justifyContent: "center",
                alignItems: "flex-end",
                borderWidth: activeCuisine === item.key ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 23, marginBottom: 3 }}>{item.icon}</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeCuisine === item.key ? "700" : "600",
                  color: activeCuisine === item.key ? "#fff" : colors.foreground,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: activeCuisine === item.key ? "rgba(255,255,255,0.84)" : colors.muted,
                  marginTop: 2,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          )}
        />
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
              لم نجد وصفات بهذا البحث{"\n"}جرّب كلمات أخرى
            </Text>
          </View>
        }
      />
      {/* نافذة فتح الوصفة المقفلة */}
      <Modal
        visible={showLockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLockModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          activeOpacity={1}
          onPress={() => setShowLockModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: "#ffffff", borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, alignItems: "center" }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a", textAlign: "center", marginBottom: 8 }}>
              الوصفة متاحة للمشتركين
            </Text>
            {lockedRecipe && (
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#E65100", textAlign: "center", marginBottom: 8 }}>
                {lockedRecipe.name}
              </Text>
            )}
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20, writingDirection: "rtl" }}>
              اشترك للوصول إلى المكتبة الكاملة من الوصفات والمزايا الأخرى.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowLockModal(false);
                router.push("/(tabs)/subscription" as any);
              }}
              style={{ backgroundColor: "#2D5A3D", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", alignItems: "center", marginBottom: 12 }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                اشترك للوصول الكامل
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLockModal(false)}
              style={{ marginTop: 16, padding: 8 }}
            >
              <Text style={{ color: "#999", fontSize: 13 }}>إلغاء</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

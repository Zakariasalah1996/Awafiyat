import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
  Modal,
  ActivityIndicator,
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
  type CountryOrigin,
  getRecipesByMealType,
  getRecipesByCategory,
  getRecipesByHealth,
  searchRecipes,
  isRecipeFree,
} from "@/lib/data/recipes";

import { showRewardedAd, getUnlockedRecipes, unlockRecipe } from "@/lib/admob";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getFoodCategoryImage } from "@/lib/food-category-images";
import { useRecipeImages, getImageFromMap } from "@/hooks/use-recipe-images";
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

const COUNTRY_FILTERS: { key: CountryOrigin | "all"; label: string; flag: string }[] = [
  { key: "all", label: "جميع الدول", flag: "🌍" },
  { key: "iraqi", label: "عراقية", flag: "🇮🇶" },
  { key: "saudi", label: "سعودية", flag: "🇸🇦" },
  { key: "emirati", label: "إماراتية", flag: "🇦🇪" },
  { key: "egyptian", label: "مصرية", flag: "🇪🇬" },
  { key: "khaleeji", label: "خليجية", flag: "🏜️" },
  { key: "kurdish", label: "كردية", flag: "🏔️" },
  { key: "levantine", label: "شامية", flag: "🫒" },
];

const COUNTRY_TO_ORIGIN: Record<string, CountryOrigin> = {
  iraq: "iraqi",
  saudi: "saudi",
  uae: "emirati",
  egypt: "egyptian",
};

const ORIGIN_FLAG: Record<string, string> = {
  iraqi: "🇮🇶",
  saudi: "🇸🇦",
  emirati: "🇦🇪",
  egyptian: "🇪🇬",
  khaleeji: "🏜️",
  kurdish: "🏔️",
  levantine: "🫒",
};

const ORIGIN_LABEL: Record<string, string> = {
  iraqi: "عراقية",
  saudi: "سعودية",
  emirati: "إماراتية",
  egyptian: "مصرية",
  khaleeji: "خليجية",
  kurdish: "كردية",
  levantine: "شامية",
};

export default function RecipesLibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ category?: string; mealType?: string }>();
  const { profile, saveRecipe, unsaveRecipe } = useUser();
  const { isPremium } = useSubscriptionContext();
  const recipeImages = useRecipeImages();
  const [unlockedByAd, setUnlockedByAd] = useState<Set<string>>(new Set());
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockedRecipe, setLockedRecipe] = useState<Recipe | null>(null);
  const [adLoading, setAdLoading] = useState(false);

  // تحميل الوصفات المفتوحة بالإعلانات
  useState(() => {
    getUnlockedRecipes().then((ids) => setUnlockedByAd(new Set(ids)));
  });

  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (params.category as FilterType) || "all"
  );
  const [activeMeal, setActiveMeal] = useState<MealType | "all">(
    (params.mealType as MealType) || "all"
  );
  const [activeCountry, setActiveCountry] = useState<CountryOrigin | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // تحديد الدولة المفضلة من ملف المستخدم
  const userOrigin = profile.country ? COUNTRY_TO_ORIGIN[profile.country] : undefined;

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

    // فلتر الدولة
    if (activeCountry !== "all") {
      result = result.filter((r) => r.origin === activeCountry);
    }

    // ترتيب: وصفات دولة المستخدم أولاً
    if (userOrigin && activeCountry === "all") {
      result.sort((a, b) => {
        const aMatch = a.origin === userOrigin;
        const bMatch = b.origin === userOrigin;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }

    // فلتر الحالة الصحية
    if (profile.healthCondition !== "none") {
      const healthSorted = [...result];
      healthSorted.sort((a, b) => {
        const aOrig = a.origin === userOrigin ? 0 : 1;
        const bOrig = b.origin === userOrigin ? 0 : 1;
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
  }, [activeFilter, activeMeal, activeCountry, searchQuery, profile.healthCondition, userOrigin]);

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
      const originFlag = item.origin ? ORIGIN_FLAG[item.origin] || "" : "";
      const originLabel = item.origin ? ORIGIN_LABEL[item.origin] || "" : "";
      const isFree = isRecipeFree(item.id);
      const isLocked = !isFree && !isPremium && !unlockedByAd.has(item.id);

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
            {/* Country badge */}
            {originLabel ? (
              <View
                className="absolute top-2 left-2 rounded-full px-2 py-1"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              >
                <Text style={{ fontSize: 10, color: "#fff" }}>
                  {originFlag} {originLabel}
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
    [colors, profile.savedRecipes, profile.healthCondition, handleToggleSave, router, recipeImages, unlockedByAd, isPremium]
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

      {/* Country Filters */}
      <View className="mb-2">
        <FlatList
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
          data={COUNTRY_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveCountry(item.key)}
              className="rounded-full px-3 py-1.5 flex-row items-center gap-1"
              style={{
                backgroundColor:
                  activeCountry === item.key ? colors.primary : colors.surface,
                flexDirection: "row-reverse",
                borderWidth: activeCountry === item.key ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13 }}>{item.flag}</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeCountry === item.key ? "700" : "500",
                  color: activeCountry === item.key ? "#fff" : colors.foreground,
                }}
              >
                {item.label}
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
            {/* أيقونة */}
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>

            {/* العنوان */}
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a", textAlign: "center", marginBottom: 8 }}>
              وصفة مقفلة
            </Text>

            {/* اسم الوصفة */}
            {lockedRecipe && (
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#E65100", textAlign: "center", marginBottom: 8 }}>
                {lockedRecipe.name}
              </Text>
            )}

            {/* الوصف */}
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20, writingDirection: "rtl" }}>
              افتح هذه الوصفة مجاناً بمشاهدة إعلان قصير، أو اشترك للوصول لجميع الوصفات
            </Text>

            {/* زر الاشتراك */}
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

            {/* فاصل */}
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E0E0E0" }} />
              <Text style={{ marginHorizontal: 12, color: "#999", fontSize: 13 }}>أو</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E0E0E0" }} />
            </View>

            {/* زر مشاهدة الإعلان */}
            <TouchableOpacity
              onPress={async () => {
                setAdLoading(true);
                try {
                  const rewarded = await showRewardedAd();
                  if (rewarded && lockedRecipe) {
                    await unlockRecipe(lockedRecipe.id);
                    setUnlockedByAd((prev) => new Set([...prev, lockedRecipe.id]));
                    setShowLockModal(false);
                    router.push({
                      pathname: "/sections/recipe-detail" as any,
                      params: { id: lockedRecipe.id },
                    });
                  }
                } catch {}
                setAdLoading(false);
              }}
              disabled={adLoading}
              style={{ backgroundColor: "#FFF3E0", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#FFE0B2", opacity: adLoading ? 0.7 : 1 }}
            >
              {adLoading ? (
                <ActivityIndicator color="#E65100" size="small" />
              ) : (
                <Text style={{ color: "#E65100", fontSize: 15, fontWeight: "600" }}>
                  ▶️ شاهد إعلاناً قصيراً
                </Text>
              )}
            </TouchableOpacity>

            {/* زر إغلاق */}
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

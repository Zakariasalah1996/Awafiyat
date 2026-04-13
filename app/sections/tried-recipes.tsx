import { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { getRecipeById, type Recipe } from "@/lib/data/recipes";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

I18nManager.forceRTL(true);

interface TriedRecipeItem {
  recipe: Recipe;
  rating: number;
}

export default function TriedRecipesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile, rateRecipe } = useUser();

  const triedRecipes = useMemo(() => {
    return profile.triedRecipes
      .map((tr) => {
        const recipe = getRecipeById(tr.recipeId);
        if (!recipe) return null;
        return { recipe, rating: tr.rating };
      })
      .filter(Boolean) as TriedRecipeItem[];
  }, [profile.triedRecipes]);

  const renderStars = useCallback(
    (recipeId: string, currentRating: number) => {
      return (
        <View className="flex-row gap-1" style={{ flexDirection: "row-reverse" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => rateRecipe(recipeId, star)}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: star <= currentRating ? "#FFD700" : colors.border,
                }}
              >
                {star <= currentRating ? "★" : "☆"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    [rateRecipe, colors.border]
  );

  const renderItem = useCallback(
    ({ item }: { item: TriedRecipeItem }) => (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/sections/recipe-detail" as any,
            params: { id: item.recipe.id },
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
        <View className="p-4">
          <View
            className="flex-row items-center mb-2"
            style={{ flexDirection: "row-reverse" }}
          >
            <Text style={{ fontSize: 32 }}>
              {item.recipe.category === "hearty"
                ? "🍖"
                : item.recipe.category === "quick"
                ? "⚡"
                : item.recipe.category === "healthy"
                ? "🥗"
                : "🍰"}
            </Text>
            <View className="flex-1 mx-3">
              <Text
                className="text-foreground font-bold"
                style={{
                  fontSize: 16,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
                numberOfLines={1}
              >
                {item.recipe.name}
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                ⏱️ {item.recipe.prepTime + item.recipe.cookTime} د | 🔥{" "}
                {item.recipe.calories} سعرة
              </Text>
            </View>
          </View>
          <View
            className="flex-row items-center justify-between mt-1"
            style={{ flexDirection: "row-reverse" }}
          >
            <Text
              className="text-muted"
              style={{ fontSize: 12, textAlign: "right" }}
            >
              تقييمج:
            </Text>
            {renderStars(item.recipe.id, item.rating)}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors, renderStars, router]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        className="px-5 pt-4 pb-3 flex-row items-center justify-between"
        style={{ flexDirection: "row-reverse" }}
      >
        <Text
          className="text-foreground font-bold"
          style={{ fontSize: 22, textAlign: "right" }}
        >
          وصفاتي المجربة
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

      <View className="px-5 mb-3">
        <Text
          className="text-muted"
          style={{ fontSize: 13, textAlign: "right", writingDirection: "rtl" }}
        >
          {triedRecipes.length} وصفة مجربة
        </Text>
      </View>

      <FlatList
        data={triedRecipes}
        keyExtractor={(item) => item.recipe.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text style={{ fontSize: 56 }}>👨‍🍳</Text>
            <Text
              className="text-foreground font-bold mt-4"
              style={{ fontSize: 18, textAlign: "center" }}
            >
              ما جربتي وصفات بعد
            </Text>
            <Text
              className="text-muted mt-2"
              style={{
                fontSize: 14,
                textAlign: "center",
                lineHeight: 22,
                writingDirection: "rtl",
              }}
            >
              لمن تجربين وصفة وتقيمينها{"\n"}راح تنحفظ هنا
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-xl px-6 py-3 mt-6"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold" style={{ fontSize: 15 }}>
                تصفحي الوصفات
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </ScreenContainer>
  );
}

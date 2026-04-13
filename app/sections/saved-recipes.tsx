import { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  I18nManager,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { getRecipeById, type Recipe } from "@/lib/data/recipes";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

I18nManager.forceRTL(true);

export default function SavedRecipesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile, unsaveRecipe } = useUser();

  const savedRecipes = useMemo(() => {
    return profile.savedRecipes
      .map((id) => getRecipeById(id))
      .filter(Boolean) as Recipe[];
  }, [profile.savedRecipes]);

  const handleUnsave = useCallback(
    async (recipeId: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await unsaveRecipe(recipeId);
    },
    [unsaveRecipe]
  );

  const renderItem = useCallback(
    ({ item }: { item: Recipe }) => {
      const totalTime = item.prepTime + item.cookTime;
      const userRating = profile.triedRecipes.find(
        (r) => r.recipeId === item.id
      )?.rating;

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
          <View
            className="p-4 flex-row items-center"
            style={{ flexDirection: "row-reverse" }}
          >
            <Text style={{ fontSize: 36 }}>
              {item.category === "hearty"
                ? "🍖"
                : item.category === "quick"
                ? "⚡"
                : item.category === "healthy"
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
                {item.name}
              </Text>
              <View
                className="flex-row items-center gap-2 mt-1"
                style={{ flexDirection: "row-reverse" }}
              >
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  ⏱️ {totalTime} د
                </Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  🔥 {item.calories} سعرة
                </Text>
                {userRating && (
                  <Text style={{ fontSize: 12, color: "#FFD700" }}>
                    {"★".repeat(userRating)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleUnsave(item.id)}
              style={{ padding: 8 }}
            >
              <IconSymbol name="heart.fill" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, profile.triedRecipes, handleUnsave, router]
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
          وصفاتي المحفوظة
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

      {/* Count */}
      <View className="px-5 mb-3">
        <Text
          className="text-muted"
          style={{ fontSize: 13, textAlign: "right", writingDirection: "rtl" }}
        >
          {savedRecipes.length} وصفة محفوظة
        </Text>
      </View>

      <FlatList
        data={savedRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text style={{ fontSize: 56 }}>💝</Text>
            <Text
              className="text-foreground font-bold mt-4"
              style={{ fontSize: 18, textAlign: "center" }}
            >
              ما عندج وصفات محفوظة بعد
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
              لمن تعجبج وصفة، اضغطي على القلب{"\n"}حتى تنحفظ هنا
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

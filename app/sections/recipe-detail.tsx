import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  I18nManager,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { getRecipeById } from "@/lib/data/recipes";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getFoodCategoryImage } from "@/lib/food-category-images";
import { useRecipeImages, getImageFromMap } from "@/hooks/use-recipe-images";
import * as Haptics from "expo-haptics";
import {
  generateHealthWarnings,
  getConditionLabel,
  getSeverityColor,
  type HealthWarning,
} from "@/lib/health-warnings-engine";

I18nManager.forceRTL(true);

export default function RecipeDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, saveRecipe, unsaveRecipe, rateRecipe } = useUser();
  const { isPremium } = useSubscriptionContext();
  const recipeImages = useRecipeImages();
  const recipe = getRecipeById(id || "");

  const [userRating, setUserRating] = useState(() => {
    const existing = profile.triedRecipes.find((r) => r.recipeId === id);
    return existing?.rating || 0;
  });

  // حالة نافذة الاشتراك
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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

  // عند الضغط على التحذير المقفل
  const handleLockedWarningPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setShowSubscriptionModal(true);
  }, []);

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

  // توليد التحذيرات الصحية الذكية
  const healthWarnings: HealthWarning[] =
    profile.healthCondition !== "none"
      ? generateHealthWarnings(
          recipe.ingredients,
          recipe.steps,
          recipe.category,
          recipe.calories,
          recipe.carbs,
          recipe.fat,
          profile.healthCondition
        )
      : [];

  const conditionLabel = getConditionLabel(profile.healthCondition);
  const hasWarnings = healthWarnings.length > 0;

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
        <View className="mx-5 rounded-2xl overflow-hidden" style={{ height: 220 }}>
          <Image
            source={
              getImageFromMap(recipeImages, recipe.id)
                ? { uri: getImageFromMap(recipeImages, recipe.id)! }
                : recipe.image
                ? getFoodCategoryImage(recipe.image)
                : getFoodCategoryImage("iraqi-rice")
            }
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
            style={{ fontSize: 15, lineHeight: 24, textAlign: "right", writingDirection: "rtl" }}
          >
            {recipe.description}
          </Text>
        </View>

        {/* ─── التحذيرات الصحية - حصرية للمشتركين ─── */}
        {hasWarnings && (
          <View className="mx-5 mt-3">
            {isPremium ? (
              /* ✅ مشترك: يرى التحذيرات الكاملة */
              <View
                style={{
                  backgroundColor: colors.error + "10",
                  borderWidth: 1.5,
                  borderColor: colors.error + "35",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.error,
                    textAlign: "right",
                    writingDirection: "rtl",
                    marginBottom: 10,
                  }}
                >
                  ⚠️ تحذير صحي لك ({conditionLabel})
                </Text>
                {healthWarnings.map((warning, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "flex-start",
                      marginBottom: index < healthWarnings.length - 1 ? 10 : 0,
                      backgroundColor: getSeverityColor(warning.severity) + "12",
                      borderRadius: 10,
                      padding: 10,
                      borderRightWidth: 3,
                      borderRightColor: getSeverityColor(warning.severity),
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: getSeverityColor(warning.severity),
                          textAlign: "right",
                          writingDirection: "rtl",
                          marginBottom: 3,
                        }}
                      >
                        {warning.severity === "high"
                          ? "🔴"
                          : warning.severity === "medium"
                          ? "🟡"
                          : "🔵"}{" "}
                        {warning.cause}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 20,
                          color: colors.foreground,
                          textAlign: "right",
                          writingDirection: "rtl",
                          marginBottom: 6,
                        }}
                      >
                        {warning.message}
                      </Text>
                      {/* البدائل الصحية */}
                      {warning.alternatives && warning.alternatives.length > 0 && (
                        <View style={{
                          backgroundColor: "#10B98115",
                          borderRadius: 8,
                          padding: 8,
                          marginTop: 2,
                        }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#10B981",
                            textAlign: "right",
                            writingDirection: "rtl",
                            marginBottom: 4,
                          }}>
                            ✅ البدائل الصحية:
                          </Text>
                          {warning.alternatives.map((alt, altIdx) => (
                            <Text
                              key={altIdx}
                              style={{
                                fontSize: 12,
                                lineHeight: 18,
                                color: colors.foreground,
                                textAlign: "right",
                                writingDirection: "rtl",
                                paddingRight: 8,
                              }}
                            >
                              • {alt}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* 🔒 غير مشترك: يرى التحذير مقفلاً */
              <TouchableOpacity
                onPress={handleLockedWarningPress}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.error + "10",
                  borderWidth: 1.5,
                  borderColor: colors.error + "35",
                  borderRadius: 16,
                  padding: 16,
                  overflow: "hidden",
                }}
              >
                {/* عنوان التحذير ظاهر */}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.error,
                    textAlign: "right",
                    writingDirection: "rtl",
                    marginBottom: 10,
                  }}
                >
                  ⚠️ تحذير صحي لك ({conditionLabel})
                </Text>

                {/* محتوى مقفل مع تأثير ضبابي */}
                <View style={{ position: "relative" }}>
                  {/* نص مموّه */}
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 22,
                      color: colors.foreground,
                      textAlign: "right",
                      writingDirection: "rtl",
                      opacity: 0.15,
                    }}
                  >
                    {healthWarnings.map((w) => w.cause).join(" و ")} قد يضر بصحتك...
                  </Text>

                  {/* طبقة القفل فوق النص */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row-reverse",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>🔒</Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.error,
                        textAlign: "center",
                      }}
                    >
                      حصري للمشتركين — اضغط لمعرفة التفاصيل
                    </Text>
                  </View>
                </View>

                {/* عدد التحذيرات */}
                <View
                  style={{
                    marginTop: 10,
                    alignItems: "flex-end",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.error,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                      {healthWarnings.length} تحذير صحي مخفي
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

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
                className="rounded-full items-center justify-center"
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
                style={{ fontSize: 15, textAlign: "right", writingDirection: "rtl" }}
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
                  style={{ fontSize: 15, lineHeight: 24, textAlign: "right", writingDirection: "rtl" }}
                >
                  {step}
                </Text>
              </View>
            </View>
          ))}
        </View>

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
              style={{ fontSize: 14, lineHeight: 22, textAlign: "right", writingDirection: "rtl" }}
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
            <Text className="text-muted text-center mt-2" style={{ fontSize: 13 }}>
              شكراً على تقييمج! ألف عافية
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ─── نافذة الاشتراك المنبثقة ─── */}
      <Modal
        visible={showSubscriptionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          activeOpacity={1}
          onPress={() => setShowSubscriptionModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              backgroundColor: colors.background,
              borderRadius: 24,
              padding: 28,
              width: "100%",
              maxWidth: 360,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* أيقونة القفل */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.error + "15",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>

            {/* العنوان */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: colors.foreground,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              التحذيرات الصحية حصرية
            </Text>

            {/* الوصف */}
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: colors.muted,
                textAlign: "center",
                writingDirection: "rtl",
                marginBottom: 8,
              }}
            >
              التحذيرات الصحية المخصصة لحالتك ({conditionLabel}) متاحة فقط للمشتركين في عافيات.
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: colors.muted,
                textAlign: "center",
                writingDirection: "rtl",
                marginBottom: 24,
              }}
            >
              اشترك الآن لتعرف بالضبط ما يضر بصحتك في كل وصفة! 💚
            </Text>

            {/* مميزات الاشتراك */}
            {[
              "⚠️ تحذيرات صحية مخصصة لك",
              "🔍 تحليل دقيق لكل مكون",
              "💡 نصائح بديلة صحية",
              "🌟 الوصول لجميع الوصفات",
            ].map((feature, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  width: "100%",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.foreground,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}

            {/* زر الاشتراك مع التجربة المجانية */}
            <TouchableOpacity
              onPress={() => {
                setShowSubscriptionModal(false);
                router.push("/(tabs)/subscription" as any);
              }}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 32,
                width: "100%",
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                🎁 جرّب مجاناً 3 أيام
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
                ثم 5,250 د.ع/شهر • إلغاء في أي وقت
              </Text>
            </TouchableOpacity>

            {/* فاصل */}
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.muted, fontSize: 12, marginHorizontal: 10 }}>أو</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* زر مشاهدة إعلان */}
            <TouchableOpacity
              onPress={() => {
                setShowSubscriptionModal(false);
                // TODO: تشغيل إعلان AdMob هنا
                // مؤقتاً: نفتح التحذير مباشرة
                alert("شكراً! سيتم فتح التحذيرات بعد مشاهدة الإعلان");
              }}
              style={{
                borderWidth: 1.5,
                borderColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 13,
                paddingHorizontal: 32,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "700" }}>
                📺 شاهد إعلاناً لفتح التحذيرات
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                مجاناً • إعلان قصير 30 ثانية
              </Text>
            </TouchableOpacity>

            {/* زر الإغلاق */}
            <TouchableOpacity
              onPress={() => setShowSubscriptionModal(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: colors.muted, fontSize: 14 }}>ليس الآن</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useUser } from "@/lib/user-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

I18nManager.forceRTL(true);

interface FoodItem {
  name: string;
  caloriesPer100g: number;
  emoji: string;
  category: string;
}

const COMMON_FOODS: FoodItem[] = [
  // خبز ونشويات
  { name: "صمون عراقي", caloriesPer100g: 275, emoji: "🍞", category: "نشويات" },
  { name: "رز أبيض مطبوخ", caloriesPer100g: 130, emoji: "🍚", category: "نشويات" },
  { name: "رز بسمتي", caloriesPer100g: 150, emoji: "🍚", category: "نشويات" },
  { name: "خبز تنور", caloriesPer100g: 260, emoji: "🫓", category: "نشويات" },
  { name: "معكرونة مطبوخة", caloriesPer100g: 131, emoji: "🍝", category: "نشويات" },
  { name: "برغل", caloriesPer100g: 83, emoji: "🌾", category: "نشويات" },
  // لحوم
  { name: "لحم غنم", caloriesPer100g: 250, emoji: "🥩", category: "لحوم" },
  { name: "صدر دجاج مشوي", caloriesPer100g: 165, emoji: "🍗", category: "لحوم" },
  { name: "دجاج بالجلد", caloriesPer100g: 239, emoji: "🍗", category: "لحوم" },
  { name: "سمك مشوي", caloriesPer100g: 140, emoji: "🐟", category: "لحوم" },
  { name: "كباب عراقي", caloriesPer100g: 220, emoji: "🍢", category: "لحوم" },
  { name: "لحم مفروم", caloriesPer100g: 250, emoji: "🥩", category: "لحوم" },
  // خضروات
  { name: "طماطة", caloriesPer100g: 18, emoji: "🍅", category: "خضروات" },
  { name: "خيار", caloriesPer100g: 15, emoji: "🥒", category: "خضروات" },
  { name: "بصل", caloriesPer100g: 40, emoji: "🧅", category: "خضروات" },
  { name: "بامية", caloriesPer100g: 33, emoji: "🌿", category: "خضروات" },
  { name: "باذنجان", caloriesPer100g: 25, emoji: "🍆", category: "خضروات" },
  { name: "فاصوليا خضراء", caloriesPer100g: 31, emoji: "🫘", category: "خضروات" },
  { name: "سبانخ", caloriesPer100g: 23, emoji: "🥬", category: "خضروات" },
  // فواكه
  { name: "تمر عراقي", caloriesPer100g: 277, emoji: "🌴", category: "فواكه" },
  { name: "تفاح", caloriesPer100g: 52, emoji: "🍎", category: "فواكه" },
  { name: "موز", caloriesPer100g: 89, emoji: "🍌", category: "فواكه" },
  { name: "برتقال", caloriesPer100g: 47, emoji: "🍊", category: "فواكه" },
  { name: "رمان", caloriesPer100g: 83, emoji: "🫐", category: "فواكه" },
  // ألبان
  { name: "قيمر (قشطة)", caloriesPer100g: 195, emoji: "🥛", category: "ألبان" },
  { name: "لبن", caloriesPer100g: 61, emoji: "🥛", category: "ألبان" },
  { name: "جبن أبيض", caloriesPer100g: 264, emoji: "🧀", category: "ألبان" },
  { name: "حليب كامل الدسم", caloriesPer100g: 61, emoji: "🥛", category: "ألبان" },
  // مشروبات
  { name: "شاي بسكر (استكان)", caloriesPer100g: 30, emoji: "🍵", category: "مشروبات" },
  { name: "شاي بدون سكر", caloriesPer100g: 1, emoji: "🍵", category: "مشروبات" },
  { name: "قهوة عربية", caloriesPer100g: 2, emoji: "☕", category: "مشروبات" },
  // زيوت ودهون
  { name: "زيت زيتون", caloriesPer100g: 884, emoji: "🫒", category: "زيوت" },
  { name: "سمن (دهن حر)", caloriesPer100g: 717, emoji: "🧈", category: "زيوت" },
  { name: "زيت نباتي", caloriesPer100g: 884, emoji: "🫗", category: "زيوت" },
];

interface SelectedFood {
  food: FoodItem;
  grams: number;
}

export default function CalorieCalculatorScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  const categories = useMemo(() => {
    const cats = [...new Set(COMMON_FOODS.map((f) => f.category))];
    return ["الكل", ...cats];
  }, []);

  const filteredFoods = useMemo(() => {
    let result = COMMON_FOODS;
    if (activeCategory !== "الكل") {
      result = result.filter((f) => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      result = result.filter((f) => f.name.includes(searchQuery.trim()));
    }
    return result;
  }, [activeCategory, searchQuery]);

  const totalCalories = useMemo(() => {
    return selectedFoods.reduce(
      (sum, sf) => sum + (sf.food.caloriesPer100g * sf.grams) / 100,
      0
    );
  }, [selectedFoods]);

  const addFood = (food: FoodItem) => {
    setSelectedFoods((prev) => [...prev, { food, grams: 100 }]);
  };

  const removeFood = (index: number) => {
    setSelectedFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGrams = (index: number, grams: number) => {
    setSelectedFoods((prev) =>
      prev.map((sf, i) => (i === index ? { ...sf, grams } : sf))
    );
  };

  // حساب الاحتياج اليومي التقريبي
  const dailyNeeds = useMemo(() => {
    const age = parseInt(profile.age) || 30;
    const isMale = profile.gender === "male";
    // معادلة Harris-Benedict المبسطة
    if (isMale) {
      return Math.round(66.5 + 13.75 * 70 + 5.003 * 170 - 6.755 * age);
    }
    return Math.round(655.1 + 9.563 * 60 + 1.85 * 160 - 4.676 * age);
  }, [profile.age, profile.gender]);

  const caloriePercentage = Math.min((totalCalories / dailyNeeds) * 100, 100);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View
          className="px-5 pt-4 pb-2 flex-row items-center justify-between"
          style={{ flexDirection: "row-reverse" }}
        >
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "right" }}
          >
            حاسبة السعرات
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

        {/* Daily Progress */}
        <View
          className="mx-5 mt-3 rounded-2xl p-5"
          style={{ backgroundColor: colors.surface }}
        >
          <Text
            className="text-foreground font-bold mb-1"
            style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
          >
            سعراتك اليوم
          </Text>
          <View className="flex-row items-end justify-center mt-2 gap-1">
            <Text
              className="text-primary font-bold"
              style={{ fontSize: 42 }}
            >
              {Math.round(totalCalories)}
            </Text>
            <Text className="text-muted mb-2" style={{ fontSize: 14 }}>
              / {dailyNeeds} سعرة
            </Text>
          </View>

          {/* Progress Bar */}
          <View
            className="rounded-full mt-3 overflow-hidden"
            style={{ height: 10, backgroundColor: colors.border }}
          >
            <View
              className="rounded-full h-full"
              style={{
                width: `${caloriePercentage}%`,
                backgroundColor:
                  caloriePercentage > 90
                    ? colors.error
                    : caloriePercentage > 70
                    ? colors.warning
                    : colors.primary,
              }}
            />
          </View>
          <Text
            className="text-muted mt-2"
            style={{ fontSize: 12, textAlign: "center" }}
          >
            {caloriePercentage > 90
              ? "تنبيه! وصلت إلى الحد الأقصى"
              : caloriePercentage > 70
              ? "قربتي من الحد اليومي، خففي شوية"
              : "ماشاء الله، مستمرة بشكل صحي"}
          </Text>
        </View>

        {/* Selected Foods */}
        {selectedFoods.length > 0 && (
          <View className="mx-5 mt-4">
            <Text
              className="text-foreground font-bold mb-2"
              style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
            >
              الأكل اللي أكلتيه اليوم
            </Text>
            {selectedFoods.map((sf, index) => (
              <View
                key={index}
                className="flex-row items-center rounded-xl p-3 mb-2"
                style={{
                  backgroundColor: colors.surface,
                  flexDirection: "row-reverse",
                }}
              >
                <Text style={{ fontSize: 24 }}>{sf.food.emoji}</Text>
                <View className="flex-1 mx-3">
                  <Text
                    className="text-foreground font-bold"
                    style={{
                      fontSize: 14,
                      textAlign: "right",
                      writingDirection: "rtl",
                    }}
                  >
                    {sf.food.name}
                  </Text>
                  <Text className="text-primary" style={{ fontSize: 12 }}>
                    {Math.round((sf.food.caloriesPer100g * sf.grams) / 100)} سعرة
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <TextInput
                    className="text-foreground text-center rounded-lg"
                    style={{
                      width: 55,
                      height: 32,
                      backgroundColor: colors.background,
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    value={String(sf.grams)}
                    onChangeText={(t) => updateGrams(index, parseInt(t) || 0)}
                    keyboardType="numeric"
                  />
                  <Text className="text-muted" style={{ fontSize: 11 }}>
                    غرام
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeFood(index)}
                  style={{ marginRight: 8 }}
                >
                  <IconSymbol name="xmark.circle.fill" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        <View className="px-5 mt-4 mb-2">
          <Text
            className="text-foreground font-bold mb-2"
            style={{ fontSize: 16, textAlign: "right", writingDirection: "rtl" }}
          >
            أضيفي أكلك
          </Text>
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{
              backgroundColor: colors.surface,
              height: 42,
              flexDirection: "row-reverse",
            }}
          >
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              className="flex-1 text-foreground mx-2"
              style={{
                fontSize: 14,
                textAlign: "right",
                writingDirection: "rtl",
                height: 42,
              }}
              placeholder="ابحث عن طعام..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 6,
            flexDirection: "row-reverse",
          }}
          className="mb-3"
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor:
                  activeCategory === cat ? colors.primary : colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: activeCategory === cat ? "#fff" : colors.foreground,
                  fontWeight: activeCategory === cat ? "700" : "400",
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Food Grid */}
        <View className="px-5 flex-row flex-wrap gap-2" style={{ flexDirection: "row-reverse" }}>
          {filteredFoods.map((food, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => addFood(food)}
              className="rounded-xl p-3 items-center"
              style={{
                backgroundColor: colors.surface,
                width: "31%",
                borderWidth: 1,
                borderColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>{food.emoji}</Text>
              <Text
                className="text-foreground font-bold mt-1"
                style={{ fontSize: 11, textAlign: "center" }}
                numberOfLines={1}
              >
                {food.name}
              </Text>
              <Text className="text-muted" style={{ fontSize: 10 }}>
                {food.caloriesPer100g} سعرة/100غ
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

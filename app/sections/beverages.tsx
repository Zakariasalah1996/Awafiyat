import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

I18nManager.forceRTL(true);

interface Beverage {
  id: string;
  name: string;
  nameEn: string;
  category: "hot" | "cold" | "juice" | "smoothie" | "traditional";
  type: "healthy" | "regular";
  ingredients: string[];
  instructions: string[];
  calories: number;
  healthTags: string[];
  emoji: string;
  prepTime: string;
}

const BEVERAGES: Beverage[] = [
  // المشروبات الساخة
  {
    id: "bev_1",
    name: "شاي أسود بالنعناع",
    nameEn: "Black Tea with Mint",
    category: "hot",
    type: "healthy",
    ingredients: ["شاي أسود", "نعناع طازج", "ماء", "عسل"],
    instructions: [
      "سخن الماء حتى يغلي",
      "ضع الشاي والنعناع في الكوب",
      "اسكب الماء الساخن",
      "اترك لمدة 3-5 دقائق",
      "أضف العسل حسب الرغبة",
    ],
    calories: 45,
    healthTags: ["all", "diabetes", "cholesterol"],
    emoji: "🫖",
    prepTime: "5 دقائق",
  },
  {
    id: "bev_2",
    name: "قهوة عراقية",
    nameEn: "Iraqi Coffee",
    category: "hot",
    type: "regular",
    ingredients: ["قهوة مطحونة ناعم", "ماء", "هيل", "قرنفل"],
    instructions: [
      "ضع الماء في الدلة",
      "أضف القهوة والهيل والقرنفل",
      "ضع على النار حتى تغلي",
      "اسكب في فناجين صغيرة",
    ],
    calories: 5,
    healthTags: ["all"],
    emoji: "☕",
    prepTime: "10 دقائق",
  },
  {
    id: "bev_3",
    name: "حليب بالكركم (الذهبي)",
    nameEn: "Turmeric Milk",
    category: "hot",
    type: "healthy",
    ingredients: ["حليب", "كركم", "عسل", "قرفة", "زنجبيل"],
    instructions: [
      "سخن الحليب",
      "أضف الكركم والزنجبيل والقرفة",
      "اخلط جيداً",
      "أضف العسل",
      "قدم ساخناً",
    ],
    calories: 150,
    healthTags: ["all", "diabetes", "cholesterol"],
    emoji: "🥛",
    prepTime: "5 دقائق",
  },

  // المشروبات الباردة
  {
    id: "bev_4",
    name: "عصير الليمون والنعناع",
    nameEn: "Lemon Mint Juice",
    category: "cold",
    type: "healthy",
    ingredients: ["ليمون", "نعناع", "ماء بارد", "عسل", "ثلج"],
    instructions: [
      "اعصر الليمون",
      "أضف النعناع المفروم",
      "أضف الماء البارد والثلج",
      "أضف العسل حسب الرغبة",
      "اخلط جيداً",
    ],
    calories: 30,
    healthTags: ["all", "diabetes"],
    emoji: "🍋",
    prepTime: "5 دقائق",
  },
  {
    id: "bev_5",
    name: "شراب التمر الهندي",
    nameEn: "Tamarind Drink",
    category: "cold",
    type: "regular",
    ingredients: ["تمر هندي", "ماء", "سكر", "ملح", "ثلج"],
    instructions: [
      "انقع التمر الهندي في الماء",
      "صفِ الخليط",
      "أضف السكر والملح",
      "أضف الثلج",
      "قدم بارداً",
    ],
    calories: 80,
    healthTags: ["all"],
    emoji: "🥤",
    prepTime: "10 دقائق",
  },

  // العصائر
  {
    id: "bev_6",
    name: "عصير البرتقال الطازج",
    nameEn: "Fresh Orange Juice",
    category: "juice",
    type: "healthy",
    ingredients: ["برتقال طازج"],
    instructions: [
      "اختر برتقال ناضج",
      "اعصره باستخدام عصارة",
      "قدم فوراً",
    ],
    calories: 60,
    healthTags: ["all", "diabetes"],
    emoji: "🍊",
    prepTime: "5 دقائق",
  },
  {
    id: "bev_7",
    name: "عصير الرمان",
    nameEn: "Pomegranate Juice",
    category: "juice",
    type: "healthy",
    ingredients: ["رمان طازج", "ماء"],
    instructions: [
      "قطع الرمان",
      "استخرج الحبات",
      "اعصرها",
      "أضف قليل من الماء",
      "قدم بارداً",
    ],
    calories: 65,
    healthTags: ["all", "diabetes", "cholesterol"],
    emoji: "🍎",
    prepTime: "10 دقائق",
  },

  // السموثي
  {
    id: "bev_8",
    name: "سموثي الموز والفراولة",
    nameEn: "Banana Strawberry Smoothie",
    category: "smoothie",
    type: "healthy",
    ingredients: ["موز", "فراولة", "حليب", "عسل", "ثلج"],
    instructions: [
      "ضع الموز والفراولة في الخلاط",
      "أضف الحليب والعسل",
      "أضف الثلج",
      "اخلط حتى يصبح ناعماً",
      "قدم فوراً",
    ],
    calories: 180,
    healthTags: ["all"],
    emoji: "🍓",
    prepTime: "5 دقائق",
  },
  {
    id: "bev_9",
    name: "سموثي الأفوكادو والتمر",
    nameEn: "Avocado Date Smoothie",
    category: "smoothie",
    type: "healthy",
    ingredients: ["أفوكادو", "تمر", "حليب", "ثلج"],
    instructions: [
      "ضع الأفوكادو والتمر",
      "أضف الحليب والثلج",
      "اخلط جيداً",
      "قدم بارداً",
    ],
    calories: 220,
    healthTags: ["all"],
    emoji: "🥑",
    prepTime: "5 دقائق",
  },

  // المشروبات التقليدية
  {
    id: "bev_10",
    name: "شراب الورد",
    nameEn: "Rose Syrup Drink",
    category: "traditional",
    type: "regular",
    ingredients: ["شراب الورد", "ماء بارد", "ثلج"],
    instructions: [
      "ضع شراب الورد في الكوب",
      "أضف الماء البارد",
      "أضف الثلج",
      "اخلط جيداً",
    ],
    calories: 60,
    healthTags: ["all"],
    emoji: "🌹",
    prepTime: "2 دقيقة",
  },
  {
    id: "bev_11",
    name: "شراب الزعفران",
    nameEn: "Saffron Drink",
    category: "traditional",
    type: "regular",
    ingredients: ["زعفران", "ماء ساخن", "سكر", "حليب"],
    instructions: [
      "انقع الزعفران في ماء ساخن",
      "أضف السكر",
      "أضف الحليب",
      "اخلط جيداً",
    ],
    calories: 120,
    healthTags: ["all"],
    emoji: "✨",
    prepTime: "5 دقائق",
  },
];

const CATEGORIES = [
  { key: "hot", label: "ساخنة", emoji: "🔥" },
  { key: "cold", label: "باردة", emoji: "❄️" },
  { key: "juice", label: "عصائر", emoji: "🧃" },
  { key: "smoothie", label: "سموثي", emoji: "🥤" },
  { key: "traditional", label: "تقليدية", emoji: "🏺" },
];

export default function BeveragesScreen() {
  const colors = useColors();
  const { profile } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string>("hot");
  const [selectedType, setSelectedType] = useState<"all" | "healthy" | "regular">("all");

  const filteredBeverages = useMemo(() => {
    return BEVERAGES.filter((bev) => {
      const categoryMatch = bev.category === selectedCategory;
      const typeMatch = selectedType === "all" || bev.type === selectedType;
      const healthMatch =
        profile.healthCondition === "none" ||
        bev.healthTags.includes(profile.healthCondition) ||
        bev.healthTags.includes("all");

      return categoryMatch && typeMatch && healthMatch;
    });
  }, [selectedCategory, selectedType, profile.healthCondition]);

  const renderBeverageCard = ({ item }: { item: Beverage }) => (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-4 mb-3 border"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-2xl">{item.emoji}</Text>
            <Text className="text-lg font-bold text-foreground flex-1">{item.name}</Text>
          </View>
          <Text className="text-sm text-muted mb-2">{item.nameEn}</Text>
        </View>
        <View
          className="px-2 py-1 rounded-lg"
          style={{
            backgroundColor: item.type === "healthy" ? "#4CAF5020" : "#FF980020",
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{
              color: item.type === "healthy" ? "#4CAF50" : "#FF9800",
            }}
          >
            {item.type === "healthy" ? "صحي" : "عادي"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4 mb-3">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="schedule" size={16} color={colors.muted} />
          <Text className="text-sm text-muted">{item.prepTime}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="local-fire-department" size={16} color={colors.muted} />
          <Text className="text-sm text-muted">{item.calories} سعرة</Text>
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-foreground mb-1">المكونات:</Text>
        <Text className="text-sm text-muted">{item.ingredients.join(" • ")}</Text>
      </View>

      <TouchableOpacity
        className="py-2 px-3 rounded-lg items-center"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-sm font-semibold text-background">عرض الطريقة</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground mb-1">🥤 المشروبات</Text>
          <Text className="text-base text-muted">مشروبات صحية وعراقية تقليدية</Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              className="px-4 py-2 rounded-full flex-row items-center gap-1"
              style={{
                backgroundColor:
                  selectedCategory === cat.key
                    ? colors.primary
                    : colors.background,
                borderWidth: 1,
                borderColor:
                  selectedCategory === cat.key ? colors.primary : colors.border,
              }}
            >
              <Text className="text-lg">{cat.emoji}</Text>
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    selectedCategory === cat.key
                      ? colors.background
                      : colors.foreground,
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type Filter */}
        <View className="px-5 mb-4 flex-row gap-2">
          {[
            { key: "all", label: "الكل" },
            { key: "healthy", label: "صحي" },
            { key: "regular", label: "عادي" },
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() => setSelectedType(type.key as any)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{
                backgroundColor:
                  selectedType === type.key
                    ? colors.primary
                    : colors.background,
                borderWidth: 1,
                borderColor:
                  selectedType === type.key ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    selectedType === type.key
                      ? colors.background
                      : colors.foreground,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Beverages List */}
        <View className="px-5">
          {filteredBeverages.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-lg text-muted">لا توجد مشروبات متاحة</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBeverages}
              renderItem={renderBeverageCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

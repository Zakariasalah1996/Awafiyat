import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

I18nManager.forceRTL(true);

const SHOPPING_LIST_KEY = "@awafiyat_shopping_list";

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  emoji: string;
}

const CATEGORIES: { name: string; emoji: string; items: string[] }[] = [
  {
    name: "لحوم ودجاج",
    emoji: "🥩",
    items: ["لحم غنم", "صدر دجاج", "لحم مفروم", "سمك", "كباب"],
  },
  {
    name: "خضروات",
    emoji: "🥬",
    items: [
      "طماطة",
      "بصل",
      "ثوم",
      "بامية",
      "باذنجان",
      "فلفل أخضر",
      "خيار",
      "بطاطا",
      "جزر",
      "سبانخ",
      "فاصوليا",
      "كوسة",
    ],
  },
  {
    name: "فواكه",
    emoji: "🍎",
    items: ["تمر", "تفاح", "موز", "برتقال", "ليمون", "رمان"],
  },
  {
    name: "بقوليات وحبوب",
    emoji: "🌾",
    items: ["رز", "عدس", "حمص", "فاصوليا يابسة", "برغل", "فريكة", "شعيرية"],
  },
  {
    name: "ألبان وبيض",
    emoji: "🥛",
    items: ["حليب", "لبن", "قيمر", "جبن", "بيض", "زبدة"],
  },
  {
    name: "بهارات وتوابل",
    emoji: "🧂",
    items: [
      "ملح",
      "فلفل أسود",
      "كركم",
      "كمون",
      "بهارات مشكلة",
      "قرفة",
      "هيل",
      "زعفران",
      "نعناع يابس",
      "سماق",
    ],
  },
  {
    name: "زيوت وصلصات",
    emoji: "🫒",
    items: [
      "زيت نباتي",
      "زيت زيتون",
      "سمن (دهن حر)",
      "معجون طماطة",
      "خل",
      "دبس رمان",
    ],
  },
  {
    name: "خبز ومعجنات",
    emoji: "🍞",
    items: ["صمون", "خبز تنور", "خبز أبيض", "طحين", "خميرة"],
  },
];

export default function ShoppingListScreen() {
  const router = useRouter();
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // تحميل القائمة المحفوظة عند فتح الشاشة
  useEffect(() => {
    const loadItems = async () => {
      try {
        const saved = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
        if (saved) {
          setItems(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load shopping list:", e);
      } finally {
        setLoaded(true);
      }
    };
    loadItems();
  }, []);

  // حفظ القائمة تلقائياً عند أي تغيير
  useEffect(() => {
    if (!loaded) return; // لا نحفظ قبل التحميل الأولي
    const saveItems = async () => {
      try {
        await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save shopping list:", e);
      }
    };
    saveItems();
  }, [items, loaded]);

  const addItem = useCallback(
    (name: string, category: string, emoji: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const exists = items.some(
        (i) => i.name === name && !i.checked
      );
      if (exists) return;
      setItems((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          name,
          category,
          emoji,
          checked: false,
        },
      ]);
    },
    [items]
  );

  const addCustomItem = () => {
    if (!newItemText.trim()) return;
    addItem(newItemText.trim(), "أخرى", "🛒");
    setNewItemText("");
  };

  const toggleItem = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearChecked = () => {
    setItems((prev) => prev.filter((item) => !item.checked));
  };

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;

  if (!loaded) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted" style={{ fontSize: 16 }}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

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
            قائمة التسوق
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

        {/* Add Custom Item */}
        <View className="px-5 mt-3 mb-4">
          <View
            className="flex-row items-center rounded-xl overflow-hidden"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row-reverse",
            }}
          >
            <TextInput
              className="flex-1 text-foreground px-4"
              style={{
                fontSize: 15,
                textAlign: "right",
                writingDirection: "rtl",
                height: 48,
              }}
              placeholder="أضيفي شي للقائمة..."
              placeholderTextColor={colors.muted}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={addCustomItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={addCustomItem}
              className="px-4 items-center justify-center"
              style={{ height: 48, backgroundColor: colors.primary }}
            >
              <IconSymbol name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggle Categories */}
        <TouchableOpacity
          onPress={() => setShowCategories(!showCategories)}
          className="mx-5 mb-3 rounded-xl py-3 flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: colors.primary + "10",
            flexDirection: "row-reverse",
          }}
        >
          <Text style={{ fontSize: 16 }}>🛒</Text>
          <Text className="text-primary font-bold" style={{ fontSize: 14 }}>
            {showCategories ? "إخفاء المنتجات الشائعة" : "عرض المنتجات الشائعة"}
          </Text>
        </TouchableOpacity>

        {/* Quick Add Categories */}
        {showCategories &&
          CATEGORIES.map((cat) => (
            <View key={cat.name} className="px-5 mb-4">
              <Text
                className="text-foreground font-bold mb-2"
                style={{
                  fontSize: 15,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                {cat.emoji} {cat.name}
              </Text>
              <View
                className="flex-row flex-wrap gap-2"
                style={{ flexDirection: "row-reverse" }}
              >
                {cat.items.map((itemName) => {
                  const isAdded = items.some(
                    (i) => i.name === itemName && !i.checked
                  );
                  return (
                    <TouchableOpacity
                      key={itemName}
                      onPress={() => addItem(itemName, cat.name, cat.emoji)}
                      className="rounded-full px-3 py-2"
                      style={{
                        backgroundColor: isAdded
                          ? colors.primary + "20"
                          : colors.surface,
                        borderWidth: 1,
                        borderColor: isAdded ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: isAdded ? colors.primary : colors.foreground,
                          fontWeight: isAdded ? "700" : "400",
                        }}
                      >
                        {isAdded ? "✓ " : ""}
                        {itemName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

        {/* Shopping List */}
        {items.length > 0 && (
          <View className="px-5 mt-2">
            <View
              className="flex-row items-center justify-between mb-3"
              style={{ flexDirection: "row-reverse" }}
            >
              <Text
                className="text-foreground font-bold"
                style={{ fontSize: 17, textAlign: "right" }}
              >
                قائمتج ({uncheckedCount} باقي)
              </Text>
              {checkedCount > 0 && (
                <TouchableOpacity onPress={clearChecked}>
                  <Text className="text-error" style={{ fontSize: 13 }}>
                    حذف المشطوبات
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Unchecked Items */}
            {items
              .filter((i) => !i.checked)
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItem(item.id)}
                  className="flex-row items-center rounded-xl p-3 mb-2"
                  style={{
                    backgroundColor: colors.surface,
                    flexDirection: "row-reverse",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      marginLeft: 10,
                    }}
                  />
                  <Text
                    className="text-foreground flex-1"
                    style={{
                      fontSize: 15,
                      textAlign: "right",
                      writingDirection: "rtl",
                    }}
                  >
                    {item.emoji} {item.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <IconSymbol
                      name="xmark.circle.fill"
                      size={20}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

            {/* Checked Items */}
            {checkedCount > 0 && (
              <Text
                className="text-muted mt-3 mb-2"
                style={{
                  fontSize: 13,
                  textAlign: "right",
                  writingDirection: "rtl",
                }}
              >
                تم شراؤها ({checkedCount})
              </Text>
            )}
            {items
              .filter((i) => i.checked)
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItem(item.id)}
                  className="flex-row items-center rounded-xl p-3 mb-2"
                  style={{
                    backgroundColor: colors.surface,
                    opacity: 0.5,
                    flexDirection: "row-reverse",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: colors.success,
                      marginLeft: 10,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>
                  </View>
                  <Text
                    className="text-muted flex-1"
                    style={{
                      fontSize: 15,
                      textAlign: "right",
                      writingDirection: "rtl",
                      textDecorationLine: "line-through",
                    }}
                  >
                    {item.emoji} {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Empty State */}
        {items.length === 0 && !showCategories && (
          <View className="items-center justify-center py-16">
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text
              className="text-muted mt-3"
              style={{ fontSize: 15, textAlign: "center" }}
            >
              قائمة التسوق فارغة{"\n"}أضف المنتجات التي تحتاجها
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

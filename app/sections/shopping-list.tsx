import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Platform,
  Modal,
  FlatList,
  Alert,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { scheduleShoppingReminder } from "@/lib/notifications";
import * as Notifications from "expo-notifications";

I18nManager.forceRTL(true);

const SHOPPING_LIST_KEY = "@awafiyat_shopping_list";
const SHOPPING_REMINDER_KEY = "@awafiyat_shopping_reminder";

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  emoji: string;
}

interface ShoppingReminderData {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
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

// أوقات التذكير المتاحة
const REMINDER_TIMES: { hour: number; minute: number; label: string }[] = [
  { hour: 8, minute: 0, label: "8:00 صباحاً" },
  { hour: 9, minute: 0, label: "9:00 صباحاً" },
  { hour: 10, minute: 0, label: "10:00 صباحاً" },
  { hour: 11, minute: 0, label: "11:00 صباحاً" },
  { hour: 12, minute: 0, label: "12:00 ظهراً" },
  { hour: 13, minute: 0, label: "1:00 ظهراً" },
  { hour: 14, minute: 0, label: "2:00 عصراً" },
  { hour: 15, minute: 0, label: "3:00 عصراً" },
  { hour: 16, minute: 0, label: "4:00 عصراً" },
  { hour: 17, minute: 0, label: "5:00 مساءً" },
  { hour: 18, minute: 0, label: "6:00 مساءً" },
  { hour: 19, minute: 0, label: "7:00 مساءً" },
  { hour: 20, minute: 0, label: "8:00 مساءً" },
];

export default function ShoppingListScreen() {
  const router = useRouter();
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminder, setReminder] = useState<ShoppingReminderData>({
    enabled: false,
    hour: 10,
    minute: 0,
    notificationId: null,
  });

  // تحميل القائمة والتذكير المحفوظين
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedItems, savedReminder] = await Promise.all([
          AsyncStorage.getItem(SHOPPING_LIST_KEY),
          AsyncStorage.getItem(SHOPPING_REMINDER_KEY),
        ]);
        if (savedItems) {
          setItems(JSON.parse(savedItems));
        }
        if (savedReminder) {
          setReminder(JSON.parse(savedReminder));
        }
      } catch (e) {
        console.error("Failed to load shopping data:", e);
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

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

  // حفظ القائمة يدوياً
  const handleSaveList = async () => {
    try {
      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSaveMessage("تم حفظ قائمة التسوق بنجاح");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error("Failed to save shopping list:", e);
      setSaveMessage("فشل الحفظ، حاول مرة أخرى");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  // حفظ تلقائي عند التغيير
  useEffect(() => {
    if (!loaded) return;
    const saveItems = async () => {
      try {
        await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to auto-save shopping list:", e);
      }
    };
    saveItems();
  }, [items, loaded]);

  // ضبط تذكير التسوق
  const setShoppingReminder = async (hour: number, minute: number, label: string) => {
    try {
      // إلغاء التذكير السابق
      if (reminder.notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        } catch (e) {
          // ignore
        }
      }

      // جدولة إشعار جديد
      const uncheckedItems = items.filter((i) => !i.checked).map((i) => i.name);
      const notificationId = await scheduleShoppingReminder(
        uncheckedItems.length > 0 ? uncheckedItems : ["قائمة التسوق"],
        hour,
        minute
      );

      const newReminder: ShoppingReminderData = {
        enabled: true,
        hour,
        minute,
        notificationId,
      };
      setReminder(newReminder);
      await AsyncStorage.setItem(SHOPPING_REMINDER_KEY, JSON.stringify(newReminder));

      setShowReminderModal(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSaveMessage(`تم ضبط التذكير يومياً الساعة ${label}`);
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (e) {
      console.error("Failed to set shopping reminder:", e);
      Alert.alert("خطأ", "لم نتمكن من ضبط التذكير، تأكد من تفعيل الإشعارات");
    }
  };

  // إلغاء تذكير التسوق
  const cancelShoppingReminder = async () => {
    try {
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }
      // إلغاء أي إشعارات تسوق أخرى
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === "shopping") {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }
      const newReminder: ShoppingReminderData = {
        enabled: false,
        hour: 10,
        minute: 0,
        notificationId: null,
      };
      setReminder(newReminder);
      await AsyncStorage.setItem(SHOPPING_REMINDER_KEY, JSON.stringify(newReminder));
      setSaveMessage("تم إلغاء تذكير التسوق");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error("Failed to cancel shopping reminder:", e);
    }
  };

  const getReminderLabel = () => {
    const found = REMINDER_TIMES.find(
      (t) => t.hour === reminder.hour && t.minute === reminder.minute
    );
    return found?.label || `${reminder.hour}:${String(reminder.minute).padStart(2, "0")}`;
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

        {/* رسالة تأكيد */}
        {saveMessage !== "" && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 8,
              marginBottom: 4,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: `${colors.success}20`,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 14, fontWeight: "600" }}>
              {saveMessage}
            </Text>
          </View>
        )}

        {/* تذكير التسوق */}
        <View
          className="mx-5 mt-3 mb-3 rounded-xl p-4"
          style={{
            backgroundColor: reminder.enabled ? `${colors.primary}10` : colors.surface,
            borderWidth: 1,
            borderColor: reminder.enabled ? colors.primary : colors.border,
          }}
        >
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 20 }}>⏰</Text>
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.foreground,
                    textAlign: "right",
                    writingDirection: "rtl",
                  }}
                >
                  تذكير التسوق
                </Text>
                {reminder.enabled ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.primary,
                      textAlign: "right",
                      writingDirection: "rtl",
                      marginTop: 2,
                    }}
                  >
                    يومياً الساعة {getReminderLabel()}
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.muted,
                      textAlign: "right",
                      writingDirection: "rtl",
                      marginTop: 2,
                    }}
                  >
                    متى تحب نذكرك بقائمة التسوق؟
                  </Text>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {reminder.enabled && (
                <TouchableOpacity
                  onPress={cancelShoppingReminder}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: `${colors.error}15`,
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600" }}>إلغاء</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowReminderModal(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 13, color: "#fff", fontWeight: "700" }}>
                  {reminder.enabled ? "تغيير" : "ضبط الوقت"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Add Custom Item */}
        <View className="px-5 mt-1 mb-4">
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

        {/* زر حفظ القائمة */}
        {items.length > 0 && (
          <TouchableOpacity
            onPress={handleSaveList}
            style={{
              marginHorizontal: 20,
              marginTop: 20,
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="save" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              حفظ القائمة
            </Text>
          </TouchableOpacity>
        )}

        {/* زر مشاركة القائمة */}
        {items.length > 0 && (
          <TouchableOpacity
            onPress={async () => {
              const uncheckedItems = items.filter((i) => !i.checked);
              const checkedItems = items.filter((i) => !i.checked ? false : true);
              let message = "🛒 قائمة التسوق من \"ألف عافيات\":\n\n";
              
              // المواد المطلوبة (غير المشطوبة)
              if (uncheckedItems.length > 0) {
                uncheckedItems.forEach((item) => {
                  message += `\u25CB ${item.emoji} ${item.name}\n`;
                });
              }
              
              // المواد المشتراة (المشطوبة)
              const boughtItems = items.filter((i) => i.checked);
              if (boughtItems.length > 0) {
                message += "\n✅ تم شراؤها:\n";
                boughtItems.forEach((item) => {
                  message += `\u2713 ${item.emoji} ${item.name}\n`;
                });
              }
              
              message += "\nبالعافية! 💚";
              
              try {
                await Share.share({
                  message: message,
                });
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } catch (e) {
                // المستخدم ألغى المشاركة
              }
            }}
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: "#25D366",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: "#25D366",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="share" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              مشاركة القائمة
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* مودال اختيار وقت التذكير */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: 40,
              maxHeight: "70%",
            }}
          >
            {/* عنوان المودال */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.foreground,
                    textAlign: "right",
                  }}
                >
                  ⏰ متى تحب نذكرك؟
                </Text>
                <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  textAlign: "right",
                  writingDirection: "rtl",
                  marginTop: 6,
                }}
              >
                اختر الوقت المناسب وسنذكرك يومياً بقائمة التسوق
              </Text>
            </View>

            {/* قائمة الأوقات */}
            <FlatList
              data={REMINDER_TIMES}
              keyExtractor={(item) => `${item.hour}:${item.minute}`}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12 }}
              renderItem={({ item: timeOption }) => {
                const isSelected =
                  reminder.enabled &&
                  reminder.hour === timeOption.hour &&
                  reminder.minute === timeOption.minute;
                return (
                  <TouchableOpacity
                    onPress={() => setShoppingReminder(timeOption.hour, timeOption.minute, timeOption.label)}
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? colors.primary : colors.foreground,
                        textAlign: "right",
                      }}
                    >
                      {timeOption.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { searchIngredients, type Ingredient } from "@/lib/data/ingredients";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/lib/user-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { showRewardedAd } from "@/lib/admob";
import { AdLockModal } from "@/components/ad-lock-modal";

I18nManager.forceRTL(true);



export default function FridgeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();
  const { isPremium: isSubscribed } = useSubscriptionContext();
  const [activeSection, setActiveSection] = useState<"choose" | "fresh" | "leftovers">("choose");
  const [inputText, setInputText] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [showAdModal, setShowAdModal] = useState(false);

  const suggestMutation = trpc.fridge.suggest.useMutation();



  // البحث في المكونات عند الكتابة
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    if (text.trim().length > 0) {
      const results = searchIngredients(text.trim());
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, []);

  // إضافة مكون من الاقتراحات
  const addIngredient = useCallback(
    (ingredient: Ingredient) => {
      if (!selectedIngredients.includes(ingredient.name)) {
        setSelectedIngredients((prev) => [...prev, ingredient.name]);
      }
      setInputText("");
      setSuggestions([]);
      inputRef.current?.focus();
    },
    [selectedIngredients]
  );

  // إضافة مكون مكتوب يدوياً
  const addCustomIngredient = useCallback(() => {
    const trimmed = inputText.trim();
    if (trimmed.length > 0 && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients((prev) => [...prev, trimmed]);
    }
    setInputText("");
    setSuggestions([]);
  }, [inputText, selectedIngredients]);

  // حذف مكون
  const removeIngredient = useCallback((name: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i !== name));
  }, []);

  // طلب اقتراح من الذكاء الاصطناعي (يعمل بعد مشاهدة الإعلان أو للمشتركين)
  const doAskAI = useCallback(async () => {
    if (selectedIngredients.length === 0) return;

    setIsLoading(true);
    setShowResult(true);
    setAiResponse("");

    try {
      const result = await suggestMutation.mutateAsync({
        ingredients: selectedIngredients.join("، "),
        healthCondition: profile?.healthCondition || "none",
      });
      const text = result.suggestion;
      setAiResponse(typeof text === "string" ? text : "");
    } catch (error) {
      setAiResponse(
        "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى بعد قليل!"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedIngredients, profile?.healthCondition, suggestMutation]);

  // زر الاقتراح: إذا مشترك يعمل مباشرة، وإلا يفتح نافذة الإعلان
  const handleSuggestPress = useCallback(() => {
    if (selectedIngredients.length === 0) return;
    if (isSubscribed) {
      doAskAI();
    } else {
      setShowAdModal(true);
    }
  }, [selectedIngredients, isSubscribed, doAskAI]);

  // إعادة تعيين
  const resetAll = useCallback(() => {
    setSelectedIngredients([]);
    setAiResponse("");
    setShowResult(false);
    setInputText("");
    setSuggestions([]);
  }, []);

  // شاشة التحميل
  if (loadingUsage) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2D5A3D" />
        </View>
      </ScreenContainer>
    );
  }

  // شاشة الاختيار (مواد طازجة / تجديد النعمة)
  if (activeSection === "choose") {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 px-5 pt-3">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="arrow-forward" size={24} color="#2D5A3D" />
            </TouchableOpacity>
            <Text
              className="text-xl font-bold text-foreground"
            >
              ماذا في ثلاجتي؟ 🧴
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* البطاقتين */}
          <View className="flex-1 justify-center gap-5 px-2">
            {/* بطاقة مواد طازجة */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveSection("fresh");
              }}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#F0F7EC",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1.5,
                borderColor: "#C8E6C9",
              }}
            >
              <View className="flex-row items-center gap-4">
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 28 }}>🥬</Text>
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: 20, fontWeight: "700", color: "#2D5A3D", marginBottom: 4 }}>
                    مواد طازجة
                  </Text>
                  <Text style={{ fontSize: 14, color: "#5D8A3C", lineHeight: 20 }}>
                    عندك مكونات خامة؟ أخبرنا ونقترح لك وصفة!
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={24} color="#5D8A3C" />
              </View>
            </TouchableOpacity>

            {/* بطاقة تجديد النعمة */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/sections/leftovers-renew" as any);
              }}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#FFF5EB",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1.5,
                borderColor: "#FFE0B2",
              }}
            >
              <View className="flex-row items-center gap-4">
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 28 }}>🍲</Text>
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: 20, fontWeight: "700", color: "#E65100", marginBottom: 4 }}>
                    تجديد النعمة
                  </Text>
                  <Text style={{ fontSize: 14, color: "#E67E22", lineHeight: 20 }}>
                    الأكلات المتبقية من أمس - لا ترميها!
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={24} color="#E67E22" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // إذا اختار "تجديد النعمة" يذهب لشاشة leftovers-renew (handled above via router.push)
  // إذا اختار "مواد طازجة" يكمل للأسفل (الشاشة الأصلية)



  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <TouchableOpacity
            onPress={() => setActiveSection("choose")}
            style={{ padding: 8 }}
          >
            <MaterialIcons name="arrow-forward" size={24} color="#2D5A3D" />
          </TouchableOpacity>
          <Text
            className="text-xl font-bold text-foreground"
          >
            مواد طازجة 🥬
          </Text>
          <View style={{ width: 40 }} />
        </View>



        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!showResult ? (
            <>
              {/* السؤال الرئيسي */}
              <View className="items-center mt-6 mb-4">
                <Text className="text-lg text-center text-muted leading-8">
                  اكتبي الشغلات الموجودة عندج{"\n"}حتى اقترح عليج أكلات لذيذة
                </Text>
              </View>

              {/* المكونات المختارة */}
              {selectedIngredients.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {selectedIngredients.map((name) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => removeIngredient(name)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#E8F5E9",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: "#2D5A3D", fontSize: 14, fontWeight: "600" }}>
                        {name}
                      </Text>
                      <MaterialIcons name="close" size={16} color="#2D5A3D" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* حقل الإدخال */}
              <View
                style={{
                  backgroundColor: "#F5F5F5",
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: inputText.length > 0 ? "#4CAF50" : "#E0E0E0",
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={handleTextChange}
                  placeholder="اكتبي اسم المكون... (مثلاً: لحم، بصل، طماطة)"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  onSubmitEditing={addCustomIngredient}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    textAlign: "right",
                    writingDirection: "rtl",
                    paddingVertical: 12,
                    color: "#333",
                  }}
                />
                {inputText.length > 0 && (
                  <TouchableOpacity
                    onPress={addCustomIngredient}
                    style={{
                      backgroundColor: "#4CAF50",
                      borderRadius: 12,
                      padding: 8,
                      marginLeft: 8,
                    }}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {/* اقتراحات الإكمال التلقائي */}
              {suggestions.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E0E0E0",
                    overflow: "hidden",
                  }}
                >
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => addIngredient(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                        borderBottomColor: "#F0F0F0",
                      }}
                    >
                      <MaterialIcons name="add-circle-outline" size={20} color="#4CAF50" />
                      <View style={{ flex: 1, alignItems: "flex-end", marginRight: 8 }}>
                        <Text style={{ fontSize: 15, color: "#333", fontWeight: "500" }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                          {item.category === "meat"
                            ? "لحوم"
                            : item.category === "vegetables"
                              ? "خضروات"
                              : item.category === "spices"
                                ? "بهارات"
                                : item.category === "dairy"
                                  ? "ألبان"
                                  : item.category === "grains"
                                    ? "حبوب"
                                    : item.category === "fruits"
                                      ? "فواكه"
                                      : item.category === "legumes"
                                        ? "بقوليات"
                                        : item.category === "oils"
                                          ? "زيوت"
                                          : item.category === "fish"
                                            ? "أسماك"
                                            : item.category === "poultry"
                                              ? "دواجن"
                                              : "أخرى"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* مكونات شائعة للاختيار السريع */}
              {selectedIngredients.length === 0 && suggestions.length === 0 && (
                <View className="mt-6">
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#999",
                      textAlign: "center",
                      marginBottom: 12,
                    }}
                  >
                    أو اختاري من المكونات الشائعة:
                  </Text>
                  <View className="flex-row flex-wrap justify-center gap-2">
                    {[
                      "دجاج",
                      "لحم غنم",
                      "رز",
                      "طماطة",
                      "بصل",
                      "بطاطا",
                      "باذنجان",
                      "بامية",
                      "عدس",
                      "بيض",
                      "خبز",
                      "حليب",
                    ].map((name) => (
                      <TouchableOpacity
                        key={name}
                        onPress={() => {
                          if (!selectedIngredients.includes(name)) {
                            setSelectedIngredients((prev) => [...prev, name]);
                          }
                        }}
                        style={{
                          backgroundColor: "#FFF3E0",
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: "#FFE0B2",
                        }}
                      >
                        <Text style={{ color: "#E65100", fontSize: 13, fontWeight: "500" }}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* زر اقتراح الأكلة - يظهر دائماً */}
              <TouchableOpacity
                onPress={handleSuggestPress}
                disabled={selectedIngredients.length === 0}
                style={{
                  backgroundColor: selectedIngredients.length > 0 ? "#2D5A3D" : "#B0BEC5",
                  borderRadius: 16,
                  paddingVertical: 16,
                  marginTop: 24,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedIngredients.length > 0 ? 0.15 : 0,
                  shadowRadius: 4,
                  elevation: selectedIngredients.length > 0 ? 3 : 0,
                  opacity: selectedIngredients.length > 0 ? 1 : 0.6,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                  اقترح عليّ وصفة 🍽️
                </Text>
              </TouchableOpacity>

              {/* عدد المكونات */}
              {selectedIngredients.length > 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    color: "#999",
                    fontSize: 13,
                    marginTop: 12,
                  }}
                >
                  عندج {selectedIngredients.length} مكون
                  {selectedIngredients.length > 2 ? "ات" : selectedIngredients.length === 2 ? "ين" : ""}
                </Text>
              )}
            </>
          ) : (
            <>
              {/* نتيجة الذكاء الاصطناعي */}
              <View className="mt-4">
                {isLoading ? (
                  <View className="items-center justify-center py-16">
                    <ActivityIndicator size="large" color="#2D5A3D" />
                    <Text
                      style={{
                        color: "#2D5A3D",
                        fontSize: 16,
                        marginTop: 16,
                        textAlign: "center",
                      }}
                    >
                      جاري التفكير بأكلة حلوة...
                    </Text>
                    <Text
                      style={{
                        color: "#999",
                        fontSize: 13,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      يرجى الانتظار قليلاً
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* المكونات المستخدمة */}
                    <View
                      style={{
                        backgroundColor: "#E8F5E9",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#2D5A3D",
                          textAlign: "right",
                          fontWeight: "600",
                        }}
                      >
                        المكونات المتوفرة: {selectedIngredients.join("، ")}
                      </Text>
                    </View>

                    {/* الوصفة */}
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 16,
                        padding: 20,
                        borderWidth: 1,
                        borderColor: "#E0E0E0",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: "#333",
                          textAlign: "right",
                          writingDirection: "rtl",
                          lineHeight: 28,
                        }}
                      >
                        {aiResponse}
                      </Text>
                    </View>

                    {/* أزرار الإجراءات */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                      <TouchableOpacity
                        onPress={handleSuggestPress}
                        style={{
                          flex: 1,
                          backgroundColor: "#FFF3E0",
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#FFE0B2",
                        }}
                      >
                        <Text style={{ color: "#E65100", fontSize: 15, fontWeight: "600" }}>
                          اقتراح آخر 🔄
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={resetAll}
                        style={{
                          flex: 1,
                          backgroundColor: "#E8F5E9",
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#C8E6C9",
                        }}
                      >
                        <Text style={{ color: "#2D5A3D", fontSize: 15, fontWeight: "600" }}>
                          مكونات جديدة ✨
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          {/* مسافة سفلية */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* نافذة الإعلان الأنيقة */}
      <AdLockModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
        variant="fridge"
        onAdWatched={() => {
          doAskAI();
        }}
      />
    </ScreenContainer>
  );
}

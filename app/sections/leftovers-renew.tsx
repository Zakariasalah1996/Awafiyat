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
import { trpc } from "@/lib/trpc";
import { useUser } from "@/lib/user-context";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

I18nManager.forceRTL(true);

const LEFTOVERS_USAGE_KEY = "@awafiyat_leftovers_usage";
const DAILY_LIMIT = 5;

type StorageLocation = "fridge" | "freezer" | "outside";
type TimeSince = "today" | "yesterday" | "two_plus";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function LeftoversRenewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();
  const isSubscribed = profile.isSubscribed;

  const [inputText, setInputText] = useState("");
  const [storageLocation, setStorageLocation] = useState<StorageLocation | null>(null);
  const [timeSince, setTimeSince] = useState<TimeSince | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [unsafeWarning, setUnsafeWarning] = useState("");
  const inputRef = useRef<TextInput>(null);

  const suggestMutation = trpc.leftovers.suggest.useMutation();

  // تحميل عداد الاستخدام اليومي
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LEFTOVERS_USAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          const today = getTodayKey();
          if (data.date === today) {
            setUsageCount(data.count);
            if (data.count >= DAILY_LIMIT) {
              setLimitReached(true);
            }
          } else {
            // يوم جديد - إعادة تعيين
            await AsyncStorage.setItem(LEFTOVERS_USAGE_KEY, JSON.stringify({ date: today, count: 0 }));
          }
        }
      } catch (e) {
        console.error("Failed to load leftovers usage:", e);
      } finally {
        setLoadingUsage(false);
      }
    };
    loadUsage();
  }, []);

  // التحقق من أمان الطعام
  const checkFoodSafety = useCallback((): boolean => {
    setUnsafeWarning("");
    if (!storageLocation || !timeSince) return true;

    // خارج الثلاجة + أمس أو أكثر = غير آمن
    if (storageLocation === "outside" && (timeSince === "yesterday" || timeSince === "two_plus")) {
      setUnsafeWarning(
        "⚠️ للأسف، الأكل الذي بقي خارج الثلاجة لأكثر من 4 ساعات غير آمن للاستخدام. الأفضل التخلص منه حفاظاً على صحتك."
      );
      return false;
    }

    // ثلاجة + يومين أو أكثر = تحذير (لكن نسمح)
    if (storageLocation === "fridge" && timeSince === "two_plus") {
      // نسمح لكن AI سينبّه
      return true;
    }

    return true;
  }, [storageLocation, timeSince]);

  // طلب اقتراح من الذكاء الاصطناعي
  const askAI = useCallback(async () => {
    if (inputText.trim().length === 0) return;
    if (!storageLocation || !timeSince) return;

    // فحص الأمان
    if (!checkFoodSafety()) return;

    // التحقق من الحد اليومي
    if (usageCount >= DAILY_LIMIT) {
      setLimitReached(true);
      return;
    }

    setIsLoading(true);
    setShowResult(true);
    setAiResponse("");
    setUnsafeWarning("");

    try {
      const result = await suggestMutation.mutateAsync({
        leftovers: inputText.trim(),
        storageLocation,
        timeSince,
        healthCondition: profile?.healthCondition || "none",
      });
      const text = result.suggestion;
      setAiResponse(typeof text === "string" ? text : "");

      // زيادة العداد
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      await AsyncStorage.setItem(
        LEFTOVERS_USAGE_KEY,
        JSON.stringify({ date: getTodayKey(), count: newCount })
      );
      if (newCount >= DAILY_LIMIT) {
        // لا نعرض القفل فوراً - ندع المستخدم يرى النتيجة
      }
    } catch (error) {
      setAiResponse("عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى بعد قليل!");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, storageLocation, timeSince, profile?.healthCondition, suggestMutation, usageCount, checkFoodSafety]);

  // إعادة تعيين
  const resetAll = useCallback(() => {
    setInputText("");
    setStorageLocation(null);
    setTimeSince(null);
    setAiResponse("");
    setShowResult(false);
    setUnsafeWarning("");
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

  // شاشة غير المشترك
  if (!isSubscribed) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🍲</Text>
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 24, textAlign: "center", marginBottom: 12 }}
          >
            تجديد النعمة
          </Text>
          <Text
            className="text-muted"
            style={{ fontSize: 16, textAlign: "center", lineHeight: 28, marginBottom: 8 }}
          >
            حوّل بقايا أكلك لوصفات جديدة ولذيذة{"\n"}
            بدلاً من رميها!
          </Text>
          <Text
            className="text-muted"
            style={{ fontSize: 14, textAlign: "center", lineHeight: 24, marginBottom: 24 }}
          >
            هذه الميزة متاحة للمشتركين فقط.{"\n"}
            وفّر أكلك وفلوسك مع الذكاء الاصطناعي!
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push("/(tabs)/subscription" as any);
            }}
            className="rounded-2xl px-8 py-4"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              اشترك الآن
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 py-2"
            activeOpacity={0.6}
          >
            <Text className="text-muted" style={{ fontSize: 14 }}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // شاشة انتهاء الحد اليومي
  if (limitReached) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ fontSize: 64, marginBottom: 16 }}>⏰</Text>
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "center", marginBottom: 12 }}
          >
            انتهت محاولاتك اليوم
          </Text>
          <Text
            className="text-muted"
            style={{ fontSize: 16, textAlign: "center", lineHeight: 26, marginBottom: 24 }}
          >
            لقد استخدمت {DAILY_LIMIT} محاولات اليوم.{"\n"}
            عد غداً لتجديد المحاولات!
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-2xl px-8 py-4"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              حسناً، رجوع
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const remainingUses = DAILY_LIMIT - usageCount;
  const canSubmit = inputText.trim().length > 0 && storageLocation !== null && timeSince !== null;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-forward" size={24} color="#2D5A3D" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">
            تجديد النعمة 🍲
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* عداد المرات المتبقية */}
        <View
          style={{
            backgroundColor: remainingUses <= 1 ? "#FFF3E0" : "#E8F5E9",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginHorizontal: 20,
            marginBottom: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: remainingUses <= 1 ? "#FFE0B2" : "#C8E6C9",
          }}
        >
          <MaterialIcons
            name={remainingUses <= 1 ? "warning" : "info-outline"}
            size={18}
            color={remainingUses <= 1 ? "#E65100" : "#2D5A3D"}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: remainingUses <= 1 ? "#E65100" : "#2D5A3D",
              textAlign: "center",
            }}
          >
            متبقي {remainingUses} {remainingUses === 1 ? "محاولة" : remainingUses === 2 ? "محاولتان" : "محاولات"} اليوم
          </Text>
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
                <Text
                  className="text-lg text-center text-muted leading-8"
                  style={{ writingDirection: "rtl" }}
                >
                  ماهي بقايا الأكلات عندك؟{"\n"}
                  لا ترميها! خلّنا نحوّلها لأكلة جديدة
                </Text>
              </View>

              {/* حقل إدخال البقايا */}
              <View
                style={{
                  backgroundColor: "#F5F5F5",
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: inputText.length > 0 ? "#4CAF50" : "#E0E0E0",
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="مثال: رز بهاري، دجاج مشوي، خبز..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  style={{
                    fontSize: 16,
                    textAlign: "right",
                    writingDirection: "rtl",
                    paddingVertical: 12,
                    color: "#333",
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              {/* سؤال: أين محفوظ؟ */}
              <View className="mt-6">
                <Text
                  className="text-base font-bold text-foreground mb-3"
                  style={{ textAlign: "right", writingDirection: "rtl" }}
                >
                  أين محفوظ هذا الأكل؟
                </Text>
                <View className="flex-row justify-center gap-3" style={{ flexDirection: "row-reverse" }}>
                  {([
                    { key: "fridge" as StorageLocation, label: "🧊 ثلاجة", color: "#E3F2FD", borderColor: "#90CAF9", activeColor: "#2196F3" },
                    { key: "freezer" as StorageLocation, label: "❄️ فريزر", color: "#E8EAF6", borderColor: "#9FA8DA", activeColor: "#3F51B5" },
                    { key: "outside" as StorageLocation, label: "🍽️ خارجهما", color: "#FFF3E0", borderColor: "#FFE0B2", activeColor: "#E65100" },
                  ]).map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        setStorageLocation(item.key);
                        setUnsafeWarning("");
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: storageLocation === item.key ? item.activeColor : item.color,
                        borderRadius: 14,
                        paddingVertical: 14,
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: storageLocation === item.key ? item.activeColor : item.borderColor,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: storageLocation === item.key ? "#fff" : "#333",
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* سؤال: من متى؟ */}
              <View className="mt-5">
                <Text
                  className="text-base font-bold text-foreground mb-3"
                  style={{ textAlign: "right", writingDirection: "rtl" }}
                >
                  من متى هذا الأكل؟
                </Text>
                <View className="flex-row justify-center gap-3" style={{ flexDirection: "row-reverse" }}>
                  {([
                    { key: "today" as TimeSince, label: "اليوم", color: "#E8F5E9", borderColor: "#C8E6C9", activeColor: "#4CAF50" },
                    { key: "yesterday" as TimeSince, label: "أمس", color: "#FFF8E1", borderColor: "#FFF176", activeColor: "#F9A825" },
                    { key: "two_plus" as TimeSince, label: "يومين+", color: "#FFEBEE", borderColor: "#EF9A9A", activeColor: "#E53935" },
                  ]).map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        setTimeSince(item.key);
                        setUnsafeWarning("");
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: timeSince === item.key ? item.activeColor : item.color,
                        borderRadius: 14,
                        paddingVertical: 14,
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: timeSince === item.key ? item.activeColor : item.borderColor,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: timeSince === item.key ? "#fff" : "#333",
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* تحذير عدم الأمان */}
              {unsafeWarning.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#FFEBEE",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: "#EF9A9A",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#C62828",
                      textAlign: "right",
                      writingDirection: "rtl",
                      lineHeight: 24,
                      fontWeight: "600",
                    }}
                  >
                    {unsafeWarning}
                  </Text>
                </View>
              )}

              {/* زر اقتراح الوصفة */}
              {canSubmit && unsafeWarning.length === 0 && (
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    askAI();
                  }}
                  style={{
                    backgroundColor: "#2D5A3D",
                    borderRadius: 16,
                    paddingVertical: 16,
                    marginTop: 24,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                    اقترح لي وصفة! 🪄
                  </Text>
                </TouchableOpacity>
              )}

              {/* ملاحظة تحفيزية */}
              <View className="mt-6 items-center">
                <Text
                  style={{
                    fontSize: 13,
                    color: "#999",
                    textAlign: "center",
                    lineHeight: 22,
                    writingDirection: "rtl",
                  }}
                >
                  💡 كل وجبة تنقذها من الرمي = نعمة تُجدّد
                </Text>
              </View>
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
                      جاري التفكير بوصفة تجدّد نعمتك...
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
                    {/* البقايا المدخلة */}
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
                          writingDirection: "rtl",
                          fontWeight: "600",
                        }}
                      >
                        البقايا: {inputText}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#666",
                          textAlign: "right",
                          writingDirection: "rtl",
                          marginTop: 4,
                        }}
                      >
                        {storageLocation === "fridge" ? "🧊 في الثلاجة" : storageLocation === "freezer" ? "❄️ في الفريزر" : "🍽️ خارجهما"}
                        {" • "}
                        {timeSince === "today" ? "من اليوم" : timeSince === "yesterday" ? "من أمس" : "يومين أو أكثر"}
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
                        onPress={() => {
                          if (usageCount >= DAILY_LIMIT) {
                            setLimitReached(true);
                            return;
                          }
                          if (Platform.OS !== "web") {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          askAI();
                        }}
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
                          اقترح غيرها 🔄
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
                          بقايا جديدة ✨
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
    </ScreenContainer>
  );
}

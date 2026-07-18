import { useState, useCallback, useRef } from "react";
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
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/lib/user-context";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { showRewardedAd } from "@/lib/admob";
import { formatRewardedAdErrorForUser } from "@/lib/admob-result";

I18nManager.forceRTL(true);

type StorageLocation = "fridge" | "freezer" | "outside";
type TimeSince = "today" | "yesterday" | "two_plus";

export default function LeftoversRenewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();
  const { isPremium: isSubscribed } = useSubscriptionContext();

  const [inputText, setInputText] = useState("");
  const [storageLocation, setStorageLocation] = useState<StorageLocation | null>(null);
  const [timeSince, setTimeSince] = useState<TimeSince | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [unsafeWarning, setUnsafeWarning] = useState("");
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const suggestMutation = trpc.leftovers.suggest.useMutation();

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

    return true;
  }, [storageLocation, timeSince]);

  // طلب اقتراح من الذكاء الاصطناعي (بعد مشاهدة الإعلان أو للمشترك)
  const performAIRequest = useCallback(async () => {
    if (inputText.trim().length === 0) return;
    if (!storageLocation || !timeSince) return;

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
    } catch (error) {
      setAiResponse("عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى بعد قليل!");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, storageLocation, timeSince, profile?.healthCondition, suggestMutation]);

  // طلب اقتراح - المشترك مباشرة، غير المشترك يشاهد إعلان
  const askAI = useCallback(async () => {
    if (inputText.trim().length === 0) return;
    if (!storageLocation || !timeSince) return;

    // فحص الأمان
    if (!checkFoodSafety()) return;

    if (isSubscribed) {
      // المشترك يستخدم مباشرة بلا حدود
      await performAIRequest();
    } else {
      // غير المشترك يظهر له نافذة الإعلان
      setAdError(null);
      setShowAdModal(true);
    }
  }, [inputText, storageLocation, timeSince, isSubscribed, performAIRequest, checkFoodSafety]);

  // مشاهدة الإعلان ثم تنفيذ الطلب
  const handleWatchAd = useCallback(async () => {
    setAdLoading(true);
    setAdError(null);
    try {
      const result = await showRewardedAd();
      if (result.status === "rewarded") {
        setShowAdModal(false);
        await performAIRequest();
        return;
      }

      if (result.status === "dismissed") {
        setAdError("أُغلق الإعلان قبل اكتماله. شاهد الإعلان حتى النهاية للحصول على الاقتراح.");
        return;
      }

      setAdError(formatRewardedAdErrorForUser(result.error, result.sdkHealthy));
    } catch {
      setAdError("تعذر تحميل الإعلان الآن. حاول مرة أخرى بعد قليل.\nرمز التشخيص: admob/unexpected");
    } finally {
      setAdLoading(false);
    }
  }, [performAIRequest]);

  // إعادة تعيين
  const resetAll = useCallback(() => {
    setInputText("");
    setStorageLocation(null);
    setTimeSince(null);
    setAiResponse("");
    setShowResult(false);
    setUnsafeWarning("");
  }, []);

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
                <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                  {([
                    { key: "fridge" as StorageLocation, emoji: "🧲", label: "ثلاجة", color: "#E3F2FD", borderColor: "#90CAF9", activeColor: "#2196F3" },
                    { key: "freezer" as StorageLocation, emoji: "❄️", label: "فريزر", color: "#E8EAF6", borderColor: "#9FA8DA", activeColor: "#3F51B5" },
                    { key: "outside" as StorageLocation, emoji: "🍽️", label: "خارجهما", color: "#FFF3E0", borderColor: "#FFE0B2", activeColor: "#E65100" },
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
                        minWidth: 100,
                        backgroundColor: storageLocation === item.key ? item.activeColor : item.color,
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: storageLocation === item.key ? item.activeColor : item.borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>{item.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
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
              <View className="mt-6">
                <Text
                  className="text-base font-bold text-foreground mb-3"
                  style={{ textAlign: "right", writingDirection: "rtl" }}
                >
                  من متى موجود؟
                </Text>
                <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                  {([
                    { key: "today" as TimeSince, emoji: "☀️", label: "اليوم", color: "#E8F5E9", borderColor: "#C8E6C9", activeColor: "#4CAF50" },
                    { key: "yesterday" as TimeSince, emoji: "🌙", label: "أمس", color: "#FFF8E1", borderColor: "#FFE082", activeColor: "#FFA000" },
                    { key: "two_plus" as TimeSince, emoji: "📅", label: "يومين+", color: "#FFEBEE", borderColor: "#FFCDD2", activeColor: "#E53935" },
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
                        minWidth: 100,
                        backgroundColor: timeSince === item.key ? item.activeColor : item.color,
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: timeSince === item.key ? item.activeColor : item.borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>{item.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: timeSince === item.key ? "#fff" : "#333",
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* تحذير أمان الطعام */}
              {unsafeWarning.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#FFEBEE",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: "#FFCDD2",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#C62828", textAlign: "right", writingDirection: "rtl", lineHeight: 22 }}>
                    {unsafeWarning}
                  </Text>
                </View>
              )}

              {/* زر اقتراح */}
              <TouchableOpacity
                onPress={askAI}
                disabled={!canSubmit}
                style={{
                  backgroundColor: canSubmit ? "#E65100" : "#ccc",
                  borderRadius: 16,
                  paddingVertical: 16,
                  marginTop: 24,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: canSubmit ? 0.15 : 0,
                  shadowRadius: 4,
                  elevation: canSubmit ? 3 : 0,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                  جدّد النعمة! 🍲
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* نتيجة الذكاء الاصطناعي */}
              <View className="mt-4">
                {isLoading ? (
                  <View className="items-center justify-center py-16">
                    <ActivityIndicator size="large" color="#E65100" />
                    <Text
                      style={{
                        color: "#E65100",
                        fontSize: 16,
                        marginTop: 16,
                        textAlign: "center",
                      }}
                    >
                      جاري التفكير بأكلة جديدة...
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
                    {/* البقايا المستخدمة */}
                    <View
                      style={{
                        backgroundColor: "#FFF3E0",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#E65100",
                          textAlign: "right",
                          fontWeight: "600",
                        }}
                      >
                        البقايا: {inputText}
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
                        onPress={askAI}
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

      {/* نافذة مشاهدة الإعلان */}
      <Modal
        visible={showAdModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAdError(null);
          setShowAdModal(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, alignItems: "center" }}>
            {/* أيقونة */}
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 36 }}>🍲</Text>
            </View>

            {/* العنوان */}
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#E65100", textAlign: "center", marginBottom: 8 }}>
              تجديد النعمة
            </Text>

            {/* الوصف */}
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20 }}>
              شاهد إعلاناً قصيراً لتحويل بقايا أكلك إلى وصفة جديدة ولذيذة
            </Text>

            {adError ? (
              <View
                style={{
                  backgroundColor: "#FFF3F2",
                  borderColor: "#F5B7B1",
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  width: "100%",
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: "#9B2C2C", fontSize: 13, lineHeight: 20, textAlign: "right" }}>
                  {adError}
                </Text>
              </View>
            ) : null}

            {/* زر الاشتراك */}
            <TouchableOpacity
              onPress={() => {
                setAdError(null);
                setShowAdModal(false);
                router.push("/(tabs)/subscription" as any);
              }}
              style={{
                backgroundColor: "#E65100",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 24,
                width: "100%",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                اشترك للاستخدام بلا حدود
              </Text>
            </TouchableOpacity>

            {/* فاصل "أو" */}
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E0E0E0" }} />
              <Text style={{ marginHorizontal: 12, color: "#999", fontSize: 13 }}>أو</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E0E0E0" }} />
            </View>

            {/* زر مشاهدة الإعلان */}
            <TouchableOpacity
              onPress={handleWatchAd}
              disabled={adLoading}
              style={{
                backgroundColor: "#FFF3E0",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 24,
                width: "100%",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#FFE0B2",
                opacity: adLoading ? 0.7 : 1,
              }}
            >
              {adLoading ? (
                <ActivityIndicator color="#E65100" size="small" />
              ) : (
                <Text style={{ color: "#E65100", fontSize: 15, fontWeight: "600" }}>
                  {adError ? "إعادة محاولة عرض الإعلان" : "▶️ شاهد إعلاناً قصيراً"}
                </Text>
              )}
            </TouchableOpacity>

            {/* زر إغلاق */}
            <TouchableOpacity
              onPress={() => {
                setAdError(null);
                setShowAdModal(false);
              }}
              style={{ marginTop: 16, padding: 8 }}
            >
              <Text style={{ color: "#999", fontSize: 13 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { showRewardedAd } from "@/lib/admob";
import * as Haptics from "expo-haptics";

interface AdLockModalProps {
  visible: boolean;
  /** نوع المحتوى المقفل */
  contentType: "recipe" | "warning";
  /** اسم المحتوى لعرضه للمستخدم */
  contentName?: string;
  /** دالة تُستدعى بعد مشاهدة الإعلان بنجاح */
  onUnlocked: () => void;
  /** دالة إغلاق النافذة */
  onClose: () => void;
  /** دالة الاشتراك */
  onSubscribe?: () => void;
}

/**
 * نافذة قفل المحتوى - تصميم أنيق ومرتب
 * تظهر كـ Modal شفاف مع بطاقة مركزية
 */
export function AdLockModal({
  visible,
  contentType,
  contentName,
  onUnlocked,
  onClose,
  onSubscribe,
}: AdLockModalProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecipe = contentType === "recipe";
  const title = isRecipe ? "وصفة مقفلة" : "تحذير صحي مقفل";
  const icon = isRecipe ? "🍽️" : "🛡️";
  const description = contentName
    ? `شاهد إعلاناً قصيراً لفتح "${contentName}"`
    : isRecipe
    ? "شاهد إعلاناً قصيراً لفتح هذه الوصفة"
    : "شاهد إعلاناً قصيراً لفتح التحذير الصحي";

  async function handleWatchAd() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoading(true);
    setError(null);
    try {
      const rewarded = await showRewardedAd();
      if (rewarded) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onUnlocked();
      } else {
        setError("يجب مشاهدة الإعلان كاملاً");
      }
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/* أيقونة */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isRecipe ? "#FFF3E0" : "#FFF8E1",
              },
            ]}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          {/* العنوان */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>

          {/* الوصف */}
          <Text style={[styles.description, { color: colors.muted }]}>
            {description}
          </Text>

          {/* رسالة الخطأ */}
          {error && (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )}

          {/* الأزرار */}
          <View style={styles.buttonsContainer}>
            {/* زر مشاهدة الإعلان - الرئيسي */}
            <Pressable
              onPress={handleWatchAd}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: "#2E7D32",
                  opacity: pressed || loading ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  ▶️ شاهد إعلاناً وافتح مجاناً
                </Text>
              )}
            </Pressable>

            {/* زر الاشتراك - ثانوي */}
            {onSubscribe && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  onClose();
                  onSubscribe();
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  اشترك للوصول الكامل
                </Text>
              </Pressable>
            )}

            {/* زر الإلغاء */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.muted }]}>
                ليس الآن
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 6,
  },
  error: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  buttonsContainer: {
    width: "100%",
    marginTop: 16,
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

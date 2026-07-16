import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { showRewardedAd } from "@/lib/admob";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");

export type AdLockModalVariant = "recipe" | "warning" | "fridge" | "leftovers";

interface AdLockModalProps {
  visible: boolean;
  onClose: () => void;
  /** نوع المحتوى المقفل */
  variant: AdLockModalVariant;
  /** اسم المحتوى (اسم الوصفة مثلاً) */
  contentName?: string;
  /** دالة تُستدعى بعد مشاهدة الإعلان بنجاح */
  onAdWatched: () => void;
}

const VARIANT_CONFIG: Record<
  AdLockModalVariant,
  {
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    adButtonText: string;
  }
> = {
  recipe: {
    icon: "🍽️",
    iconBg: "#FFF3E0",
    title: "وصفة حصرية",
    description: "للاستمتاع بهذه الوصفة اللذيذة، اشترك أو شاهد إعلاناً قصيراً",
    adButtonText: "شاهد إعلاناً لفتح الوصفة",
  },
  warning: {
    icon: "🛡️",
    iconBg: "#E3F2FD",
    title: "تحذير صحي مهم",
    description: "لمعرفة التحذيرات الصحية المخصصة لحالتك، اشترك أو شاهد إعلاناً",
    adButtonText: "شاهد إعلاناً لفتح التحذير",
  },
  fridge: {
    icon: "🥬",
    iconBg: "#E8F5E9",
    title: "اقتراح وصفة ذكية",
    description: "للحصول على اقتراحات وصفات من مكوناتك، اشترك أو شاهد إعلاناً",
    adButtonText: "شاهد إعلاناً للاقتراح",
  },
  leftovers: {
    icon: "🍲",
    iconBg: "#FFF3E0",
    title: "تجديد النعمة",
    description: "للحصول على أفكار لتجديد بقايا الطعام، اشترك أو شاهد إعلاناً",
    adButtonText: "شاهد إعلاناً للاقتراح",
  },
};

export function AdLockModal({
  visible,
  onClose,
  variant,
  contentName,
  onAdWatched,
}: AdLockModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = VARIANT_CONFIG[variant];

  const handleSubscribe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onClose();
    router.push("/(tabs)/subscription" as any);
  };

  const handleWatchAd = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoading(true);
    setError(null);
    try {
      const rewarded = await showRewardedAd();
      if (rewarded) {
        onClose();
        onAdWatched();
      } else {
        setError("يجب مشاهدة الإعلان كاملاً");
      }
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* زر الإغلاق */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={22} color="#999" />
          </TouchableOpacity>

          {/* الأيقونة */}
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <Text style={styles.iconText}>{config.icon}</Text>
          </View>

          {/* العنوان */}
          <Text style={styles.title}>
            {contentName
              ? variant === "recipe"
                ? `"${contentName}"`
                : config.title
              : config.title}
          </Text>

          {/* الوصف */}
          <Text style={styles.description}>{config.description}</Text>

          {/* زر الاشتراك */}
          <TouchableOpacity
            onPress={handleSubscribe}
            style={styles.subscribeButton}
            activeOpacity={0.8}
          >
            <View style={styles.subscribeContent}>
              <MaterialIcons name="star" size={20} color="#fff" />
              <Text style={styles.subscribeText}>اشترك الآن</Text>
            </View>
            <Text style={styles.subscribeSubtext}>
              جميع الميزات بلا حدود • بدون إعلانات
            </Text>
          </TouchableOpacity>

          {/* فاصل "أو" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* زر مشاهدة إعلان */}
          <TouchableOpacity
            onPress={handleWatchAd}
            disabled={loading}
            style={[styles.adButton, loading && { opacity: 0.7 }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#2D5A3D" size="small" />
            ) : (
              <View style={styles.adButtonContent}>
                <MaterialIcons name="play-circle-filled" size={20} color="#2D5A3D" />
                <Text style={styles.adButtonText}>{config.adButtonText}</Text>
              </View>
            )}
            {!loading && (
              <Text style={styles.adButtonSubtext}>مجاناً • إعلان قصير</Text>
            )}
          </TouchableOpacity>

          {/* رسالة الخطأ */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={16} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: width - 40,
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 16,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
    writingDirection: "rtl",
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    writingDirection: "rtl",
    paddingHorizontal: 8,
  },
  subscribeButton: {
    width: "100%",
    backgroundColor: "#2D5A3D",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#2D5A3D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subscribeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subscribeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  subscribeSubtext: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E8E8",
  },
  dividerText: {
    color: "#999",
    fontSize: 13,
    marginHorizontal: 12,
    fontWeight: "500",
  },
  adButton: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#2D5A3D",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  adButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adButtonText: {
    color: "#2D5A3D",
    fontSize: 15,
    fontWeight: "700",
  },
  adButtonSubtext: {
    color: "#888",
    fontSize: 12,
    marginTop: 3,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "500",
  },
});

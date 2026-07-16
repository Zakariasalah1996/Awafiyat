import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface PromoRemoveAdsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PromoRemoveAdsModal({ visible, onClose }: PromoRemoveAdsModalProps) {
  const router = useRouter();

  const handleSubscribe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onClose();
    router.push("/(tabs)/subscription");
  };

  const handleDismiss = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* أيقونة */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚫</Text>
            <Text style={styles.adIcon}>📺</Text>
          </View>

          {/* العنوان */}
          <Text style={styles.title}>تخلّص من الإعلانات!</Text>

          {/* الوصف */}
          <Text style={styles.description}>
            اشترك الآن واستمتع بجميع الميزات بدون إعلانات مزعجة
          </Text>

          {/* المميزات */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>بدون إعلانات نهائياً</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>جميع الوصفات مفتوحة</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>جدولة الطبخ + تذكير الدواء</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>ذكاء الثلاجة بلا حدود</Text>
            </View>
          </View>

          {/* زر الاشتراك */}
          <TouchableOpacity
            onPress={handleSubscribe}
            style={styles.subscribeButton}
            activeOpacity={0.8}
          >
            <Text style={styles.subscribeText}>🌟 اشترك الآن</Text>
          </TouchableOpacity>

          {/* زر لاحقاً */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>لاحقاً</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: width - 48,
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  adIcon: {
    fontSize: 32,
    marginLeft: -8,
    opacity: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  features: {
    width: "100%",
    marginBottom: 24,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  subscribeButton: {
    width: "100%",
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  subscribeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
});

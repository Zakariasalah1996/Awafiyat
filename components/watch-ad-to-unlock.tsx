import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { showRewardedAd } from "@/lib/admob";

interface WatchAdToUnlockProps {
  /** نوع المحتوى المقفل */
  contentType: "recipe" | "warning";
  /** اسم المحتوى لعرضه للمستخدم */
  contentName?: string;
  /** دالة تُستدعى بعد مشاهدة الإعلان بنجاح */
  onUnlocked: () => void;
}

/**
 * مكوّن يعرض قفلاً مع زر "شاهد إعلاناً" لفتح المحتوى
 */
export function WatchAdToUnlock({ contentType, contentName, onUnlocked }: WatchAdToUnlockProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = contentType === "recipe" ? "الوصفة" : "التحذير الصحي";
  const icon = contentType === "recipe" ? "🔒" : "⚠️";

  async function handleWatchAd() {
    setLoading(true);
    setError(null);
    try {
      const rewarded = await showRewardedAd();
      if (rewarded) {
        onUnlocked();
      } else {
        setError("يجب مشاهدة الإعلان كاملاً لفتح المحتوى");
      }
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* أيقونة القفل */}
      <Text style={styles.lockIcon}>{icon}</Text>

      {/* العنوان */}
      <Text style={[styles.title, { color: colors.foreground }]}>
        {contentName ? `"${contentName}" مقفلة` : `${label} مقفلة`}
      </Text>

      {/* الوصف */}
      <Text style={[styles.description, { color: colors.muted }]}>
        شاهد إعلاناً قصيراً لفتح {label} مجاناً
      </Text>

      {/* زر المشاهدة */}
      <Pressable
        onPress={handleWatchAd}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.buttonIcon}>▶️</Text>
            <Text style={styles.buttonText}>شاهد إعلاناً لفتح {label}</Text>
          </>
        )}
      </Pressable>

      {/* رسالة الخطأ */}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {/* ملاحظة صغيرة */}
      <Text style={[styles.note, { color: colors.muted }]}>
        الإعلان يدعم تطوير التطبيق المجاني
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
    minWidth: 220,
    justifyContent: "center",
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    fontSize: 13,
    textAlign: "center",
  },
  note: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});

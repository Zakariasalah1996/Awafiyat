import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { showRewardedAd } from "@/lib/admob";
import { formatRewardedAdErrorForUser } from "@/lib/admob-result";

interface WatchAdToUnlockProps {
  /** نوع المحتوى المقفل */
  contentType: "recipe" | "warning";
  /** اسم المحتوى لعرضه للمستخدم */
  contentName?: string;
  /** دالة تُستدعى بعد مشاهدة الإعلان بنجاح */
  onUnlocked: () => void;
}

/**
 * مكوّن يعرض قفلاً مع زر "شاهد إعلاناً" لفتح المحتوى.
 * لا يستدعي onUnlocked إلا بعد وصول حدث EARNED_REWARD من AdMob.
 */
export function WatchAdToUnlock({ contentType, contentName, onUnlocked }: WatchAdToUnlockProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = contentType === "recipe" ? "الوصفة" : "التحذير الصحي";
  const icon = contentType === "recipe" ? "🔒" : "⚠️";

  async function handleWatchAd() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await showRewardedAd();

      if (result.status === "rewarded") {
        onUnlocked();
        return;
      }

      if (result.status === "dismissed") {
        setError("أُغلق الإعلان قبل اكتماله. شاهد الإعلان حتى النهاية لفتح المحتوى.");
        return;
      }

      setError(formatRewardedAdErrorForUser(result.error, result.sdkHealthy));
    } catch {
      setError("تعذر تحميل الإعلان الآن. حاول مرة أخرى بعد قليل.\nرمز التشخيص: admob/unexpected");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.lockIcon} accessibilityElementsHidden>
        {icon}
      </Text>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {contentName ? `«${contentName}» مقفلة` : `${label} مقفلة`}
      </Text>

      <Text style={[styles.description, { color: colors.muted }]}>
        شاهد إعلانًا قصيرًا لفتح {label} مجانًا
      </Text>

      <Pressable
        onPress={handleWatchAd}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={`شاهد إعلانًا لفتح ${label}`}
        accessibilityState={{ disabled: loading, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
        ]}
      >
        {loading ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.buttonText}>جارٍ تجهيز الإعلان…</Text>
          </>
        ) : (
          <>
            <Text style={styles.buttonIcon}>▶</Text>
            <Text style={styles.buttonText}>{error ? "حاول تحميل الإعلان مجددًا" : `شاهد إعلانًا لفتح ${label}`}</Text>
          </>
        )}
      </Pressable>

      {error ? (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}35` },
          ]}
          accessibilityRole="alert"
        >
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.note, { color: colors.muted }]}>الإعلان يدعم استمرار المحتوى المجاني</Text>
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
    lineHeight: 25,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
    minWidth: 240,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonIcon: {
    color: "#fff",
    fontSize: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  errorContainer: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  note: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});

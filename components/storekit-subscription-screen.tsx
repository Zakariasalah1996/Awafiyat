import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { type SubscriptionPackage, useSubscriptions } from "@/hooks/use-subscriptions";
import { useUser } from "@/lib/user-context";

const PRIVACY_URL = "https://www.afiyatltd.co.uk/privacy";
const TERMS_URL = "https://www.afiyatltd.co.uk/terms";
const APPLE_STANDARD_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const IOS_MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const ANDROID_MANAGE_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?package=io.awafiyat.health";

const PREMIUM_FEATURES = [
  { icon: "restaurant", text: "ذكاء الثلاجة غير محدود", color: "#3F7D4E" },
  { icon: "health-and-safety", text: "تنبيهات غذائية وفق تفضيلاتك", color: "#247B7B" },
  { icon: "recycling", text: "تجديد النعمة حتى 5 مرات يومياً", color: "#A55B16" },
  { icon: "medication", text: "رفيق الدواء بصوت مخصص", color: "#7A4A8E" },
  { icon: "water-drop", text: "رفيق الماء مع التذكيرات", color: "#2767A8" },
  { icon: "menu-book", text: "مكتبة الوصفات الكاملة", color: "#795548" },
] as const;

async function openExternalUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error("Unsupported URL");
    await Linking.openURL(url);
  } catch {
    Alert.alert("تعذر فتح الرابط", "يرجى المحاولة مرة أخرى بعد التحقق من اتصالك بالإنترنت.");
  }
}

function sendHaptic(type: "tap" | "success" | "error") {
  if (Platform.OS === "web") return;
  if (type === "tap") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else {
    void Haptics.notificationAsync(
      type === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }
}

export default function StoreKitSubscriptionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useUser();
  const {
    packages,
    isLoading,
    error,
    isPremium,
    purchasePackage,
    restorePurchases,
    reloadPackages,
  } = useSubscriptions();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [purchasePending, setPurchasePending] = useState(false);
  const [restorePending, setRestorePending] = useState(false);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );
  const useColumns = width >= 700;
  const storeName = Platform.OS === "ios" ? "App Store" : Platform.OS === "android" ? "Google Play" : "المتجر";
  const manageSubscriptionsUrl =
    Platform.OS === "ios" ? IOS_MANAGE_SUBSCRIPTIONS_URL : ANDROID_MANAGE_SUBSCRIPTIONS_URL;

  const startPurchase = (pkg: SubscriptionPackage) => {
    sendHaptic("tap");
    setSelectedPackageId(pkg.id);
  };

  const confirmPurchase = async () => {
    if (!selectedPackage || purchasePending) return;

    setPurchasePending(true);
    sendHaptic("tap");
    const purchased = await purchasePackage(selectedPackage);
    setPurchasePending(false);

    if (!purchased) return;

    setSelectedPackageId(null);
    sendHaptic("success");
    Alert.alert("تم تفعيل الاشتراك", "أصبحت مزايا ألف عافيات المميزة متاحة الآن.");
  };

  const handleRestore = async () => {
    if (restorePending) return;
    setRestorePending(true);
    sendHaptic("tap");
    const restored = await restorePurchases();
    setRestorePending(false);

    if (restored) {
      sendHaptic("success");
      Alert.alert("تمت الاستعادة", "عُثر على اشتراك نشط واستُعيدت مزاياه.");
    } else {
      Alert.alert("لم يُعثر على اشتراك", `لا يوجد اشتراك نشط مرتبط بحساب ${storeName} الحالي.`);
    }
  };

  if (isPremium) {
    const expiryDate = profile.subscriptionExpiry
      ? new Date(profile.subscriptionExpiry).toLocaleDateString("ar-IQ")
      : "يُدار من المتجر";

    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[
            styles.memberContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
        >
          <View style={[styles.contentWidth, { maxWidth: 680 }]}>
            <MaterialIcons name="verified" size={72} color={colors.success} />
            <Text style={[styles.memberTitle, { color: colors.foreground }]}>عضوية ألف عافيات المميزة</Text>
            <Text style={[styles.centerText, { color: colors.muted }]}>اشتراكك نشط ومزاياه متاحة على هذا الجهاز.</Text>

            <View style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <InfoRow
                label="نوع الاشتراك"
                value={profile.subscriptionType === "yearly" ? "سنوي" : "شهري"}
                foreground={colors.foreground}
                muted={colors.muted}
              />
              <InfoRow label="تاريخ التجديد" value={expiryDate} foreground={colors.foreground} muted={colors.muted} />
              <InfoRow label="الحالة" value="نشط" foreground={colors.foreground} muted={colors.muted} />
            </View>

            <ActionButton
              label={`إدارة الاشتراك في ${storeName}`}
              onPress={() => void openExternalUrl(manageSubscriptionsUrl)}
              backgroundColor={colors.primary}
              textColor="#FFFFFF"
            />
            <ActionButton
              label={restorePending ? "جاري الاستعادة…" : "استعادة المشتريات"}
              onPress={() => void handleRestore()}
              disabled={restorePending}
              backgroundColor={colors.surface}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <LegalLinks colors={colors} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 18) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWidth}>
          {router.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="العودة"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: colors.surface, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <MaterialIcons name="arrow-forward" size={22} color={colors.foreground} />
            </Pressable>
          ) : null}

          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
              <MaterialIcons name="diamond" size={34} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>ألف عافيات المميزة</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>اختر الخطة التي تناسبك. الأسعار والفترات أدناه مقدمة مباشرة من {storeName}.</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.stateText, { color: colors.muted }]}>جاري تحميل منتجات {storeName}…</Text>
            </View>
          ) : packages.length > 0 ? (
            <View style={[styles.plans, useColumns && styles.plansTablet]}>
              {packages.map((pkg) => (
                <PlanCard
                  key={pkg.id}
                  pkg={pkg}
                  colors={colors}
                  storeName={storeName}
                  onPress={() => startPurchase(pkg)}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="cloud-off" size={30} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>تعذر تحميل خطط المتجر</Text>
              <Text style={[styles.stateText, { color: colors.muted }]}>تحقق من اتصالك ومن حساب المتجر ثم أعد المحاولة.</Text>
              <ActionButton
                label="إعادة المحاولة"
                onPress={() => void reloadPackages()}
                backgroundColor={colors.primary}
                textColor="#FFFFFF"
              />
            </View>
          )}

          <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature.text} style={[styles.featureItem, useColumns && styles.featureItemTablet]}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}18` }]}>
                  <MaterialIcons name={feature.icon as any} size={20} color={feature.color} />
                </View>
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}55` }]}>
              <MaterialIcons name="info-outline" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <ActionButton
            label={restorePending ? "جاري الاستعادة…" : "استعادة المشتريات السابقة"}
            onPress={() => void handleRestore()}
            disabled={restorePending || isLoading}
            backgroundColor={colors.surface}
            textColor={colors.foreground}
            borderColor={colors.border}
          />

          <Text style={[styles.renewalText, { color: colors.muted }]}>يُخصم المبلغ من حساب {storeName} عند تأكيد الشراء. يتجدد الاشتراك تلقائياً ما لم يُلغَ قبل نهاية الفترة الحالية، ويمكن إدارته من إعدادات حساب المتجر.</Text>
          <LegalLinks colors={colors} />
        </View>
      </ScrollView>

      <PurchaseConfirmationSheet
        pkg={selectedPackage}
        storeName={storeName}
        pending={purchasePending}
        colors={colors}
        bottomInset={insets.bottom}
        onClose={() => {
          if (!purchasePending) setSelectedPackageId(null);
        }}
        onConfirm={() => void confirmPurchase()}
      />
    </ScreenContainer>
  );
}

function PlanCard({
  pkg,
  colors,
  storeName,
  onPress,
}: {
  pkg: SubscriptionPackage;
  colors: ReturnType<typeof useColors>;
  storeName: string;
  onPress: () => void;
}) {
  const isYearly = pkg.period === "yearly";
  const trial = pkg.introductoryOffer?.isFree ? pkg.introductoryOffer : null;

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: colors.surface,
          borderColor: isYearly ? colors.primary : colors.border,
        },
      ]}
    >
      {isYearly ? (
        <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.recommendedText}>الأكثر قيمة</Text>
        </View>
      ) : null}
      <Text style={[styles.planName, { color: colors.foreground }]}>{pkg.name || (isYearly ? "الخطة السنوية" : "الخطة الشهرية")}</Text>
      <Text style={[styles.planPrice, { color: colors.primary }]}>{pkg.price}</Text>
      <Text style={[styles.planPeriod, { color: colors.muted }]}>لكل {pkg.periodLabel}</Text>
      {pkg.pricePerMonth && isYearly ? (
        <Text style={[styles.monthlyEquivalent, { color: colors.muted }]}>ما يعادل {pkg.pricePerMonth} شهرياً تقريباً</Text>
      ) : null}
      {trial ? (
        <View style={[styles.trialBadge, { backgroundColor: `${colors.success}18` }]}>
          <Text style={[styles.trialText, { color: colors.success }]}>تجربة مجانية لمدة {trial.duration} للمؤهلين</Text>
        </View>
      ) : null}
      <Text style={[styles.planDescription, { color: colors.muted }]} numberOfLines={3}>{pkg.description}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`اختيار ${pkg.name}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <Text style={styles.primaryButtonText}>{trial ? `متابعة مع تجربة ${trial.duration}` : `الاشتراك عبر ${storeName}`}</Text>
      </Pressable>
      <Text style={[styles.planFinePrint, { color: colors.muted }]}>ثم {pkg.price} لكل {pkg.periodLabel} حتى الإلغاء.</Text>
    </View>
  );
}

function PurchaseConfirmationSheet({
  pkg,
  storeName,
  pending,
  colors,
  bottomInset,
  onClose,
  onConfirm,
}: {
  pkg: SubscriptionPackage | null;
  storeName: string;
  pending: boolean;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!pkg) return null;
  const trial = pkg.introductoryOffer?.isFree ? pkg.introductoryOffer : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityLabel="إغلاق" onPress={onClose} style={StyleSheet.absoluteFill} disabled={pending} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(bottomInset, 20) + 14,
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>تأكيد اختيارك</Text>
          <Text style={[styles.sheetPlan, { color: colors.foreground }]}>{pkg.name}</Text>
          {trial ? (
            <View style={[styles.sheetSummary, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}55` }]}>
              <Text style={[styles.sheetSummaryTitle, { color: colors.success }]}>تجربة مجانية لمدة {trial.duration}</Text>
              <Text style={[styles.sheetSummaryText, { color: colors.foreground }]}>بعدها {pkg.price} لكل {pkg.periodLabel}، ويتجدد الاشتراك تلقائياً حتى الإلغاء.</Text>
            </View>
          ) : (
            <View style={[styles.sheetSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sheetSummaryTitle, { color: colors.primary }]}>{pkg.price} لكل {pkg.periodLabel}</Text>
              <Text style={[styles.sheetSummaryText, { color: colors.foreground }]}>يتجدد الاشتراك تلقائياً حتى الإلغاء.</Text>
            </View>
          )}
          <Text style={[styles.sheetDisclosure, { color: colors.muted }]}>سيعرض {storeName} نافذة التأكيد النهائية. لا يكتمل الشراء إلا بعد موافقتك داخل نافذة المتجر.</Text>
          <LegalLinks colors={colors} compact />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`المتابعة إلى ${storeName}`}
            disabled={pending}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.sheetPrimaryButton,
              {
                backgroundColor: colors.primary,
                opacity: pending ? 0.55 : pressed ? 0.82 : 1,
              },
            ]}
          >
            {pending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>المتابعة إلى {storeName}</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ليس الآن"
            disabled={pending}
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>ليس الآن</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LegalLinks({ colors, compact = false }: { colors: ReturnType<typeof useColors>; compact?: boolean }) {
  return (
    <View style={[styles.legalRow, compact && styles.legalRowCompact]}>
      <Pressable
        accessibilityRole="link"
        onPress={() => void openExternalUrl(PRIVACY_URL)}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
      >
        <Text style={[styles.legalLink, { color: colors.primary }]}>سياسة الخصوصية</Text>
      </Pressable>
      <Text style={[styles.legalSeparator, { color: colors.muted }]}>•</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void openExternalUrl(TERMS_URL)}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
      >
        <Text style={[styles.legalLink, { color: colors.primary }]}>شروط الاستخدام</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <>
          <Text style={[styles.legalSeparator, { color: colors.muted }]}>•</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void openExternalUrl(APPLE_STANDARD_EULA_URL)}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
          >
            <Text style={[styles.legalLink, { color: colors.primary }]}>اتفاقية Apple القياسية</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  backgroundColor,
  textColor,
  borderColor,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor: borderColor ?? backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {disabled ? <ActivityIndicator size="small" color={textColor} /> : <Text style={[styles.actionButtonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
  foreground,
  muted,
}: {
  label: string;
  value: string;
  foreground: string;
  muted: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  contentWidth: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    maxWidth: 590,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  featuresCard: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  featureItem: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  featureItemTablet: {
    width: "48.5%",
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  plans: {
    gap: 12,
    marginBottom: 14,
  },
  plansTablet: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
  },
  planCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
  },
  recommendedBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  recommendedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  planName: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    textAlign: "center",
  },
  planPrice: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  planPeriod: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  monthlyEquivalent: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  trialBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  trialText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  planDescription: {
    minHeight: 42,
    marginTop: 12,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  planFinePrint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 44,
    gap: 12,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 14,
    gap: 9,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  renewalText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 2,
  },
  legalRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
  },
  legalRowCompact: {
    paddingVertical: 8,
  },
  legalLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 12,
  },
  memberContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  memberTitle: {
    marginTop: 14,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  centerText: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  memberCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    lineHeight: 19,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "left",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  sheetPlan: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
  },
  sheetSummary: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  sheetSummaryTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  sheetSummaryText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  sheetDisclosure: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  sheetPrimaryButton: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

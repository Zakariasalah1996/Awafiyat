import { Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { trpc } from "@/lib/trpc";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import * as Haptics from "expo-haptics";
import { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";
import { ScrollView } from "react-native";

// الميزات المدفوعة - مختصرة
const PREMIUM_FEATURES = [
  { icon: "restaurant",            text: "ذكاء الثلاجة غير محدود",           color: "#4CAF50" },
  { icon: "health-and-safety",     text: "تحذيرات صحية مخصصة لك",           color: "#4ECDC4" },
  { icon: "recycling",             text: "تجديد النعمة (5 مرات/يوم)",        color: "#FF9800" },
  { icon: "medication",            text: "رفيق الدواء بصوت مخصص",           color: "#9C27B0" },
  { icon: "water-drop",            text: "رفيق الماء مع تذكيرات",           color: "#2196F3" },
  { icon: "menu-book",             text: "250+ وصفة عراقية وعربية",          color: "#795548" },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const { profile } = useUser();
  const createSubscription = trpc.subscription.create.useMutation();
  const { packages, isLoading, error, isPremium, purchasePackage, restorePurchases } =
    useSubscriptions();

  const handleSubscribe = async (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    try {
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      const success = await purchasePackage(pkg);
      if (success) {
        try {
          await createSubscription.mutateAsync({
            plan: pkg.period,
            userName: profile.name || undefined,
            userPhone: profile.phone || undefined,
          });
        } catch (e) {
          console.warn("[Subscription] Server save failed:", e);
        }
        Haptics.notificationAsync(NotificationFeedbackType.Success);
        Alert.alert("تم الاشتراك بنجاح! 🎉", "ألف عافية عليك، استمتع بجميع الميزات.");
      }
    } catch {
      Haptics.notificationAsync(NotificationFeedbackType.Error);
      Alert.alert("خطأ", "حدث خطأ أثناء الشراء. حاول مرة أخرى.");
    }
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      await restorePurchases();
      Alert.alert("تم", "تم استعادة عملياتك الشرائية");
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء استعادة الشراء");
    }
  };

  // ─── شاشة المشترك ───
  if (isPremium) {
    const expiryDate = profile.subscriptionExpiry
      ? new Date(profile.subscriptionExpiry).toLocaleDateString("ar-IQ")
      : "";
    return (
      <ScreenContainer className="p-5">
        <View className="flex-1 items-center justify-center gap-6">
          <MaterialIcons name="verified" size={80} color={colors.success} />
          <Text className="text-3xl font-bold text-foreground">عضوية ذهبية ✨</Text>
          <Text className="text-muted text-center">شكراً لاشتراكك في ألف عافيات المميزة</Text>
          <View className="w-full bg-surface rounded-2xl p-5 gap-3">
            <InfoRow label="نوع الاشتراك" value={profile.subscriptionType === "monthly" ? "شهري" : "سنوي"} />
            <InfoRow label="تاريخ الانتهاء" value={expiryDate} />
            <InfoRow label="الحالة" value="نشط ✓" />
          </View>
          <TouchableOpacity onPress={handleRestore} className="py-3 px-6 rounded-xl border border-border">
            <Text className="text-muted font-semibold">استعادة عمليات الشراء</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ─── تحميل ───
  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">جاري التحميل...</Text>
      </ScreenContainer>
    );
  }

  // فصل الباقتين
  const monthlyPkg = packages.find((p) => p.period === "monthly");
  const yearlyPkg  = packages.find((p) => p.period === "yearly");

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── الرأس ─── */}
        <Animated.View entering={FadeInDown} className="items-center pt-4 pb-3">
          <Text
            style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, textAlign: "center" }}
          >
            ألف عافيات المميزة 💎
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" }}>
            وصول كامل لجميع الميزات
          </Text>
        </Animated.View>

        {/* ─── الميزات - شبكة 2 عمود ─── */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PREMIUM_FEATURES.map((feature, i) => (
              <View
                key={i}
                style={{
                  width: "47%",
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <MaterialIcons name={feature.icon as any} size={18} color={feature.color} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: colors.foreground,
                    textAlign: "right",
                    writingDirection: "rtl",
                    lineHeight: 16,
                  }}
                  numberOfLines={2}
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ─── خطط الاشتراك جنباً إلى جنب ─── */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}
        >
          {/* شهري */}
          {monthlyPkg && (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1.5,
                borderColor: colors.border,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                شهري
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary }}>
                {monthlyPkg.price}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>{monthlyPkg.pricePerMonth}/شهر</Text>
              <TouchableOpacity
                onPress={() => handleSubscribe(monthlyPkg.id)}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>اشترك الآن</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* سنوي */}
          {yearlyPkg && (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.primary + "12",
                borderRadius: 16,
                padding: 14,
                borderWidth: 2,
                borderColor: colors.primary,
                alignItems: "center",
                gap: 8,
              }}
            >
              {/* شارة التوفير */}
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>توفير 17% ⭐</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                سنوي
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary }}>
                {yearlyPkg.price}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>{yearlyPkg.pricePerMonth}/شهر</Text>
              <TouchableOpacity
                onPress={() => handleSubscribe(yearlyPkg.id)}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>اشترك الآن</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* خطأ */}
        {error && (
          <View
            style={{
              backgroundColor: colors.error + "15",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.error, textAlign: "center", fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* ─── استعادة + ملاحظة ─── */}
        <TouchableOpacity
          onPress={handleRestore}
          style={{
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
            استعادة عمليات الشراء السابقة
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 11,
            color: colors.muted,
            textAlign: "center",
            lineHeight: 17,
          }}
        >
          يتجدد الاشتراك تلقائياً. يمكن الإلغاء من إعدادات Google Play.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: "#888" }}>{label}</Text>
      <Text style={{ fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

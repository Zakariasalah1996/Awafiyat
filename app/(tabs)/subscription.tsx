import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { trpc } from "@/lib/trpc";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import * as Haptics from "expo-haptics";

// التسعير موحد بـ USD لجميع الدول
const PRICING = {
  default: { currency: "$", monthlyLabel: "4", yearlyLabel: "40" },
};

// الميزات المدفوعة الكاملة
const PREMIUM_FEATURES = [
  { icon: "restaurant", text: "ذكاء الثلاجة - اقتراحات وصفات غير محدودة بالذكاء الاصطناعي", color: "#4CAF50" },
  { icon: "recycling", text: "تجديد النعمة - حوّل بقايا أكلك لوصفة جديدة (5 مرات يومياً)", color: "#FF9800" },
  { icon: "medication", text: "رفيق الدواء - تذكيرات ذكية بمواعيد أدويتك بصوت مخصص", color: "#9C27B0" },
  { icon: "water-drop", text: "رفيق الماء - تتبع شرب الماء حسب وزنك مع تذكيرات", color: "#2196F3" },
  { icon: "calendar-month", text: "جدول طبخ أسبوعي تلقائي مع منبه ذكي لكل وجبة", color: "#E91E63" },
  { icon: "shopping-cart", text: "قائمة تسوق ذكية مع تذكيرات ومشاركة عبر واتساب", color: "#00BCD4" },
  { icon: "favorite", text: "حفظ وصفات مفضلة غير محدود + تقييم الوصفات", color: "#E85D5D" },
  { icon: "health-and-safety", text: "تحذيرات صحية مخصصة حسب حالتك (سكر، ضغط، كوليسترول)", color: "#4ECDC4" },
  { icon: "family-restroom", text: "إدارة أفراد العائلة مع تذكيرات لكل فرد", color: "#7B68EE" },
  { icon: "local-fire-department", text: "ميزان السعرات الحرارية - احسب احتياجك اليومي", color: "#FF5722" },
  { icon: "notifications-active", text: "إشعارات متقدمة وتذكيرات مخصصة لكل شيء", color: "#673AB7" },
  { icon: "menu-book", text: "مكتبة وصفات كاملة (250+ وصفة عراقية وخليجية وعربية)", color: "#795548" },
];

const FREE_FEATURES = [
  "عدد محدود من الوصفات",
  "استخدام واحد يومياً لذكاء الثلاجة",
  "بدون رفيق الدواء",
  "بدون تجديد النعمة",
  "بدون رفيق الماء",
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useUser();
  const createSubscription = trpc.subscription.create.useMutation();
  const { packages, isLoading, error, isPremium, purchasePackage, restorePurchases } =
    useSubscriptions();

  const pricing = PRICING.default;

  const handleSubscribe = async (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    try {
      Haptics.impactAsync("medium");
      const success = await purchasePackage(pkg);

      if (success) {
        // تحديث حالة المستخدم المحلية
        const expiry = new Date();
        if (pkg.period === "monthly") {
          expiry.setMonth(expiry.getMonth() + 1);
        } else {
          expiry.setFullYear(expiry.getFullYear() + 1);
        }

        await updateProfile({
          isSubscribed: true,
          subscriptionType: pkg.period,
          subscriptionExpiry: expiry.toISOString(),
        });

        // حفظ في السيرفر
        try {
          await createSubscription.mutateAsync({
            plan: pkg.period,
            userName: profile.name || undefined,
            userPhone: profile.phone || undefined,
          });
        } catch (e) {
          console.warn("[Subscription] Server save failed:", e);
        }

        Haptics.notificationAsync("success");
        Alert.alert("تم الاشتراك بنجاح! 🎉", "ألف عافية عليك، استمتع بجميع الميزات.");
      }
    } catch (err) {
      Haptics.notificationAsync("error");
      Alert.alert("خطأ", "حدث خطأ أثناء الشراء. حاول مرة أخرى.");
    }
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync("medium");
      await restorePurchases();
      Alert.alert("تم", "تم استعادة عملياتك الشرائية");
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ أثناء استعادة الشراء");
    }
  };

  // إذا كان المستخدم مشتركاً بالفعل
  if (profile.isSubscribed && isPremium) {
    const expiryDate = profile.subscriptionExpiry
      ? new Date(profile.subscriptionExpiry).toLocaleDateString("ar-IQ")
      : "";

    return (
      <ScreenContainer className="p-4">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown} className="items-center mb-8">
            <MaterialIcons name="verified" size={80} color={colors.success} />
            <Text className="text-3xl font-bold text-foreground mt-4">عضوية ذهبية</Text>
            <Text className="text-muted mt-2">شكراً لاشتراكك في ألف عافيات المميزة</Text>
          </Animated.View>

          <View className="bg-surface rounded-2xl p-6 mb-8">
            <Text className="text-lg font-semibold text-foreground mb-4">تفاصيل الاشتراك</Text>
            <View className="gap-3">
              <InfoRow
                label="نوع الاشتراك"
                value={profile.subscriptionType === "monthly" ? "شهري" : "سنوي"}
              />
              <InfoRow label="تاريخ الانتهاء" value={expiryDate} />
              <InfoRow label="الحالة" value="نشط ✓" />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRestore}
            className="py-3 px-4 rounded-lg border border-border mb-4"
          >
            <Text className="text-center text-muted font-semibold">استعادة عمليات الشراء</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // شاشة الاشتراك للمستخدمين غير المشتركين
  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">جاري التحميل...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* الرأس */}
        <Animated.View entering={FadeInDown} className="mb-8 items-center">
          <Text className="text-4xl font-bold text-foreground mb-2">ألف عافيات المميزة</Text>
          <Text className="text-center text-muted">
            احصل على وصول كامل لجميع الوصفات والميزات المتقدمة
          </Text>
        </Animated.View>

        {/* الميزات */}
        <View className="mb-8 bg-surface rounded-2xl p-6 gap-4">
          {PREMIUM_FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 50)}
              className="flex-row gap-3"
            >
              <MaterialIcons name={feature.icon as any} size={24} color={feature.color} />
              <View className="flex-1">
                <Text className="font-semibold text-foreground text-sm">{feature.text}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* الخطط */}
        <View className="mb-8 gap-4">
          {packages.map((pkg, index) => (
            <Animated.View
              key={pkg.id}
              entering={FadeInDown.delay(index * 100 + 600)}
              className="rounded-2xl p-6 border-2 border-border bg-surface overflow-hidden"
            >
              <View className="flex-row justify-between items-start mb-4">
                <View>
                  <Text className="text-xl font-bold text-foreground">
                    {pkg.period === "yearly" ? "سنوي" : "شهري"}
                  </Text>
                  {pkg.period === "yearly" && (
                    <Text className="text-xs text-success font-semibold mt-1">توفير 17%</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-3xl font-bold text-primary">{pkg.price}</Text>
                  <Text className="text-xs text-muted mt-1">{pkg.pricePerMonth}/شهر</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleSubscribe(pkg.id)}
                className="bg-primary rounded-lg py-3 items-center"
                style={{
                  backgroundColor: colors.primary,
                }}
              >
                <Text className="text-white font-semibold">اشترك الآن</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {error && (
          <View className="mb-4 bg-error/10 border border-error rounded-lg p-4">
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        {/* زر استعادة الشراء */}
        <TouchableOpacity
          onPress={handleRestore}
          className="py-3 px-4 rounded-lg border border-border mb-4"
        >
          <Text className="text-center text-muted font-semibold">استعادة عمليات الشراء السابقة</Text>
        </TouchableOpacity>

        {/* ملاحظة */}
        <View className="mt-4 pt-4 border-t border-border">
          <Text className="text-xs text-muted text-center leading-relaxed">
            سيتم تحديث الاشتراك تلقائياً في نهاية كل فترة. يمكنك إلغاء الاشتراك في أي وقت من إعدادات
            Google Play.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-border/50">
      <Text className="text-muted">{label}</Text>
      <Text className="font-semibold text-foreground">{value}</Text>
    </View>
  );
}

import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { trpc } from "@/lib/trpc";

// التسعير حسب الدولة
const PRICING: Record<string, { currency: string; monthly: number; yearly: number; monthlyLabel: string; yearlyLabel: string }> = {
  iraq: { currency: "دينار", monthly: 5000, yearly: 50000, monthlyLabel: "5,000", yearlyLabel: "50,000" },
  saudi: { currency: "ريال", monthly: 7, yearly: 70, monthlyLabel: "7", yearlyLabel: "70" },
  uae: { currency: "درهم", monthly: 7, yearly: 70, monthlyLabel: "7", yearlyLabel: "70" },
  egypt: { currency: "جنيه", monthly: 30, yearly: 300, monthlyLabel: "30", yearlyLabel: "300" },
  kuwait: { currency: "دينار كويتي", monthly: 2, yearly: 20, monthlyLabel: "2", yearlyLabel: "20" },
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

// الميزات المجانية (للمقارنة)
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
  const cancelSubscription = trpc.subscription.cancel.useMutation();

  // تحديد التسعير حسب دولة المستخدم
  const userCountry = profile.country || "iraq";
  const pricing = PRICING[userCountry] || PRICING.iraq;

  const handleSubscribe = (type: "monthly" | "yearly") => {
    const price = type === "monthly" ? pricing.monthlyLabel : pricing.yearlyLabel;
    const period = type === "monthly" ? "شهرياً" : "سنوياً";
    Alert.alert(
      "تأكيد الاشتراك",
      `هل تريد الاشتراك ${period} بمبلغ ${price} ${pricing.currency}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "اشتراك",
          onPress: async () => {
            const expiry = new Date();
            if (type === "monthly") {
              expiry.setMonth(expiry.getMonth() + 1);
            } else {
              expiry.setFullYear(expiry.getFullYear() + 1);
            }
            await updateProfile({
              isSubscribed: true,
              subscriptionType: type,
              subscriptionExpiry: expiry.toISOString(),
            });
            try {
              await createSubscription.mutateAsync({
                plan: type,
                userName: profile.name || undefined,
                userPhone: profile.phone || undefined,
              });
            } catch (e) {
              console.warn("[Subscription] Server save failed:", e);
            }
            Alert.alert("تم الاشتراك بنجاح! 🎉", "ألف عافية عليك، استمتع بجميع الميزات.");
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "إلغاء الاشتراك",
      "هل أنت متأكد من إلغاء الاشتراك؟ ستفقد جميع المزايا المدفوعة.",
      [
        { text: "لا، أبقِ اشتراكي", style: "cancel" },
        {
          text: "نعم، إلغاء",
          style: "destructive",
          onPress: async () => {
            await updateProfile({
              isSubscribed: false,
              subscriptionType: null,
              subscriptionExpiry: null,
            });
            try {
              await cancelSubscription.mutateAsync({
                userPhone: profile.phone || undefined,
              });
            } catch (e) {
              console.warn("[Subscription] Server cancel failed:", e);
            }
          },
        },
      ]
    );
  };

  // If already subscribed
  if (profile.isSubscribed) {
    const expiryDate = profile.subscriptionExpiry
      ? new Date(profile.subscriptionExpiry).toLocaleDateString("ar-IQ")
      : "";

    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-6">
            <Text className="text-2xl font-bold text-foreground text-center mb-6">اشتراكي</Text>

            <View
              className="rounded-2xl p-6 items-center border-2"
              style={{ backgroundColor: `${colors.primary}10`, borderColor: colors.primary }}
            >
              <Text className="text-4xl mb-3">⭐</Text>
              <Text className="text-xl font-bold text-foreground mb-2">أنت مشترك!</Text>
              <Text className="text-base text-muted text-center mb-1">
                الباقة {profile.subscriptionType === "monthly" ? "الشهرية" : "السنوية"}
              </Text>
              <Text className="text-sm text-muted">صالح حتى: {expiryDate}</Text>

              <View className="w-full mt-6 gap-3">
                {PREMIUM_FEATURES.map((feature, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <MaterialIcons name={feature.icon as any} size={20} color={feature.color} />
                    <Text className="text-sm text-foreground flex-1">{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCancel}
              className="mt-6 py-3 rounded-xl items-center"
              style={{ backgroundColor: `${colors.error}15` }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium" style={{ color: colors.error }}>إلغاء الاشتراك</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Not subscribed - show plans
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} className="items-center mb-6">
            <Text className="text-4xl mb-2">👑</Text>
            <Text className="text-2xl font-bold text-foreground text-center">
              باقات عافيات الذهبية
            </Text>
            <Text className="text-base text-muted text-center mt-2">
              استثمر في صحتك وصحة عائلتك
            </Text>
            <Text className="text-sm text-muted text-center mt-1">
              أقل من {pricing.currency === "دينار" ? "170 دينار" : pricing.currency === "ريال" ? "ربع ريال" : pricing.currency === "درهم" ? "ربع درهم" : "جنيه"} يومياً لصحة بيتكم
            </Text>
          </Animated.View>

          {/* ما ستحصل عليه */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4 text-center">
              ماذا ستحصل عند الاشتراك؟
            </Text>
            <View
              className="rounded-2xl p-4 border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              {PREMIUM_FEATURES.map((feature, i) => (
                <View key={i} className="flex-row items-center gap-3 mb-3">
                  <MaterialIcons name={feature.icon as any} size={22} color={feature.color} />
                  <Text className="text-sm text-foreground flex-1">{feature.text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Plans */}
          <View className="gap-4 mb-6">
            {/* Monthly */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View
                className="rounded-2xl p-5 border-2"
                style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}08` }}
              >
                <Text className="text-lg font-bold text-foreground mb-1">الباقة الشهرية</Text>
                <View className="flex-row items-baseline mb-2">
                  <Text className="text-3xl font-bold" style={{ color: colors.primary }}>{pricing.monthlyLabel}</Text>
                  <Text className="text-base text-muted mr-1"> {pricing.currency}/شهر</Text>
                </View>
                <Text className="text-xs text-muted mb-4">تجدد تلقائياً كل شهر • إلغاء في أي وقت</Text>

                <TouchableOpacity
                  onPress={() => handleSubscribe("monthly")}
                  className="py-3.5 rounded-xl items-center"
                  style={{ backgroundColor: colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-bold">اشترك شهرياً</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Yearly */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <View
                className="rounded-2xl p-5 border-2 relative overflow-hidden"
                style={{ borderColor: "#E8A359", backgroundColor: "#FFFAF3" }}
              >
                {/* Best value badge */}
                <View
                  className="absolute top-0 left-0 px-4 py-1.5 rounded-br-xl"
                  style={{ backgroundColor: "#E8A359" }}
                >
                  <Text className="text-white text-xs font-bold">الأوفر 🔥</Text>
                </View>

                <Text className="text-lg font-bold text-foreground mb-1 mt-5">الباقة السنوية</Text>
                <View className="flex-row items-baseline mb-1">
                  <Text className="text-3xl font-bold" style={{ color: "#E8A359" }}>{pricing.yearlyLabel}</Text>
                  <Text className="text-base text-muted mr-1"> {pricing.currency}/سنة</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A35920" }}>
                    <Text className="text-sm font-bold" style={{ color: "#E8A359" }}>
                      وفّر شهرين مجاناً!
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleSubscribe("yearly")}
                  className="py-3.5 rounded-xl items-center"
                  style={{ backgroundColor: "#E8A359" }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-bold">اشترك سنوياً ووفّر!</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* المقارنة - ما يفوتك بدون اشتراك */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mb-6">
            <Text className="text-base font-bold text-foreground mb-3">بدون اشتراك:</Text>
            <View
              className="rounded-xl p-4 border"
              style={{ borderColor: `${colors.error}30`, backgroundColor: `${colors.error}05` }}
            >
              {FREE_FEATURES.map((feature, i) => (
                <View key={i} className="flex-row items-center gap-2 mb-2">
                  <MaterialIcons name="close" size={18} color={colors.error} />
                  <Text className="text-sm text-muted">{feature}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ضمان */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)} className="items-center mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <MaterialIcons name="verified-user" size={20} color={colors.success} />
              <Text className="text-sm font-medium text-foreground">ضمان الرضا الكامل</Text>
            </View>
            <Text className="text-xs text-muted text-center">
              إذا لم يعجبك التطبيق، يمكنك إلغاء الاشتراك في أي وقت بدون أي التزام
            </Text>
          </Animated.View>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

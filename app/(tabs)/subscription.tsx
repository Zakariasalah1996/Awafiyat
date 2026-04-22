import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { trpc } from "@/lib/trpc";

export default function SubscriptionScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useUser();
  const createSubscription = trpc.subscription.create.useMutation();
  const cancelSubscription = trpc.subscription.cancel.useMutation();

  const handleSubscribe = (type: "monthly" | "yearly") => {
    Alert.alert(
      "تأكيد الاشتراك",
      `هل تريد الاشتراك في الباقة ${type === "monthly" ? "الشهرية (4,000 دينار)" : "السنوية (40,000 دينار)"}?`,
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
            // Save locally first
            await updateProfile({
              isSubscribed: true,
              subscriptionType: type,
              subscriptionExpiry: expiry.toISOString(),
            });
            // Save to server (non-blocking - don't fail if server unreachable)
            try {
              await createSubscription.mutateAsync({ plan: type });
            } catch (e) {
              // Server save failed silently - local save is enough for functionality
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
      "هل أنت متأكد من إلغاء الاشتراك؟",
      [
        { text: "لا", style: "cancel" },
        {
          text: "نعم، إلغاء",
          style: "destructive",
          onPress: async () => {
            // Cancel locally
            await updateProfile({
              isSubscribed: false,
              subscriptionType: null,
              subscriptionExpiry: null,
            });
            // Cancel on server (non-blocking)
            try {
              await cancelSubscription.mutateAsync();
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
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text className="text-sm text-foreground">اقتراحات غير محدودة في ذكاء الثلاجة</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text className="text-sm text-foreground">جداول أسبوعية كاملة</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text className="text-sm text-foreground">نصائح صحية مخصصة لمرضك</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text className="text-sm text-foreground">حفظ وصفات غير محدود</Text>
                </View>
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
            <Text className="text-2xl font-bold text-foreground text-center">
              باقات عافيات الذهبية
            </Text>
            <Text className="text-base text-muted text-center mt-2">
              اختر ما يناسبك
            </Text>
            <Text className="text-sm text-muted text-center mt-1">
              دينار واحد يومياً تقريباً لصحتك وأكل بيتكم
            </Text>
          </Animated.View>

          {/* Plans */}
          <View className="gap-4 mb-6">
            {/* Monthly */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <View
                className="rounded-2xl p-5 border-2"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text className="text-lg font-bold text-foreground mb-1">الباقة الشهرية</Text>
                <View className="flex-row items-baseline mb-4">
                  <Text className="text-3xl font-bold" style={{ color: colors.primary }}>4,000</Text>
                  <Text className="text-base text-muted mr-1"> دينار/شهر</Text>
                </View>

                {[
                  "اقتراحات غير محدودة في ذكاء الثلاجة",
                  "جداول أسبوعية كاملة",
                  "نصائح صحية مخصصة لمرضك",
                  "تذكيرات لجميع أفراد العائلة",
                  "إلغاء في أي وقت",
                ].map((feature, i) => (
                  <View key={i} className="flex-row items-center gap-2 mb-2">
                    <MaterialIcons name="check" size={18} color={colors.success} />
                    <Text className="text-sm text-foreground">{feature}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => handleSubscribe("monthly")}
                  className="mt-4 py-3 rounded-xl items-center"
                  style={{ backgroundColor: colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-bold">اشترك شهرياً</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Yearly */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View
                className="rounded-2xl p-5 border-2 relative overflow-hidden"
                style={{ borderColor: "#E8A359", backgroundColor: "#FFFAF3" }}
              >
                {/* Best value badge */}
                <View
                  className="absolute top-0 left-0 px-3 py-1 rounded-br-xl"
                  style={{ backgroundColor: "#E8A359" }}
                >
                  <Text className="text-white text-xs font-bold">الأوفر</Text>
                </View>

                <Text className="text-lg font-bold text-foreground mb-1 mt-4">الباقة السنوية</Text>
                <View className="flex-row items-baseline mb-1">
                  <Text className="text-3xl font-bold" style={{ color: "#E8A359" }}>40,000</Text>
                  <Text className="text-base text-muted mr-1"> دينار/سنة</Text>
                </View>
                <Text className="text-sm mb-4" style={{ color: "#E8A359" }}>
                  توفير شهرين مجاناً!
                </Text>

                {[
                  "كل مزايا الشهرية + شهران مجاناً",
                  "شارة عضوية ذهبية بجانب اسمك",
                  "أولوية الدعم الفني",
                  "إحصائيات صحية شهرية",
                  "إشعارات متقدمة (تذكير بمواعيد الدواء)",
                ].map((feature, i) => (
                  <View key={i} className="flex-row items-center gap-2 mb-2">
                    <MaterialIcons name="check" size={18} color="#E8A359" />
                    <Text className="text-sm text-foreground">{feature}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => handleSubscribe("yearly")}
                  className="mt-4 py-3 rounded-xl items-center"
                  style={{ backgroundColor: "#E8A359" }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-bold">اشترك سنوياً</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* Extra benefits */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text className="text-base font-bold text-foreground mb-3">مزايا إضافية للمشتركين</Text>
            {[
              { icon: "favorite", text: "حفظ وصفات غير محدود", color: "#E85D5D" },
              { icon: "bar-chart", text: "إحصائيات صحية شهرية", color: "#4ECDC4" },
              { icon: "notifications", text: "إشعارات متقدمة (تذكير بمواعيد الدواء)", color: "#7B68EE" },
            ].map((item, i) => (
              <View key={i} className="flex-row items-center gap-3 mb-3">
                <MaterialIcons name={item.icon as any} size={22} color={item.color} />
                <Text className="text-sm text-foreground">{item.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Payment methods */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-6">
            <Text className="text-base font-bold text-foreground mb-3">طرق الدفع المتاحة</Text>
            <View className="gap-3">
              {[
                { name: "Zain Cash", color: "#4CAF50", icon: "account-balance-wallet" },
                { name: "Qi Card", color: "#1976D2", icon: "credit-card" },
                { name: "فيزا / ماستركارد", color: "#FF9800", icon: "payment" },
              ].map((method, i) => (
                <View
                  key={i}
                  className="flex-row items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <MaterialIcons name={method.icon as any} size={24} color={method.color} />
                  <Text className="text-base text-foreground font-medium">{method.name}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

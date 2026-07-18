import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import * as Haptics from 'expo-haptics';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSafeBottomPadding } from '@/lib/safe-area-spacing';

I18nManager.forceRTL(true);

export default function SubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { packages, isLoading, error, purchasePackage, restorePurchases } =
    useSubscriptions();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [pendingPkgId, setPendingPkgId] = useState<string | null>(null);

  const handlePurchase = (packageId: string) => {
    setPendingPkgId(packageId);
    setShowTrialModal(true);
  };

  const confirmTrialPurchase = async () => {
    if (!pendingPkgId) return;
    const pkg = packages.find((p) => p.id === pendingPkgId);
    if (!pkg) return;
    setShowTrialModal(false);
    try {
      setSelectedPackageId(pendingPkgId);
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      const success = await purchasePackage(pkg);
      if (success) {
        Haptics.notificationAsync(NotificationFeedbackType.Success);
        Alert.alert('نجح الاشتراك! 🎉', 'شكراً لاشتراكك في ألف عافيات المميزة');
        router.back();
      }
    } catch {
      Haptics.notificationAsync(NotificationFeedbackType.Error);
      Alert.alert('خطأ', 'حدث خطأ أثناء الشراء. حاول مرة أخرى.');
    } finally {
      setSelectedPackageId(null);
      setPendingPkgId(null);
    }
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      await restorePurchases();
      Alert.alert('تم', 'تم استعادة عملياتك الشرائية');
    } catch {
      Alert.alert('خطأ', 'حدث خطأ أثناء استعادة الشراء');
    }
  };

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
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: getSafeBottomPadding(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* الرأس */}
        <View className="mb-8 items-center">
          <Text className="text-4xl font-bold text-foreground mb-2">ألف عافيات المميزة</Text>
          <Text className="text-center text-muted">
            احصل على وصول كامل لجميع الوصفات والميزات المتقدمة
          </Text>
        </View>

        {/* الميزات */}
        <View className="mb-8 bg-surface rounded-2xl p-6 gap-4">
          <FeatureItem
            icon="✓"
            title="وصفات غير محدودة"
            description="وصول كامل لمكتبة الوصفات العراقية"
          />
          <FeatureItem
            icon="✓"
            title="تخطيط ذكي"
            description="خطط وجبات مخصصة حسب حالتك الصحية"
          />
          <FeatureItem
            icon="✓"
            title="إشعارات متقدمة"
            description="تنبيهات الماء والدواء والوجبات"
          />
          <FeatureItem
            icon="✓"
            title="محرك ذكاء اصطناعي"
            description="اقتراحات وصفات ذكية من المكونات المتاحة"
          />
          <FeatureItem icon="✓" title="بدون إعلانات" description="تجربة نظيفة وخالية من الإزعاج" />
        </View>

        {/* الخطط */}
        <View className="mb-8 gap-4">
          {packages.map((pkg) => (
            <PlanCard
              key={pkg.id}
              plan={pkg}
              isSelected={selectedPackageId === pkg.id}
              isLoading={selectedPackageId === pkg.id && isLoading}
              onPress={() => handlePurchase(pkg.id)}
              colors={colors}
            />
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

      {/* ─── Modal التجربة المجانية 3 أيام ─── */}
      <Modal visible={showTrialModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 22,
              paddingTop: 18,
              paddingBottom: getSafeBottomPadding(insets.bottom, 28),
            }}
          >
            {/* الرأس - مضغوط */}
            <View style={{ alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 32 }}>🎁</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1a1a1a", marginTop: 6 }}>
                3 أيام مجاناً!
              </Text>
              <Text style={{ fontSize: 13, color: "#666", marginTop: 4, textAlign: "center" }}>
                جرّب جميع الميزات مجاناً بدون أي رسوم
              </Text>
            </View>

            {/* الخطوات - مضغوطة */}
            <View style={{ backgroundColor: "#E8F5E9", borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1.5, borderColor: "#2e7d32", gap: 8 }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={{ flex: 1, fontSize: 13, color: "#2d6a2d", textAlign: "right", fontWeight: "600" }}>اليوم: افتح جميع الميزات فوراً</Text>
              </View>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
                <Text style={{ flex: 1, fontSize: 13, color: "#2d6a2d", textAlign: "right", fontWeight: "600" }}>اليوم 2: سنذكّرك قبل انتهاء التجربة</Text>
              </View>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>💳</Text>
                <Text style={{ flex: 1, fontSize: 13, color: "#2d6a2d", textAlign: "right", fontWeight: "600" }}>اليوم 3: يبدأ الاشتراك إذا لم تلغِ</Text>
              </View>
            </View>

            {/* زر بدء التجربة */}
            <TouchableOpacity
              onPress={confirmTrialPurchase}
              style={{ backgroundColor: "#2e7d32", borderRadius: 16, paddingVertical: 15, alignItems: "center", marginBottom: 10 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>ابدأ التجربة المجانية 3 أيام</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                ثم {pendingPkgId && packages.find(p => p.id === pendingPkgId)?.price || ""}/
                {pendingPkgId && packages.find(p => p.id === pendingPkgId)?.period === "yearly" ? "سنة" : "شهر"}
                {" "}• إلغاء في أي وقت
              </Text>
            </TouchableOpacity>

            {/* زر إلغاء */}
            <TouchableOpacity
              onPress={() => { setShowTrialModal(false); setPendingPkgId(null); }}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: "#999", fontSize: 14 }}>ليس الآن</Text>
            </TouchableOpacity>

            {/* ملاحظة */}
            <Text style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 8 }}>
              لن يتم خصم أي مبلغ خلال فترة التجربة • إلغاء من إعدادات Google Play
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row gap-3">
      <Text className="text-2xl text-primary">{icon}</Text>
      <View className="flex-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted mt-1">{description}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  isSelected,
  isLoading,
  onPress,
  colors,
}: {
  plan: any;
  isSelected: boolean;
  isLoading: boolean;
  onPress: () => void;
  colors: any;
}) {
  const isYearly = plan.period === 'yearly';
  const savings = isYearly ? 'توفير 17%' : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      className={`rounded-2xl p-6 border-2 ${
        isSelected
          ? `border-primary bg-primary/10`
          : `border-border bg-surface`
      }`}
      style={{
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-xl font-bold text-foreground">
            {isYearly ? 'سنوي' : 'شهري'}
          </Text>
          {savings && (
            <Text className="text-xs text-success font-semibold mt-1">{savings}</Text>
          )}
        </View>
        <View className="items-end">
          <Text className="text-3xl font-bold text-primary">{plan.price}</Text>
          <Text className="text-xs text-muted mt-1">
            {plan.pricePerMonth}/شهر
          </Text>
        </View>
      </View>

      {isLoading && isSelected ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View
          className="bg-primary rounded-lg py-3 items-center"
          style={{
            backgroundColor: colors.primary,
          }}
        >
          <Text className="text-white font-semibold">اشترك الآن</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import * as Haptics from 'expo-haptics';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

I18nManager.forceRTL(true);

export default function SubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { packages, isLoading, error, isPremium, purchasePackage, restorePurchases } =
    useSubscriptions();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    try {
      setSelectedPackageId(packageId);
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);

      const success = await purchasePackage(pkg);

      if (success) {
        Haptics.notificationAsync(NotificationFeedbackType.Success);
        Alert.alert('نجح الاشتراك! 🎉', 'شكراً لاشتراكك في ألف عافيات المميزة');
        router.back();
      }
    } catch (err) {
      Haptics.notificationAsync(NotificationFeedbackType.Error);
      Alert.alert('خطأ', 'حدث خطأ أثناء الشراء. حاول مرة أخرى.');
    } finally {
      setSelectedPackageId(null);
    }
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      await restorePurchases();
      Alert.alert('تم', 'تم استعادة عملياتك الشرائية');
    } catch (err) {
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
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

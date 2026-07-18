import { useEffect, useState, useCallback } from 'react';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useSubscriptionContext } from '@/lib/subscription-context';
import { useUser } from '@/lib/user-context';
import { getDeviceId, getGuestUserId } from '@/lib/guest-auth';
import { getApiBaseUrl } from '@/constants/oauth';

// Track subscription button click silently
async function trackSubscriptionClick(plan: string, source: string) {
  try {
    const deviceId = await getDeviceId();
    const userId = await getGuestUserId();
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/user/subscription-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deviceId, plan, source, country: 'iraq' }),
    });
  } catch (_) {
    // Silent - tracking should never break the purchase flow
  }
}

const ENTITLEMENT_ID = 'premium';

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  pricePerMonth: string;
  period: 'monthly' | 'yearly';
  offering: PurchasesOffering;
  package: PurchasesPackage;
}

export interface UseSubscriptionsReturn {
  packages: SubscriptionPackage[];
  isLoading: boolean;
  error: string | null;
  isPremium: boolean;
  purchasePackage: (pkg: SubscriptionPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // نستخدم SubscriptionContext كمصدر حقيقي لحالة الاشتراك
  const { isPremium, isLoading: ctxLoading, refreshSubscription } = useSubscriptionContext();
  const { profile, updateProfile } = useUser();

  // جلب العروض المتاحة فقط (بدون تهيئة RevenueCat مرة أخرى)
  useEffect(() => {
    if (Platform.OS === 'web') {
      setPkgLoading(false);
      return;
    }

    const fetchOfferings = async () => {
      try {
        setPkgLoading(true);
        const offerings = await Purchases.getOfferings();

        if (!offerings) {
          console.warn('لا توجد عروض متاحة');
          setPackages([]);
          return;
        }

        const availablePackages: SubscriptionPackage[] = [];

        // كلا المنتجين (الشهري والسنوي) داخل Offering واحد: rc_monthly$
        const mainOffering = offerings.all?.['rc_monthly$'] || offerings.current;
        
        console.log('Offerings available:', {
          mainOffering: !!mainOffering,
          allKeys: Object.keys(offerings.all || {}),
          currentOffering: !!offerings.current,
        });
        
        if (mainOffering?.availablePackages) {
          mainOffering.availablePackages.forEach((pkg) => {
            const pricing = pkg.product.priceString;
            const period = pkg.product.subscriptionPeriod;
            const productId = pkg.product.identifier || '';

            let periodType: 'monthly' | 'yearly' = 'monthly';
            let pricePerMonth = pricing;

            // تحديد نوع الاشتراك بناءً على subscriptionPeriod أو product ID
            if (period?.includes('P1Y') || productId.includes('yearly')) {
              periodType = 'yearly';
              const yearlyPrice = parseFloat(pkg.product.price.toString());
              pricePerMonth = (yearlyPrice / 12).toFixed(2);
            }

            availablePackages.push({
              id: pkg.identifier,
              name: pkg.product.title,
              price: pricing,
              pricePerMonth,
              period: periodType,
              offering: mainOffering,
              package: pkg,
            });
          });
        }

        console.log('Packages loaded:', availablePackages.length, availablePackages.map(p => ({
          id: p.id,
          period: p.period,
          price: p.price,
        })));

        setPackages(availablePackages);
      } catch (err) {
        console.error('خطأ في جلب العروض:', err);
        setError(err instanceof Error ? err.message : 'خطأ في جلب العروض');
      } finally {
        setPkgLoading(false);
      }
    };

    fetchOfferings();
  }, []);

  const purchasePackage = useCallback(
    async (pkg: SubscriptionPackage): Promise<boolean> => {
      try {
        setError(null);
        // Track subscription click event
        trackSubscriptionClick(pkg.period, 'subscription_screen');
        const result = await Purchases.purchasePackage(pkg.package);

        const hasPremium = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID];

        if (hasPremium) {
          // تحديث حالة الاشتراك في AsyncStorage
          const expiry = new Date();
          if (pkg.period === 'monthly') {
            expiry.setMonth(expiry.getMonth() + 1);
          } else {
            expiry.setFullYear(expiry.getFullYear() + 1);
          }
          await updateProfile({
            isSubscribed: true,
            subscriptionType: pkg.period,
            subscriptionExpiry: expiry.toISOString(),
          });

          // تحديث SubscriptionContext
          await refreshSubscription();
        }

        return hasPremium;
      } catch (err: any) {
        if (
          err?.userCancelled === true ||
          (err instanceof Error && err.message.includes('User cancelled'))
        ) {
          return false;
        }
        console.error('خطأ في الشراء:', err);
        setError(err instanceof Error ? err.message : 'خطأ في الشراء');
        return false;
      }
    },
    [updateProfile, refreshSubscription]
  );

  const restorePurchases = useCallback(async () => {
    try {
      setError(null);
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      await updateProfile({ isSubscribed: hasPremium });
      await refreshSubscription();
    } catch (err) {
      console.error('خطأ في استعادة الشراء:', err);
      setError(err instanceof Error ? err.message : 'خطأ في استعادة الشراء');
    }
  }, [updateProfile, refreshSubscription]);

  return {
    packages,
    isLoading: ctxLoading || pkgLoading,
    error,
    isPremium,
    purchasePackage,
    restorePurchases,
  };
}

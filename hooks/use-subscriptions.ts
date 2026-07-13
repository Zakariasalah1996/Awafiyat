import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSubscriptionContext } from '@/lib/subscription-context';
import { useUser } from '@/lib/user-context';

const ENTITLEMENT_ID = 'premium';

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  pricePerMonth: string;
  period: 'monthly' | 'yearly';
  offering: any;
  package: any;
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
  const [purchasesSDK, setPurchasesSDK] = useState<any>(null);

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

        // تحميل المكتبة بشكل آمن
        let Purchases: any;
        try {
          const mod = await import('react-native-purchases');
          Purchases = mod.default || mod;
        } catch (loadErr) {
          console.warn('[Subscriptions] Failed to load react-native-purchases:', loadErr);
          setPkgLoading(false);
          return;
        }

        setPurchasesSDK(Purchases);

        const offerings = await Purchases.getOfferings();

        if (!offerings) {
          console.warn('لا توجد عروض متاحة');
          setPackages([]);
          return;
        }

        const availablePackages: SubscriptionPackage[] = [];

        const monthlyOffering = offerings.all?.['rc_monthly$'];
        const annualOffering = offerings.all?.['rc_annual$'];
        
        console.log('Offerings available:', {
          monthly: !!monthlyOffering,
          annual: !!annualOffering,
          allKeys: Object.keys(offerings.all || {}),
        });
        
        // أضف المنتجات من الـ Offering الشهري
        if (monthlyOffering?.availablePackages) {
          monthlyOffering.availablePackages.forEach((pkg: any) => {
            const pricing = pkg.product.priceString;
            const period = pkg.product.subscriptionPeriod;

            let periodType: 'monthly' | 'yearly' = 'monthly';
            let pricePerMonth = pricing;

            if (period?.includes('P1Y')) {
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
              offering: monthlyOffering,
              package: pkg,
            });
          });
        }
        
        // أضف المنتجات من الـ Offering السنوي
        if (annualOffering?.availablePackages) {
          annualOffering.availablePackages.forEach((pkg: any) => {
            const pricing = pkg.product.priceString;
            const period = pkg.product.subscriptionPeriod;

            let periodType: 'monthly' | 'yearly' = 'monthly';
            let pricePerMonth = pricing;

            if (period?.includes('P1Y')) {
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
              offering: annualOffering,
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
      if (!purchasesSDK) {
        setError('خدمة الاشتراك غير متاحة');
        return false;
      }
      try {
        setError(null);
        const result = await purchasesSDK.purchasePackage(pkg.package);

        const hasPremium = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID];

        if (hasPremium) {
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
    [updateProfile, refreshSubscription, purchasesSDK]
  );

  const restorePurchases = useCallback(async () => {
    if (!purchasesSDK) {
      setError('خدمة الاشتراك غير متاحة');
      return;
    }
    try {
      setError(null);
      const customerInfo = await purchasesSDK.restorePurchases();
      const hasPremium = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      await updateProfile({ isSubscribed: hasPremium });
      await refreshSubscription();
    } catch (err) {
      console.error('خطأ في استعادة الشراء:', err);
      setError(err instanceof Error ? err.message : 'خطأ في استعادة الشراء');
    }
  }, [updateProfile, refreshSubscription, purchasesSDK]);

  return {
    packages,
    isLoading: ctxLoading || pkgLoading,
    error,
    isPremium,
    purchasePackage,
    restorePurchases,
  };
}

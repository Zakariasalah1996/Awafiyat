import { useEffect, useState, useCallback } from 'react';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  PurchasesEntitlementInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUE_CAT_API_KEY = 'goog_hkYvXqzkoUXOZWyGdoshKWXRRIW';
const ENTITLEMENT_ID = 'premium'; // معرّف الاشتراك المميز

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  // تهيئة RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // تعيين API Key
        await Purchases.configure({
          apiKey: REVENUE_CAT_API_KEY,
          appUserID: undefined, // سيتم تعيينه تلقائياً
        });

        // جلب العروض المتاحة
        await fetchOfferings();

        // التحقق من حالة الاشتراك
        await checkSubscriptionStatus();
      } catch (err) {
        console.error('خطأ في تهيئة RevenueCat:', err);
        setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, []);

  const fetchOfferings = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        setPackages([]);
        return;
      }

      const availablePackages: SubscriptionPackage[] = [];

      // البحث عن الحزم الشهرية والسنوية
      offerings.current.availablePackages.forEach((pkg) => {
        const pricing = pkg.product.priceString;
        const period = pkg.product.subscriptionPeriod;

        let periodType: 'monthly' | 'yearly' = 'monthly';
        let pricePerMonth = pricing;

        // تحديد نوع الفترة
        if (period?.includes('P1Y')) {
          periodType = 'yearly';
          // حساب السعر الشهري للعرض السنوي
          const yearlyPrice = parseFloat(pkg.product.price.toString());
          pricePerMonth = (yearlyPrice / 12).toFixed(2);
        }

        availablePackages.push({
          id: pkg.identifier,
          name: pkg.product.title,
          price: pricing,
          pricePerMonth,
          period: periodType,
          offering: offerings.current!,
          package: pkg,
        });
      });

      setPackages(availablePackages);
    } catch (err) {
      console.error('خطأ في جلب العروض:', err);
      setError(err instanceof Error ? err.message : 'خطأ في جلب العروض');
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!hasPremium);
    } catch (err) {
      console.error('خطأ في التحقق من الاشتراك:', err);
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: SubscriptionPackage): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await Purchases.purchasePackage(pkg.package);

        // التحقق من نجاح الشراء
        const hasPremium = result.customerInfo.entitlements.active[ENTITLEMENT_ID];
        setIsPremium(!!hasPremium);

        return !!hasPremium;
      } catch (err) {
        if (err instanceof Error && err.message.includes('User cancelled')) {
          // المستخدم ألغى الشراء
          return false;
        }
        console.error('خطأ في الشراء:', err);
        setError(err instanceof Error ? err.message : 'خطأ في الشراء');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      await Purchases.restorePurchases();
      await checkSubscriptionStatus();
    } catch (err) {
      console.error('خطأ في استعادة الشراء:', err);
      setError(err instanceof Error ? err.message : 'خطأ في استعادة الشراء');
    } finally {
      setIsLoading(false);
    }
  }, [checkSubscriptionStatus]);

  return {
    packages,
    isLoading,
    error,
    isPremium,
    purchasePackage,
    restorePurchases,
  };
}

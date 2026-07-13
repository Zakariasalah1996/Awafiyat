import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { Platform } from "react-native";
import { useUser } from "@/lib/user-context";

const REVENUE_CAT_API_KEY = "goog_hkYvXqzkoUXOZWyGdoshKWXRRIW";
const ENTITLEMENT_ID = "premium";

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isLoading: true,
  error: null,
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const syncSubscriptionStatus = useCallback(
    async (customerInfo: CustomerInfo) => {
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);

      // RevenueCat هو المصدر الحقيقي — نحدّث AsyncStorage ليتطابق معه
      if (profile.isSubscribed !== active) {
        await updateProfile({ isSubscribed: active }).catch(() => {});
      }
    },
    [profile.isSubscribed, updateProfile]
  );

  const refreshSubscription = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      setIsLoading(true);
      const customerInfo = await Purchases.getCustomerInfo();
      await syncSubscriptionStatus(customerInfo);
    } catch (err) {
      console.warn("[Subscription] refresh error:", err);
      // في حالة الخطأ، نعتمد على القيمة المحلية
      setIsPremium(profile.isSubscribed ?? false);
    } finally {
      setIsLoading(false);
    }
  }, [syncSubscriptionStatus, profile.isSubscribed]);

  useEffect(() => {
    if (Platform.OS === "web") {
      // على الويب نعتمد على القيمة المحلية فقط
      setIsPremium(profile.isSubscribed ?? false);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        setError(null);
        if (!initialized) {
          await Purchases.configure({ apiKey: REVENUE_CAT_API_KEY });
          setInitialized(true);
        }
        const customerInfo = await Purchases.getCustomerInfo();
        await syncSubscriptionStatus(customerInfo);
      } catch (err) {
        console.warn("[Subscription] init error:", err);
        setError(err instanceof Error ? err.message : "خطأ في تهيئة الاشتراك");
        // في حالة الخطأ، نعتمد على القيمة المحلية
        setIsPremium(profile.isSubscribed ?? false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // الاستماع لتغييرات RevenueCat في الوقت الفعلي (مثل انتهاء الاشتراك أو تجديده)
  useEffect(() => {
    if (Platform.OS === "web" || !initialized) return;

    Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      syncSubscriptionStatus(info).catch(() => {});
    });

    // RevenueCat listener لا يدعم إزالة مباشرة في هذا الإصدار
    return () => {};
  }, [initialized, syncSubscriptionStatus]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, error, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  return context;
}

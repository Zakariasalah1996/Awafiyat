import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { useUser } from "@/lib/user-context";

const REVENUECAT_PUBLIC_API_KEYS = {
  ios: "appl_biJjDFnvutsNdCynbpWLEXLRMLP",
  android: "goog_hkYvXqzkoUXOZWyGdoshKWXRRIW",
} as const;

const ENTITLEMENT_ID = "premium";

let PurchasesModule: any = null;
let PurchasesError: Error | null = null;
let configurationPromise: Promise<any> | null = null;

async function getPurchasesModule() {
  if (PurchasesModule !== null) return PurchasesModule;
  if (PurchasesError) throw PurchasesError;

  try {
    const importedModule = await import("react-native-purchases");
    PurchasesModule = importedModule.default || importedModule;
    return PurchasesModule;
  } catch (error) {
    PurchasesError = error as Error;
    console.warn("[Subscription] Failed to load react-native-purchases:", error);
    throw error;
  }
}

function getRevenueCatApiKey() {
  if (Platform.OS === "ios") return REVENUECAT_PUBLIC_API_KEYS.ios;
  if (Platform.OS === "android") return REVENUECAT_PUBLIC_API_KEYS.android;
  return null;
}

export async function getConfiguredPurchases() {
  if (Platform.OS === "web") {
    throw new Error("RevenueCat is unavailable on web.");
  }

  if (!configurationPromise) {
    configurationPromise = (async () => {
      const Purchases = await getPurchasesModule();
      const apiKey = getRevenueCatApiKey();

      if (!apiKey) {
        throw new Error(`RevenueCat is not configured for ${Platform.OS}.`);
      }

      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) {
        await Purchases.configure({ apiKey });
      }

      return Purchases;
    })().catch((error) => {
      configurationPromise = null;
      throw error;
    });
  }

  return configurationPromise;
}

interface CustomerInfo {
  entitlements: { active: Record<string, unknown> };
}

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
      const active = Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
      setIsPremium(active);

      if (profile.isSubscribed !== active) {
        await updateProfile({ isSubscribed: active }).catch(() => {});
      }
    },
    [profile.isSubscribed, updateProfile],
  );

  const refreshSubscription = useCallback(async () => {
    if (Platform.OS === "web") return;

    try {
      setIsLoading(true);
      setError(null);
      const Purchases = await getConfiguredPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      await syncSubscriptionStatus(customerInfo);
    } catch (caughtError) {
      console.warn("[Subscription] refresh error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "تعذر تحديث حالة الاشتراك");
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, [profile.isSubscribed, syncSubscriptionStatus]);

  useEffect(() => {
    if (Platform.OS === "web") {
      setIsPremium(profile.isSubscribed ?? false);
      setIsLoading(false);
      return;
    }

    let active = true;

    const initialize = async () => {
      try {
        setError(null);
        const Purchases = await getConfiguredPurchases();
        const customerInfo = await Purchases.getCustomerInfo();
        if (!active) return;
        setInitialized(true);
        await syncSubscriptionStatus(customerInfo);
      } catch (caughtError) {
        if (!active) return;
        console.warn("[Subscription] init error:", caughtError);
        setError(caughtError instanceof Error ? caughtError.message : "خطأ في تهيئة الاشتراك");
        setIsPremium(false);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [profile.isSubscribed, syncSubscriptionStatus]);

  useEffect(() => {
    if (Platform.OS === "web" || !initialized) return;

    let listener: ((info: CustomerInfo) => void) | null = null;
    let active = true;

    const registerListener = async () => {
      try {
        const Purchases = await getConfiguredPurchases();
        if (!active) return;

        listener = (customerInfo: CustomerInfo) => {
          syncSubscriptionStatus(customerInfo).catch(() => {});
        };
        Purchases.addCustomerInfoUpdateListener(listener);
      } catch (caughtError) {
        console.warn("[Subscription] Failed to add listener:", caughtError);
      }
    };

    registerListener();

    return () => {
      active = false;
      if (listener) {
        void getConfiguredPurchases()
          .then((Purchases) => Purchases.removeCustomerInfoUpdateListener(listener))
          .catch(() => {});
      }
    };
  }, [initialized, syncSubscriptionStatus]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, error, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesOffering, type PurchasesPackage, type SubscriptionOption } from "react-native-purchases";

import { getApiBaseUrl } from "@/constants/oauth";
import { getDeviceId, getGuestUserId } from "@/lib/guest-auth";
import { getConfiguredPurchases, useSubscriptionContext } from "@/lib/subscription-context";
import { selectPaidBasePlan } from "@/lib/subscription-pricing";
import { useUser } from "@/lib/user-context";

const ENTITLEMENT_ID = "premium";

async function trackSubscriptionClick(plan: string, source: string, country: string | undefined) {
  try {
    const deviceId = await getDeviceId();
    const userId = await getGuestUserId();
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/user/subscription-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, deviceId, plan, source, country: country ?? "unknown" }),
    });
  } catch {
    // Analytics must never interrupt StoreKit.
  }
}

function formatPeriod(period: string | null, fallback: "monthly" | "yearly") {
  if (!period) return fallback === "yearly" ? "سنة واحدة" : "شهر واحد";

  const match = /^P(\d+)(D|W|M|Y)$/.exec(period);
  if (!match) return fallback === "yearly" ? "سنة واحدة" : "شهر واحد";

  const amount = Number(match[1]);
  const unit = match[2];
  const labels: Record<string, [string, string]> = {
    D: ["يوم", "أيام"],
    W: ["أسبوع", "أسابيع"],
    M: ["شهر", "أشهر"],
    Y: ["سنة", "سنوات"],
  };
  const [singular, plural] = labels[unit];
  return `${amount} ${amount === 1 ? singular : plural}`;
}

function getPeriodType(productId: string, subscriptionPeriod: string | null): "monthly" | "yearly" {
  if (subscriptionPeriod?.includes("P1Y") || /year|annual|سنوي/i.test(productId)) {
    return "yearly";
  }
  return "monthly";
}

function formatMonthlyEquivalent(pkg: PurchasesPackage, period: "monthly" | "yearly") {
  if (period === "monthly") return pkg.product.priceString;
  if (pkg.product.pricePerMonth == null || !pkg.product.currencyCode) return null;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: pkg.product.currencyCode,
      maximumFractionDigits: 2,
    }).format(pkg.product.pricePerMonth);
  } catch {
    return null;
  }
}

export interface IntroductoryOffer {
  isFree: boolean;
  duration: string;
  price: string;
}

export interface SubscriptionPackage {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: string;
  pricePerMonth: string | null;
  period: "monthly" | "yearly";
  periodLabel: string;
  introductoryOffer: IntroductoryOffer | null;
  offering: PurchasesOffering;
  package: PurchasesPackage;
  paidBasePlan: SubscriptionOption | null;
}

export interface UseSubscriptionsReturn {
  packages: SubscriptionPackage[];
  isLoading: boolean;
  error: string | null;
  isPremium: boolean;
  purchasePackage: (pkg: SubscriptionPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  reloadPackages: () => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isPremium, isLoading: contextLoading, refreshSubscription } = useSubscriptionContext();
  const { profile, updateProfile } = useUser();

  const loadPackages = useCallback(async () => {
    if (Platform.OS === "web") {
      setPackages([]);
      setPkgLoading(false);
      return;
    }

    try {
      setPkgLoading(true);
      setError(null);
      const configuredPurchases = (await getConfiguredPurchases()) as typeof Purchases;
      const offerings = await configuredPurchases.getOfferings();
      const mainOffering = offerings.current ?? offerings.all?.["rc_monthly$"] ?? null;

      if (!mainOffering?.availablePackages?.length) {
        setPackages([]);
        setError("تعذر تحميل خطط المتجر حالياً. تحقق من اتصالك ثم حاول مرة أخرى.");
        return;
      }

      const eligibility: Record<string, { status: number }> =
        Platform.OS === "ios"
          ? await configuredPurchases.checkTrialOrIntroductoryPriceEligibility(
              mainOffering.availablePackages.map((pkg) => pkg.product.identifier),
            ).catch(() => ({}))
          : {};

      const availablePackages = mainOffering.availablePackages.map((pkg): SubscriptionPackage => {
        const product = pkg.product;
        const productId = product.identifier;
        const period = getPeriodType(productId, product.subscriptionPeriod);
        // لا تعرض أو تشترِ عروض التجربة على Android حتى إن بقي العرض في المتجر.
        const paidBasePlan = Platform.OS === "android" ? selectPaidBasePlan(product) : null;
        const introPrice = Platform.OS === "ios" ? product.introPrice : null;
        const iOSEligibility = eligibility[productId]?.status;
        const isIntroEligible =
          Platform.OS === "ios"
            ? iOSEligibility ===
              Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
            : Boolean(introPrice);

        return {
          id: pkg.identifier,
          productId,
          name: product.title,
          description: product.description,
          price: paidBasePlan?.fullPricePhase?.price.formatted ?? product.priceString,
          pricePerMonth: formatMonthlyEquivalent(pkg, period),
          period,
          periodLabel: formatPeriod(product.subscriptionPeriod, period),
          introductoryOffer:
            introPrice && isIntroEligible
              ? {
                  isFree: introPrice.price === 0,
                  duration: formatPeriod(introPrice.period, period),
                  price: introPrice.priceString,
                }
              : null,
          offering: mainOffering,
          package: pkg,
          paidBasePlan,
        };
      }).filter((pkg) => Platform.OS !== "android" || pkg.paidBasePlan !== null);

      if (availablePackages.length === 0) {
        setPackages([]);
        setError("لا تتوفر حاليًا خطة اشتراك مدفوعة مباشرة. يرجى المحاولة لاحقًا.");
        return;
      }

      availablePackages.sort((left, right) => (left.period === "monthly" ? -1 : 1) - (right.period === "monthly" ? -1 : 1));
      setPackages(availablePackages);
    } catch (caughtError) {
      console.error("[Subscription] Failed to load StoreKit offerings:", caughtError);
      setPackages([]);
      setError(caughtError instanceof Error ? caughtError.message : "تعذر تحميل خطط الاشتراك");
    } finally {
      setPkgLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const purchasePackage = useCallback(
    async (pkg: SubscriptionPackage): Promise<boolean> => {
      try {
        setError(null);
        void trackSubscriptionClick(pkg.period, "subscription_screen", profile.country);
        const configuredPurchases = (await getConfiguredPurchases()) as typeof Purchases;
        if (Platform.OS === "ios" && pkg.package.product.introPrice?.price === 0) {
          setError("لا يزال عرض التجربة المجانية متاحًا في App Store. لا يمكن إتمام الاشتراك قبل إيقافه في المتجر.");
          return false;
        }
        // purchasePackage قد يختار عرض Google الترويجي افتراضيًا؛ استخدم رمز الخطة
        // الأساسية مباشرة، ولا تنتقل إلى عرض تجريبي إذا اختفت الخطة من المتجر.
        if (Platform.OS === "android" && !pkg.paidBasePlan) {
          throw new Error("الخطة المدفوعة مباشرة غير متاحة في Google Play.");
        }
        const result = Platform.OS === "android"
          ? await configuredPurchases.purchaseSubscriptionOption(pkg.paidBasePlan!)
          : await configuredPurchases.purchasePackage(pkg.package);
        const entitlement = result.customerInfo.entitlements.active[ENTITLEMENT_ID];

        if (!entitlement) {
          setError("اكتملت عملية المتجر، لكن لم تُفعّل العضوية بعد. استخدم الاستعادة أو تواصل مع الدعم.");
          await refreshSubscription();
          return false;
        }

        await updateProfile({
          isSubscribed: true,
          subscriptionType: pkg.period,
          subscriptionExpiry: entitlement.expirationDate ?? undefined,
        });
        await refreshSubscription();
        return true;
      } catch (caughtError: any) {
        if (
          caughtError?.userCancelled === true ||
          (caughtError instanceof Error && /cancel/i.test(caughtError.message))
        ) {
          return false;
        }

        console.error("[Subscription] Purchase failed:", caughtError);
        setError(caughtError instanceof Error ? caughtError.message : "تعذر إتمام الشراء من المتجر");
        return false;
      }
    },
    [profile.country, refreshSubscription, updateProfile],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const configuredPurchases = (await getConfiguredPurchases()) as typeof Purchases;
      const customerInfo = await configuredPurchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const hasPremium = Boolean(entitlement);

      await updateProfile({
        isSubscribed: hasPremium,
        subscriptionExpiry: entitlement?.expirationDate ?? undefined,
      });
      await refreshSubscription();

      if (!hasPremium) {
        setError("لم نعثر على اشتراك نشط مرتبط بحساب المتجر الحالي.");
      }
      return hasPremium;
    } catch (caughtError) {
      console.error("[Subscription] Restore failed:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "تعذر استعادة المشتريات");
      return false;
    }
  }, [refreshSubscription, updateProfile]);

  return {
    packages,
    isLoading: contextLoading || pkgLoading,
    error,
    isPremium,
    purchasePackage,
    restorePurchases,
    reloadPackages: loadPackages,
  };
}

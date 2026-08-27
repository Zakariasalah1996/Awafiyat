import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { canUseMedicationReminders } from "../lib/feature-access";

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Subscriber-only medication reminders", () => {
  it("allows medication reminders only for active subscribers", () => {
    expect(canUseMedicationReminders(false)).toBe(false);
    expect(canUseMedicationReminders(true)).toBe(true);
  });

  it("guards every direct medication screen with the shared subscription gate", () => {
    const guardedScreens = [
      "app/sections/wellness/medication-home.tsx",
      "app/sections/wellness/medication-setup.tsx",
      "app/sections/wellness/add-medication.tsx",
      "app/sections/wellness/edit-medication.tsx",
    ];

    for (const screenPath of guardedScreens) {
      const source = readProjectFile(screenPath);
      expect(source).toContain("canUseMedicationReminders(isPremium)");
      expect(source).toContain("SubscriptionFeatureGate");
    }
  });

  it("enforces the lock in the data layer and cancels scheduled reminders after access ends", () => {
    const medicationContext = readProjectFile("lib/medication-context.tsx");
    const rootLayout = readProjectFile("app/_layout.tsx");

    expect(medicationContext).toContain(
      "return canUseMedicationReminders(isSubscribed)",
    );
    expect(rootLayout).toContain(
      "isLoading || canUseMedicationReminders(isPremium)",
    );
    expect(rootLayout).toContain("cancelAllMedicationReminders()");
  });
});

describe("RevenueCat StoreKit contract", () => {
  it("selects the public RevenueCat key for the active native store", () => {
    const context = readProjectFile("lib/subscription-context.tsx");

    expect(context).toContain('ios: "appl_');
    expect(context).toContain('android: "goog_');
    expect(context).toContain('Platform.OS === "ios"');
    expect(context).toContain('Platform.OS === "android"');
    expect(context).toContain("Purchases.configure({ apiKey })");
    expect(context).toContain('const ENTITLEMENT_ID = "premium"');
    expect(context).toContain(
      "customerInfo.entitlements.active[ENTITLEMENT_ID]",
    );
    expect(context).toContain("addCustomerInfoUpdateListener");
    expect(context).toContain("removeCustomerInfoUpdateListener");
  });

  it("loads localized StoreKit products and uses verified purchase and restore results", () => {
    const subscriptions = readProjectFile("hooks/use-subscriptions.ts");

    expect(subscriptions).toContain("await getConfiguredPurchases()");
    expect(subscriptions).toContain("offerings.current");
    expect(subscriptions).toContain("product.priceString");
    expect(subscriptions).toContain(
      "checkTrialOrIntroductoryPriceEligibility",
    );
    expect(subscriptions).toContain(
      "configuredPurchases.purchasePackage(pkg.package)",
    );
    expect(subscriptions).toContain(
      "configuredPurchases.restorePurchases()",
    );
    expect(subscriptions).toContain(
      "customerInfo.entitlements.active[ENTITLEMENT_ID]",
    );
    expect(subscriptions).toContain("refreshSubscription()");
  });
});

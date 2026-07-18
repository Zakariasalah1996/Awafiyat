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
    expect(rootLayout).toContain("cancelAllMedicationReminders()")
  });
});

describe("RevenueCat working contract", () => {
  it("keeps the verified premium entitlement and Android SDK configuration", () => {
    const context = readProjectFile("lib/subscription-context.tsx");

    expect(context).toContain('const ENTITLEMENT_ID = "premium"');
    expect(context).toContain(
      "Purchases.configure({ apiKey: REVENUE_CAT_API_KEY })",
    );
    expect(context).toContain(
      "customerInfo.entitlements.active[ENTITLEMENT_ID]",
    );
    expect(context).toContain("addCustomerInfoUpdateListener");
  });

  it("keeps the verified offering plus purchase and restore flows", () => {
    const subscriptions = readProjectFile("hooks/use-subscriptions.ts");

    expect(subscriptions).toContain("offerings.all?.['rc_monthly$']");
    expect(subscriptions).toContain("Purchases.purchasePackage(pkg.package)");
    expect(subscriptions).toContain("Purchases.restorePurchases()");
    expect(subscriptions).toContain(
      "customerInfo.entitlements.active[ENTITLEMENT_ID]",
    );
    expect(subscriptions).toContain("refreshSubscription()")
  });
});

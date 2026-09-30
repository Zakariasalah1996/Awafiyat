import { describe, expect, it } from "vitest";
import fs from "node:fs";
import type { SubscriptionOption } from "react-native-purchases";
import { selectPaidBasePlan } from "../lib/subscription-pricing";

function option(input: { id: string; isBasePlan: boolean; amount: number; freePhase?: boolean }): SubscriptionOption {
  return {
    id: input.id,
    isBasePlan: input.isBasePlan,
    isPrepaid: false,
    freePhase: input.freePhase ? {} : null,
    fullPricePhase: { price: { amountMicros: input.amount, formatted: "$4", currencyCode: "USD" } },
    pricingPhases: [{ price: { amountMicros: input.amount } }],
  } as SubscriptionOption;
}

describe("direct paid subscription without a free trial", () => {
  it("ignores a trial selected as the store default and chooses the billed base plan", () => {
    const trial = option({ id: "monthly:free", isBasePlan: false, amount: 4_000_000, freePhase: true });
    const base = option({ id: "monthly", isBasePlan: true, amount: 4_000_000 });
    expect(selectPaidBasePlan({ subscriptionOptions: [trial, base] })).toBe(base);
  });

  it("fails closed when only trial, free, or prepaid plans exist", () => {
    expect(selectPaidBasePlan({ subscriptionOptions: [option({ id: "trial", isBasePlan: false, amount: 1_000_000, freePhase: true })] })).toBeNull();
    expect(selectPaidBasePlan({ subscriptionOptions: [option({ id: "free", isBasePlan: true, amount: 0 })] })).toBeNull();
    expect(selectPaidBasePlan({ subscriptionOptions: null })).toBeNull();
  });

  it("does not ship AdMob and routes Android purchases directly to the paid base plan", () => {
    const config = fs.readFileSync("app.config.ts", "utf8");
    const hook = fs.readFileSync("hooks/use-subscriptions.ts", "utf8");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const onboarding = fs.readFileSync("app/onboarding.tsx", "utf8");
    expect(config).not.toContain("react-native-google-mobile-ads");
    expect(config).toContain('blockedPermissions: [\n      "com.google.android.gms.permission.AD_ID"');
    expect(pkg.dependencies["react-native-google-mobile-ads"]).toBeUndefined();
    expect(hook).toContain("purchaseSubscriptionOption(pkg.paidBasePlan!)");
    expect(onboarding).not.toContain("3 أيام مجاناً");
  });
});

import type { PurchasesStoreProduct, SubscriptionOption } from "react-native-purchases";

/** Select only a directly billed, recurring Google Play base plan; never fall back to an offer. */
export function selectPaidBasePlan(product: Pick<PurchasesStoreProduct, "subscriptionOptions">): SubscriptionOption | null {
  return product.subscriptionOptions?.find((option) =>
    option.isBasePlan &&
    !option.isPrepaid &&
    option.freePhase == null &&
    option.fullPricePhase != null &&
    option.fullPricePhase.price.amountMicros > 0 &&
    option.pricingPhases.every((phase) => phase.price.amountMicros > 0),
  ) ?? null;
}

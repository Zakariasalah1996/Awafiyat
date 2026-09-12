import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeRewardedAdError,
  type RewardedAdFailureStage,
  type RewardedAdResult,
} from "@/lib/admob-result";

// ============================================================
// نظام الإعلانات - Google AdMob Rewarded Ads
// مخزون أحادي: إعلان واحد صالح لساعة، يعرض مرة واحدة فقط.
// ============================================================

const LIVE_REWARDED_AD_UNIT_ID = "ca-app-pub-9147941153313979/1707506280";
const LOAD_TIMEOUT_MS = 20_000;
const SHOW_TIMEOUT_MS = 180_000;
const AD_CACHE_TTL_MS = 60 * 60 * 1000;

const UNLOCKED_RECIPES_KEY = "@unlocked_recipes";
const UNLOCKED_WARNINGS_KEY = "@unlocked_warnings";

export const FREE_RECIPES_COUNT = 5;
export const FREE_WARNINGS_COUNT = 3;

export async function getUnlockedRecipes(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(UNLOCKED_RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function unlockRecipe(recipeId: string): Promise<void> {
  try {
    const unlocked = await getUnlockedRecipes();
    if (!unlocked.includes(recipeId)) {
      unlocked.push(recipeId);
      await AsyncStorage.setItem(UNLOCKED_RECIPES_KEY, JSON.stringify(unlocked));
    }
  } catch {}
}

export async function isRecipeUnlocked(recipeId: string, recipeIndex: number): Promise<boolean> {
  if (recipeIndex < FREE_RECIPES_COUNT) return true;
  const unlocked = await getUnlockedRecipes();
  return unlocked.includes(recipeId);
}

export async function getUnlockedWarnings(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(UNLOCKED_WARNINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function unlockWarning(warningId: string): Promise<void> {
  try {
    const unlocked = await getUnlockedWarnings();
    if (!unlocked.includes(warningId)) {
      unlocked.push(warningId);
      await AsyncStorage.setItem(UNLOCKED_WARNINGS_KEY, JSON.stringify(unlocked));
    }
  } catch {}
}

export async function isWarningUnlocked(warningId: string, warningIndex: number): Promise<boolean> {
  if (warningIndex < FREE_WARNINGS_COUNT) return true;
  const unlocked = await getUnlockedWarnings();
  return unlocked.includes(warningId);
}

// ============================================================
// تهيئة SDK والمخزون الأحادي
// ============================================================

type StagedAdError = Error & { adMobStage?: RewardedAdFailureStage; code?: string };

let isAdMobInitialized = false;
let adMobInitializationPromise: Promise<void> | null = null;
let cachedRewardedAd: any = null;
let cachedRewardedAdLoadedAt = 0;
let cacheExpiryTimer: ReturnType<typeof setTimeout> | null = null;
let activeLoadPromise: Promise<void> | null = null;
let activeShowPromise: Promise<RewardedAdResult> | null = null;

function createStagedError(
  error: unknown,
  stage: RewardedAdFailureStage,
  fallbackCode = "admob/unknown",
  fallbackMessage = "Unknown Google Mobile Ads error",
): StagedAdError {
  const errorRecord =
    error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const sourceMessage =
    typeof errorRecord?.message === "string" ? errorRecord.message : fallbackMessage;
  const staged: StagedAdError = error instanceof Error
    ? (error as StagedAdError)
    : (Object.assign(new Error(sourceMessage), errorRecord ?? {}, {
        code:
          typeof errorRecord?.code === "string" ? errorRecord.code : fallbackCode,
      }) as StagedAdError);
  staged.adMobStage = stage;
  if (!staged.code) staged.code = fallbackCode;
  return staged;
}

function createTimeoutError(code: string, message: string): StagedAdError {
  return Object.assign(new Error(message), {
    code,
    adMobStage: "timeout" as const,
  });
}

function getErrorStage(error: unknown, fallback: RewardedAdFailureStage): RewardedAdFailureStage {
  if (error && typeof error === "object") {
    const stage = (error as { adMobStage?: RewardedAdFailureStage }).adMobStage;
    if (stage) return stage;
  }
  return fallback;
}

async function initializeAdMob(): Promise<void> {
  if (Platform.OS === "web" || isAdMobInitialized) return;

  if (!adMobInitializationPromise) {
    adMobInitializationPromise = (async () => {
      const admobModule = await import("react-native-google-mobile-ads");
      const { default: mobileAds, MaxAdContentRating } = admobModule;

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
      });
      await mobileAds().initialize();
      isAdMobInitialized = true;
    })();
  }

  try {
    await adMobInitializationPromise;
  } catch (error) {
    adMobInitializationPromise = null;
    throw createStagedError(
      error,
      "initialization",
      "admob/initialization-failed",
      "Google Mobile Ads SDK initialization failed",
    );
  }
}

export async function initializeRewardedAds(): Promise<void> {
  await initializeAdMob();
}

function clearCachedRewardedAd(): void {
  cachedRewardedAd = null;
  cachedRewardedAdLoadedAt = 0;
  if (cacheExpiryTimer) {
    clearTimeout(cacheExpiryTimer);
    cacheExpiryTimer = null;
  }
}

function hasFreshCachedRewardedAd(): boolean {
  if (!cachedRewardedAd || cachedRewardedAdLoadedAt <= 0) return false;
  if (Date.now() - cachedRewardedAdLoadedAt >= AD_CACHE_TTL_MS) {
    clearCachedRewardedAd();
    return false;
  }
  return true;
}

function scheduleCacheExpiry(): void {
  if (cacheExpiryTimer) clearTimeout(cacheExpiryTimer);
  const expiresAt = cachedRewardedAdLoadedAt + AD_CACHE_TTL_MS;
  const delay = Math.max(0, expiresAt - Date.now());

  cacheExpiryTimer = setTimeout(() => {
    clearCachedRewardedAd();
    // Google يوصي بتجديد الإعلان المخزّن بعد ساعة. محاولة واحدة فقط بلا إعادة تلقائية.
    void loadOneRewardedAdIntoCache().catch(() => {});
  }, delay);
}

function cacheRewardedAd(ad: any): void {
  clearCachedRewardedAd();
  cachedRewardedAd = ad;
  cachedRewardedAdLoadedAt = Date.now();
  scheduleCacheExpiry();
}

function takeCachedRewardedAdForShow(): any | null {
  if (!hasFreshCachedRewardedAd()) return null;
  const ad = cachedRewardedAd;
  // الإعلان كامل الشاشة يُعرض مرة واحدة فقط؛ صفّره قبل استدعاء show.
  clearCachedRewardedAd();
  return ad;
}

async function createAndLoadRewardedAd(adUnitId: string): Promise<any> {
  await initializeAdMob();

  const admobModule = await import("react-native-google-mobile-ads");
  const { RewardedAd, RewardedAdEventType, AdEventType } = admobModule;
  const requestNonPersonalizedAdsOnly = Platform.OS === "ios";
  const ad = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly,
  });

  return new Promise<any>((resolve, reject) => {
    let settled = false;
    let unsubscribeLoaded = () => {};
    let unsubscribeError = () => {};

    const cleanup = () => {
      clearTimeout(timeout);
      unsubscribeLoaded();
      unsubscribeError();
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() =>
        reject(createTimeoutError("admob/load-timeout", "Rewarded ad load timed out")),
      );
    }, LOAD_TIMEOUT_MS);

    unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      finish(() => resolve(ad));
    });

    unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error: unknown) => {
      finish(() => reject(createStagedError(error, "load")));
    });

    try {
      // موضع طلب الإعلان الحقيقي الوحيد في التطبيق.
      ad.load();
    } catch (error) {
      finish(() => reject(createStagedError(error, "load")));
    }
  });
}

async function loadOneRewardedAdIntoCache(): Promise<void> {
  if (Platform.OS === "web" || hasFreshCachedRewardedAd()) return;
  if (activeLoadPromise) return activeLoadPromise;

  const loadPromise = (async () => {
    const admobModule = await import("react-native-google-mobile-ads");
    // إعلان Google التجريبي موجود في وضع التطوير فقط؛ الإنتاج لا يطلبه أبداً.
    const adUnitId = __DEV__ ? admobModule.TestIds.REWARDED : LIVE_REWARDED_AD_UNIT_ID;
    const ad = await createAndLoadRewardedAd(adUnitId);
    cacheRewardedAd(ad);
  })();

  activeLoadPromise = loadPromise;
  try {
    await loadPromise;
  } finally {
    if (activeLoadPromise === loadPromise) activeLoadPromise = null;
  }
}

function unavailableResult(
  error: unknown,
  fallbackStage: RewardedAdFailureStage,
): RewardedAdResult {
  const stage = getErrorStage(error, fallbackStage);
  return {
    status: "unavailable",
    error: normalizeRewardedAdError(error, stage),
    // لا نطلق طلب اختبار تلقائياً في الإنتاج؛ الإعلان التجريبي للتطوير فقط.
    sdkHealthy: null,
  };
}

function refillSingleRewardedAd(): void {
  void loadOneRewardedAdIntoCache().catch((error) => {
    const diagnostic = normalizeRewardedAdError(error, getErrorStage(error, "load"));
    console.warn("[AdMob] Single cache refill failed", {
      stage: diagnostic.stage,
      category: diagnostic.category,
      code: diagnostic.code,
      domain: diagnostic.domain,
      responseId: diagnostic.responseId,
    });
  });
}

async function runRewardedAdFlow(): Promise<RewardedAdResult> {
  if (Platform.OS === "web") return { status: "rewarded" };

  try {
    if (!hasFreshCachedRewardedAd()) {
      // إذا كان المخزون فارغاً، تنشئ محاولة المستخدم طلباً واحداً فقط.
      await loadOneRewardedAdIntoCache();
    }

    const ad = takeCachedRewardedAdForShow();
    if (!ad) {
      return unavailableResult(
        createStagedError(
          null,
          "load",
          "admob/not-ready",
          "Rewarded ad is not ready",
        ),
        "load",
      );
    }

    const admobModule = await import("react-native-google-mobile-ads");
    const { RewardedAdEventType, AdEventType } = admobModule;

    return await new Promise<RewardedAdResult>((resolve) => {
      let rewarded = false;
      let settled = false;
      const unsubscribers: Array<() => void> = [];

      const cleanup = () => {
        clearTimeout(showTimeout);
        for (const unsubscribe of unsubscribers) unsubscribe();
      };

      const finish = (result: RewardedAdResult, refillAfterClose = false) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
        if (refillAfterClose) refillSingleRewardedAd();
      };

      const finishWithError = (error: unknown, stage: RewardedAdFailureStage) => {
        finish(unavailableResult(createStagedError(error, stage), stage));
      };

      const showTimeout = setTimeout(() => {
        finishWithError(
          createTimeoutError("admob/show-timeout", "Rewarded ad did not close in time"),
          "timeout",
        );
      }, SHOW_TIMEOUT_MS);

      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          rewarded = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          finish(rewarded ? { status: "rewarded" } : { status: "dismissed" }, true);
        }),
        ad.addAdEventListener(AdEventType.ERROR, (error: unknown) => {
          finishWithError(error, "show");
        }),
      );

      try {
        void Promise.resolve(ad.show()).catch((error) => {
          finishWithError(error, "show");
        });
      } catch (error) {
        finishWithError(error, "show");
      }
    });
  } catch (error) {
    return unavailableResult(error, getErrorStage(error, "load"));
  }
}

/**
 * يعرض Rewarded Ad اختيارياً. الاستدعاءات المتزامنة تشترك في تدفق واحد،
 * ولا يُفتح المحتوى إلا بعد حدث EARNED_REWARD.
 */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (activeShowPromise) return activeShowPromise;

  const showPromise = runRewardedAdFlow();
  activeShowPromise = showPromise;
  try {
    return await showPromise;
  } finally {
    if (activeShowPromise === showPromise) activeShowPromise = null;
  }
}

/** يملأ خانة المخزون بإعلان واحد فقط عند بدء التطبيق. */
export function preloadRewardedAd(): void {
  if (Platform.OS !== "web") refillSingleRewardedAd();
}

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeRewardedAdError,
  type RewardedAdErrorInfo,
  type RewardedAdResult,
} from "@/lib/admob-result";

// ============================================================
// نظام الإعلانات - Google AdMob Rewarded Ads
// المستخدم يختار بنفسه مشاهدة إعلان مقابل فتح محتوى مقفل.
// ============================================================

const LIVE_REWARDED_AD_UNIT_ID = "ca-app-pub-9147941153313979/4919884210";
const LOAD_TIMEOUT_MS = 20_000;
const CONTROL_LOAD_TIMEOUT_MS = 12_000;
const SHOW_TIMEOUT_MS = 180_000;
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000, 120_000];
const INTERACTIVE_RETRY_DELAY_MS = 1_500;
const MAX_INTERACTIVE_LOAD_ATTEMPTS = 2;

// مفاتيح التخزين
const UNLOCKED_RECIPES_KEY = "@unlocked_recipes";
const UNLOCKED_WARNINGS_KEY = "@unlocked_warnings";

// عدد الوصفات المجانية قبل القفل
export const FREE_RECIPES_COUNT = 5;
// عدد التحذيرات المجانية قبل القفل
export const FREE_WARNINGS_COUNT = 3;

// ============================================================
// إدارة المحتوى المفتوح
// ============================================================

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
// تحميل وعرض الإعلان
// ============================================================

let rewardedAd: any = null;
let isAdLoaded = false;
let isAdLoading = false;
let isAdMobInitialized = false;
let adMobInitializationPromise: Promise<void> | null = null;
let activeLoadPromise: Promise<void> | null = null;
let lastLoadError: RewardedAdErrorInfo | null = null;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let controlResultCache: { healthy: boolean; expiresAt: number } | null = null;

function createTimeoutError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

async function initializeAdMob(): Promise<void> {
  if (Platform.OS === "web" || isAdMobInitialized) return;

  // لا تسمح لعدة شاشات أو محاولات تحميل بالبدء بتهيئة SDK متزامنة؛ يحدث ذلك
  // أحياناً عند تشغيل التطبيق ببطء على أجهزة Android المتوسطة ويعيد SDK internal-error.
  if (!adMobInitializationPromise) {
    adMobInitializationPromise = (async () => {
      const admobModule = await import("react-native-google-mobile-ads");
      const { default: mobileAds, MaxAdContentRating } = admobModule;

      // يجب ضبط إعداد الطلب قبل initialize وفق توثيق Google. كما أن إبقاء
      // التهيئة هنا في Promise واحدة يمنع تزامنها مع Firebase Messaging عند الإقلاع.
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
    // اسمح بمحاولة تهيئة جديدة لاحقاً إذا فشلت المحاولة الأولى مؤقتاً.
    adMobInitializationPromise = null;
    throw error;
  }
}

/**
 * يتيح لتدفقات Android الأصلية الأخرى انتظار اكتمال AdMob حتى لا تبدأ
 * Firebase Messaging وGoogle Mobile Ads التهيئة في اللحظة نفسها.
 */
export async function initializeRewardedAds(): Promise<void> {
  await initializeAdMob();
}

async function createAndLoadRewardedAd(adUnitId: string, timeoutMs: number): Promise<any> {
  await initializeAdMob();

  const admobModule = await import("react-native-google-mobile-ads");
  const { RewardedAd, RewardedAdEventType, AdEventType } = admobModule;
  // خصوصية Apple: استخدم طلبات غير مخصصة على iOS فقط؛ يبقى Android بإعداده الحالي.
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
        reject(
          createTimeoutError(
            "admob/load-timeout",
            "Rewarded ad load timed out",
          ),
        ),
      );
    }, timeoutMs);

    unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      finish(() => resolve(ad));
    });

    unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error: unknown) => {
      finish(() => reject(error));
    });

    try {
      ad.load();
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

function scheduleLiveAdRetry(): void {
  if (Platform.OS === "web" || retryTimer) return;

  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void loadRewardedAd().catch(() => {});
  }, delay);
}

async function loadRewardedAd(): Promise<void> {
  if (Platform.OS === "web" || isAdLoaded) return;
  if (activeLoadPromise) return activeLoadPromise;

  activeLoadPromise = (async () => {
    isAdLoading = true;
    try {
      const admobModule = await import("react-native-google-mobile-ads");
      const { TestIds } = admobModule;
      const adUnitId = __DEV__ ? TestIds.REWARDED : LIVE_REWARDED_AD_UNIT_ID;

      rewardedAd = await createAndLoadRewardedAd(adUnitId, LOAD_TIMEOUT_MS);
      isAdLoaded = true;
      lastLoadError = null;
      retryAttempt = 0;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    } catch (error) {
      rewardedAd = null;
      isAdLoaded = false;
      lastLoadError = normalizeRewardedAdError(error);
      console.warn("[AdMob] Rewarded ad unavailable", {
        category: lastLoadError.category,
        code: lastLoadError.code,
      });
      scheduleLiveAdRetry();
      throw error;
    } finally {
      isAdLoading = false;
      activeLoadPromise = null;
    }
  })();

  return activeLoadPromise;
}

async function ensureRewardedAdReady(): Promise<void> {
  let latestError: unknown = null;

  for (let attempt = 1; attempt <= MAX_INTERACTIVE_LOAD_ATTEMPTS; attempt += 1) {
    try {
      await loadRewardedAd();
      return;
    } catch (error) {
      latestError = error;
      const normalized = normalizeRewardedAdError(error);
      const isTransientSdkError =
        normalized.category === "internal" ||
        normalized.category === "network" ||
        normalized.category === "unknown";

      if (!isTransientSdkError || attempt === MAX_INTERACTIVE_LOAD_ATTEMPTS) {
        throw error;
      }

      // أعطِ Google Mobile Ads وقتاً قصيراً بعد فشل عابر قبل عرض رسالة عدم التوفر.
      await new Promise<void>((resolve) => setTimeout(resolve, INTERACTIVE_RETRY_DELAY_MS));
    }
  }

  throw latestError ?? createTimeoutError("admob/not-ready", "Rewarded ad is not ready");
}

async function checkSdkWithGoogleTestInventory(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  if (controlResultCache && controlResultCache.expiresAt > Date.now()) {
    return controlResultCache.healthy;
  }

  try {
    const admobModule = await import("react-native-google-mobile-ads");
    await createAndLoadRewardedAd(
      admobModule.TestIds.REWARDED,
      CONTROL_LOAD_TIMEOUT_MS,
    );
    controlResultCache = { healthy: true, expiresAt: Date.now() + 10 * 60_000 };
    return true;
  } catch {
    controlResultCache = { healthy: false, expiresAt: Date.now() + 2 * 60_000 };
    return false;
  }
}

async function unavailableResult(error: unknown): Promise<RewardedAdResult> {
  const normalized = normalizeRewardedAdError(error);
  const sdkHealthy = __DEV__ ? true : await checkSdkWithGoogleTestInventory();
  return { status: "unavailable", error: normalized, sdkHealthy };
}

function prepareNextRewardedAd(): void {
  rewardedAd = null;
  isAdLoaded = false;
  setTimeout(() => {
    void loadRewardedAd().catch(() => {});
  }, 1_000);
}

/**
 * يعرض Rewarded Ad اختيارياً ولا يفتح المحتوى إلا بعد حدث EARNED_REWARD.
 */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (Platform.OS === "web") return { status: "rewarded" };

  try {
    if (!isAdLoaded) {
      await ensureRewardedAdReady();
    }

    if (!rewardedAd || !isAdLoaded) {
      return unavailableResult(
        lastLoadError ??
          createTimeoutError("admob/not-ready", "Rewarded ad is not ready"),
      );
    }

    const ad = rewardedAd;
    const admobModule = await import("react-native-google-mobile-ads");
    const { RewardedAdEventType, AdEventType } = admobModule;

    return await new Promise<RewardedAdResult>((resolve) => {
      let rewarded = false;
      let settled = false;
      const unsubscribers: Array<() => void> = [];

      const cleanup = () => {
        clearTimeout(showTimeout);
        for (const unsubscribe of unsubscribers) unsubscribe();
        prepareNextRewardedAd();
      };

      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const finishWithError = async (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(await unavailableResult(error));
      };

      const showTimeout = setTimeout(() => {
        void finishWithError(
          createTimeoutError(
            "admob/show-timeout",
            "Rewarded interstitial ad did not close in time",
          ),
        );
      }, SHOW_TIMEOUT_MS);

      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          rewarded = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          finish(rewarded ? { status: "rewarded" } : { status: "dismissed" });
        }),
        ad.addAdEventListener(AdEventType.ERROR, (error: unknown) => {
          void finishWithError(error);
        }),
      );

      try {
        void Promise.resolve(ad.show()).catch((error) => {
          void finishWithError(error);
        });
      } catch (error) {
        void finishWithError(error);
      }
    });
  } catch (error) {
    return unavailableResult(error);
  }
}

// تحميل الإعلان مسبقاً عند بدء التطبيق
export function preloadRewardedAd(): void {
  if (Platform.OS !== "web" && !isAdLoading) {
    void initializeRewardedAds()
      .then(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, 500);
          }),
      )
      .then(() => loadRewardedAd())
      .catch(() => {});
  }
}

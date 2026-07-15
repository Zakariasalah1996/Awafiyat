import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام الإعلانات - Google AdMob Rewarded Ads
// المستخدم يشاهد إعلاناً مقابل فتح محتوى مقفل
// ============================================================

// Ad Unit IDs
const AD_UNIT_ID = Platform.select({
  android: "ca-app-pub-9147941153313979/3701631347",
  ios: "ca-app-pub-9147941153313979/3701631347",
  default: "ca-app-pub-3940256099942544/5224354917", // test fallback
});

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
  // أول FREE_RECIPES_COUNT وصفات مجانية دائماً
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
// تهيئة AdMob SDK - يجب استدعاؤها مرة واحدة عند بدء التطبيق
// ============================================================

let isInitialized = false;

async function initializeAdMob(): Promise<void> {
  if (Platform.OS === "web" || isInitialized) return;
  try {
    const { default: mobileAds } = await import("react-native-google-mobile-ads");
    await mobileAds().initialize();
    isInitialized = true;
    console.log("[AdMob] SDK initialized successfully");
  } catch (e) {
    console.warn("[AdMob] Failed to initialize SDK:", e);
  }
}

// ============================================================
// تحميل وعرض الإعلان
// ============================================================

let rewardedAd: any = null;
let isAdLoaded = false;
let isAdLoading = false;

async function loadRewardedAd(): Promise<void> {
  if (Platform.OS === "web") return;
  if (isAdLoading || isAdLoaded) return;

  try {
    // تأكد من تهيئة SDK أولاً
    if (!isInitialized) {
      await initializeAdMob();
    }

    isAdLoading = true;
    // Dynamic import to avoid web bundling issues
    const admobModule = await import("react-native-google-mobile-ads");
    const { RewardedAd, RewardedAdEventType, TestIds } = admobModule;

    const adUnitId = __DEV__
      ? TestIds.REWARDED
      : (AD_UNIT_ID ?? TestIds.REWARDED);

    rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    await new Promise<void>((resolve, reject) => {
      const unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          isAdLoaded = true;
          isAdLoading = false;
          unsubscribeLoaded();
          resolve();
        }
      );

      const unsubscribeError = rewardedAd.addAdEventListener(
        "error",
        (error: any) => {
          isAdLoaded = false;
          isAdLoading = false;
          rewardedAd = null;
          unsubscribeError();
          reject(error);
        }
      );

      rewardedAd.load();
    });
  } catch (e) {
    isAdLoading = false;
    isAdLoaded = false;
    rewardedAd = null;
    console.warn("[AdMob] Failed to load rewarded ad:", e);
  }
}

/**
 * عرض إعلان Rewarded وانتظار نتيجة المشاهدة
 * @returns true إذا شاهد المستخدم الإعلان كاملاً، false إذا أغلقه
 */
export async function showRewardedAd(): Promise<boolean> {
  if (Platform.OS === "web") return true; // على الويب نفتح مباشرة

  try {
    const admobModule = await import("react-native-google-mobile-ads");
    const { RewardedAdEventType } = admobModule;

    // تحميل الإعلان إذا لم يكن محملاً
    if (!isAdLoaded) {
      await loadRewardedAd();
    }

    if (!rewardedAd || !isAdLoaded) {
      console.warn("[AdMob] Ad not ready, opening content directly");
      return true; // إذا فشل تحميل الإعلان، نفتح المحتوى مباشرة
    }

    return new Promise<boolean>((resolve) => {
      let rewarded = false;

      const unsubscribeEarned = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewarded = true;
          unsubscribeEarned();
        }
      );

      const unsubscribeClosed = rewardedAd.addAdEventListener(
        "closed",
        () => {
          isAdLoaded = false;
          rewardedAd = null;
          unsubscribeClosed();
          // تحميل إعلان جديد للمرة القادمة
          setTimeout(() => loadRewardedAd(), 1000);
          resolve(rewarded);
        }
      );

      rewardedAd.show();
    });
  } catch (e) {
    console.warn("[AdMob] Failed to show rewarded ad:", e);
    return true; // في حالة الخطأ، نفتح المحتوى مباشرة
  }
}

/**
 * تهيئة AdMob وتحميل الإعلان مسبقاً عند بدء التطبيق
 */
export function preloadRewardedAd(): void {
  if (Platform.OS !== "web") {
    // تهيئة SDK أولاً ثم تحميل الإعلان
    initializeAdMob().then(() => {
      setTimeout(() => loadRewardedAd(), 1000);
    }).catch(() => {
      // محاولة تحميل الإعلان حتى لو فشلت التهيئة
      setTimeout(() => loadRewardedAd(), 3000);
    });
  }
}

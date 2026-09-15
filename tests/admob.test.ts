import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

import {
  formatRewardedAdErrorForUser,
  normalizeRewardedAdError,
} from "../lib/admob-result";

function readProjectFile(...parts: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), "utf-8");
}

describe("AdMob rewarded ads", () => {
  it("uses the verified Android App ID and the matching rewarded-ad unit", () => {
    const appConfig = readProjectFile("app.config.ts");
    const admob = readProjectFile("lib", "admob.ts");

    expect(appConfig).toContain(
      'androidAppId: "ca-app-pub-9147941153313979~6652750828"',
    );
    expect(appConfig).not.toContain("ca-app-pub-9147941153313979~2249498498");
    expect(admob).toContain(
      'const LIVE_REWARDED_AD_UNIT_ID = "ca-app-pub-9147941153313979/1707506280"',
    );
    expect(admob).not.toContain("ca-app-pub-9147941153313979/4919884210");
    expect(admob).toContain("RewardedAd.createForAdRequest");
    expect(admob).toContain("TestIds.REWARDED");
    expect(admob).not.toContain("RewardedInterstitialAd");
    expect(admob).not.toContain("REWARDED_INTERSTITIAL");
  });

  it("publishes the active publisher in app-ads.txt", () => {
    const appAds = readProjectFile("server", "public", "app-ads.txt").trim();

    expect(appAds).toBe(
      "google.com, pub-9147941153313979, DIRECT, f08c47fec0942fa0",
    );
    expect(appAds).not.toContain("pub-7512540809552904");
  });

  it("serializes SDK initialization and uses a single one-hour rewarded cache", () => {
    const admob = readProjectFile("lib", "admob.ts");
    const rootLayout = readProjectFile("app", "_layout.tsx");

    expect(admob).toContain("let adMobInitializationPromise: Promise<void> | null = null;");
    expect(admob).toContain("await mobileAds().setRequestConfiguration({");
    expect(admob).toContain("maxAdContentRating: MaxAdContentRating.PG");
    expect(admob).toContain("await adMobInitializationPromise;");
    expect(admob).toContain("export async function initializeRewardedAds(): Promise<void>");
    expect(admob).toContain("const AD_CACHE_TTL_MS = 60 * 60 * 1000;");
    expect(admob).toContain("let cachedRewardedAd: any = null;");
    expect(admob).toContain("function takeCachedRewardedAdForShow(): any | null");
    expect(admob).toContain("clearCachedRewardedAd();");
    expect(admob).toContain("let activeLoadPromise: Promise<void> | null = null;");
    expect(admob).toContain("let activeShowPromise: Promise<RewardedAdResult> | null = null;");
    expect(rootLayout).toContain(".then(({ initializeRewardedAds }) => initializeRewardedAds())");
    expect(rootLayout.indexOf("initializeRewardedAds")).toBeLessThan(
      rootLayout.indexOf("await requestNotificationPermissions()"),
    );
  });

  it("makes one real load call and never probes Google test inventory in production", () => {
    const admob = readProjectFile("lib", "admob.ts");

    expect(admob.match(/ad\.load\(\)/g)).toHaveLength(1);
    expect(admob).toContain("__DEV__ ? admobModule.TestIds.REWARDED : LIVE_REWARDED_AD_UNIT_ID");
    expect(admob).not.toContain("checkSdkWithGoogleTestInventory");
    expect(admob).not.toContain("CONTROL_LOAD_TIMEOUT_MS");
    expect(admob).not.toContain("RETRY_DELAYS_MS");
    expect(admob).not.toContain("MAX_INTERACTIVE_LOAD_ATTEMPTS");
    expect(admob).not.toContain("scheduleLiveAdRetry");
  });

  it("persists Google LoadAdError diagnostics through the Android postinstall bridge patch", () => {
    const packageJson = readProjectFile("package.json");
    const patchScript = readProjectFile("scripts", "patch-google-mobile-ads.mjs");

    expect(packageJson).toContain('"postinstall": "node scripts/patch-google-mobile-ads.mjs"');
    expect(patchScript).toContain('error.putString("domain", loadAdError.domain)');
    expect(patchScript).toContain('error.putInt("nativeCode", loadAdError.code)');
    expect(patchScript).toContain('error.putString("responseId", loadAdError.responseInfo?.responseId)');
    expect(patchScript).toContain('error.putString("responseInfo", loadAdError.responseInfo?.toString())');
    expect(patchScript).toContain('error.putString("cause", loadAdError.cause?.toString())');
  });

  it("uses the RN 0.81-compatible stable SDK and disables concurrent native optimizations", () => {
    const packageJson = readProjectFile("package.json");
    const appConfig = readProjectFile("app.config.ts");

    expect(packageJson).toContain('"react-native-google-mobile-ads": "15.8.3"');
    expect(appConfig).toContain("optimizeInitialization: false");
    expect(appConfig).toContain("optimizeAdLoading: false");
  });

  it("includes AD_ID permission and ProGuard keep rules for AdMob", () => {
    const appConfig = readProjectFile("app.config.ts");

    expect(appConfig).toContain("com.google.android.gms.permission.AD_ID");
    expect(appConfig).toContain("-keep class com.google.android.gms.ads.**");
    expect(appConfig).toContain("-dontwarn com.google.android.gms.ads.**");
  });

  it("does not request Android full-screen intent permission", () => {
    const appConfig = readProjectFile("app.config.ts");
    expect(appConfig).not.toContain("USE_FULL_SCREEN_INTENT");
  });

  it("blocks unused Android foreground audio-service permissions", () => {
    const appConfig = readProjectFile("app.config.ts");
    const packageJson = readProjectFile("package.json");
    const alarmContext = readProjectFile("lib", "alarm-context.tsx");

    expect(appConfig).toContain("blockedPermissions");
    expect(appConfig).toContain('"android.permission.FOREGROUND_SERVICE"');
    expect(appConfig).toContain('"android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"');
    expect(appConfig).toContain('"android.permission.FOREGROUND_SERVICE_MICROPHONE"');
    expect(packageJson).not.toContain('"expo-audio"');
    expect(packageJson).not.toContain('"expo-alarm-module"');
    expect(alarmContext).toContain("Notifications.scheduleNotificationAsync");
    expect(alarmContext).not.toContain("expo-audio");
  });

  it("classifies no-fill without treating it as a configuration failure", () => {
    const result = normalizeRewardedAdError(
      {
        code: "googleMobileAds/error-code-no-fill",
        message: "No ad returned because of lack of ad inventory",
        userInfo: {
          domain: "com.google.android.gms.ads",
          nativeCode: 3,
          responseId: "response-123",
        },
      },
      "load",
    );

    expect(result.category).toBe("no-fill");
    expect(result.stage).toBe("load");
    expect(result.domain).toBe("com.google.android.gms.ads");
    expect(result.nativeErrorCode).toBe("3");
    expect(result.responseId).toBe("response-123");
    expect(result.retryable).toBe(true);
    expect(formatRewardedAdErrorForUser(result, null)).toContain("مرحلة الفشل: تحميل الإعلان");
    expect(formatRewardedAdErrorForUser(result, true)).toContain(result.code);
  });

  it("classifies network and configuration failures separately", () => {
    expect(
      normalizeRewardedAdError({ code: "googleMobileAds/network-error", message: "Network offline" })
        .category,
    ).toBe("network");
    expect(
      normalizeRewardedAdError({
        code: "googleMobileAds/invalid-request",
        message: "The Google Mobile Ads SDK was initialized incorrectly because of App ID",
      }).category,
    ).toBe("configuration");
  });

  it("unlocks content only for the rewarded result in every consumer", () => {
    const component = readProjectFile("components", "watch-ad-to-unlock.tsx");
    const handler = component.slice(component.indexOf("async function handleWatchAd"));
    const rewardedBranch = handler.indexOf('if (result.status === "rewarded")');
    const unlockCall = handler.indexOf("onUnlocked();", rewardedBranch);
    const dismissedBranch = handler.indexOf('if (result.status === "dismissed")');

    expect(rewardedBranch).toBeGreaterThanOrEqual(0);
    expect(unlockCall).toBeGreaterThan(rewardedBranch);
    expect(unlockCall).toBeLessThan(dismissedBranch);

    const consumers = [
      ["app", "sections", "fridge.tsx"],
      ["app", "sections", "leftovers-renew.tsx"],
      ["app", "sections", "recipe-detail.tsx"],
      ["app", "sections", "recipes-library.tsx"],
      ["components", "watch-ad-to-unlock.tsx"],
    ];

    for (const file of consumers) {
      const source = readProjectFile(...file);
      expect(source).toContain('result.status === "rewarded"');
      expect(source).not.toContain("const rewarded = await showRewardedAd()");
      expect(source).not.toContain("if (rewarded)");
      expect(source).not.toContain("في حالة فشل الإعلان، نفتح مباشرة");
    }

    expect(readProjectFile("lib", "admob.ts")).not.toContain(
      "Ad not ready, opening content directly",
    );
  });

  it("keeps Apple tracking changes isolated from Android ad requests", () => {
    const appConfig = readProjectFile("app.config.ts");
    const admob = readProjectFile("lib", "admob.ts");

    expect(appConfig).not.toContain("userTrackingUsageDescription");
    expect(admob).toContain(
      'const requestNonPersonalizedAdsOnly = Platform.OS === "ios";',
    );
    expect(admob).toContain("requestNonPersonalizedAdsOnly,");
  });
});

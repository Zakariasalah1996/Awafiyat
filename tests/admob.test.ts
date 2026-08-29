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
      'const LIVE_REWARDED_AD_UNIT_ID = "ca-app-pub-9147941153313979/4919884210"',
    );
    expect(admob).toContain("RewardedAd.createForAdRequest");
    expect(admob).toContain("TestIds.REWARDED");
    expect(admob).not.toContain("RewardedInterstitialAd");
    expect(admob).not.toContain("REWARDED_INTERSTITIAL");
  });

  it("publishes the new company publisher in app-ads.txt", () => {
    const appAds = readProjectFile("server", "public", "app-ads.txt").trim();

    expect(appAds).toBe(
      "google.com, pub-7512540809552904, DIRECT, f08c47fec0942fa0",
    );
    expect(appAds).not.toContain("pub-9147941153313979");
  });

  it("serializes SDK initialization and retries transient interactive-load failures", () => {
    const admob = readProjectFile("lib", "admob.ts");
    const rootLayout = readProjectFile("app", "_layout.tsx");

    expect(admob).toContain("let adMobInitializationPromise: Promise<void> | null = null;");
    expect(admob).toContain("await mobileAds().setRequestConfiguration({");
    expect(admob).toContain("maxAdContentRating: MaxAdContentRating.PG");
    expect(admob).toContain("await adMobInitializationPromise;");
    expect(admob).toContain("export async function initializeRewardedAds(): Promise<void>");
    expect(admob).toContain("async function ensureRewardedAdReady(): Promise<void>");
    expect(admob).toContain("const MAX_INTERACTIVE_LOAD_ATTEMPTS = 2;");
    expect(admob).toContain("normalized.category === \"internal\"");
    expect(admob).toContain("await ensureRewardedAdReady();");
    expect(rootLayout).toContain(".then(({ initializeRewardedAds }) => initializeRewardedAds())");
    expect(rootLayout.indexOf("initializeRewardedAds")).toBeLessThan(
      rootLayout.indexOf("await requestNotificationPermissions()"),
    );
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

  it("classifies no-fill without treating it as a configuration failure", () => {
    const result = normalizeRewardedAdError({
      code: "googleMobileAds/error-code-no-fill",
      message: "No ad returned because of lack of ad inventory",
    });

    expect(result.category).toBe("no-fill");
    expect(result.retryable).toBe(true);
    expect(formatRewardedAdErrorForUser(result, true)).toContain("الاتصال بخدمة الإعلانات سليم");
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

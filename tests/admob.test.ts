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
  it("uses the verified Android App ID and matching rewarded-interstitial unit", () => {
    const appConfig = readProjectFile("app.config.ts");
    const admob = readProjectFile("lib", "admob.ts");

    expect(appConfig).toContain(
      'androidAppId: "ca-app-pub-9147941153313979~6652750828"',
    );
    expect(appConfig).not.toContain("ca-app-pub-9147941153313979~2249498498");
    expect(admob).toContain(
      'const LIVE_REWARDED_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-9147941153313979/3701631347"',
    );
    expect(admob).toContain("RewardedInterstitialAd.createForAdRequest");
    expect(admob).toContain("TestIds.REWARDED_INTERSTITIAL");
    expect(admob).not.toContain("TestIds.REWARDED :");
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
});

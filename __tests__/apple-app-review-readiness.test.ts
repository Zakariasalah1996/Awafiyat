import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectPath = (...segments: string[]) => path.join(process.cwd(), ...segments);
const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(projectPath(relativePath), "utf8");

function readPngDimensions(relativePath: string) {
  const buffer = fs.readFileSync(projectPath(relativePath));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(buffer.subarray(0, 8)).toEqual(pngSignature);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("Apple App Review readiness", () => {
  it("removes unused background playback and recording capabilities", () => {
    const config = readProjectFile("app.config.ts");

    expect(config).toContain('buildNumber: "84"');
    expect(config).toContain("supportsTablet: true");
    expect(config).not.toContain('"expo-video"');
    expect(config).not.toContain("supportsBackgroundPlayback");
    expect(config).not.toContain("supportsPictureInPicture");
    expect(config).toContain("microphonePermission: false");
    expect(config).toContain("recordAudioAndroid: false");
    expect(config).not.toContain("UIBackgroundModes");
  });

  it("uses one paywall implementation for both subscription routes", () => {
    const tabRoute = readProjectFile("app/(tabs)/subscription.tsx");
    const directRoute = readProjectFile("app/subscription.tsx");
    const expectedExport =
      'export { default } from "@/components/storekit-subscription-screen";';

    expect(tabRoute.trim()).toBe(expectedExport);
    expect(directRoute.trim()).toBe(expectedExport);
  });

  it("exposes localized StoreKit prices, restore, management, renewal, and legal disclosures", () => {
    const paywall = readProjectFile("components/storekit-subscription-screen.tsx");

    expect(paywall).toContain("pkg.price");
    expect(paywall).toContain("pkg.periodLabel");
    expect(paywall).toContain("استعادة المشتريات السابقة");
    expect(paywall).toContain("إدارة الاشتراك");
    expect(paywall).toContain("يتجدد الاشتراك تلقائياً");
    expect(paywall).toContain("PRIVACY_URL");
    expect(paywall).toContain("TERMS_URL");
    expect(paywall).toContain("APPLE_STANDARD_EULA_URL");
    expect(paywall).toContain("useWindowDimensions");
    expect(paywall).toContain("width >= 700");

    const plansPosition = paywall.indexOf("{isLoading ? (");
    const featuresPosition = paywall.indexOf(
      "<View style={[styles.featuresCard",
    );
    expect(plansPosition).toBeGreaterThan(-1);
    expect(featuresPosition).toBeGreaterThan(plansPosition);

    expect(paywall).not.toMatch(/(?:4[,،]?000|5[,،]?000|50[,،]?000)\s*(?:د\.?ع|دينار|ر\.?س|ريال|\$)/u);
  });

  it("keeps iPad purchase, restore, dismissal, and back controls wired without dead ends", () => {
    const paywall = readProjectFile("components/storekit-subscription-screen.tsx");

    expect(paywall).toContain("width >= 700");
    expect(paywall).toContain("onPress={() => startPurchase(pkg)}");
    expect(paywall).toContain("onConfirm={() => void confirmPurchase()}");
    expect(paywall).toContain("onPress={() => void handleRestore()}");
    expect(paywall).toContain("onRequestClose={onClose}");
    expect(paywall).toContain("onPress={onClose}");
    expect(paywall).toContain("router.canGoBack()");
    expect(paywall).toContain("onPress={() => router.back()}");
    expect(paywall).toContain("maxWidth: 820");
    expect(paywall).toContain("maxWidth: 720");
  });

  it("links the paywall to stable public privacy and subscription terms pages", () => {
    const paywall = readProjectFile("components/storekit-subscription-screen.tsx");

    expect(paywall).toContain("https://www.afiyatltd.co.uk/privacy");
    expect(paywall).toContain("https://www.afiyatltd.co.uk/terms");
    expect(paywall).toContain(
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    );
    expect(paywall).not.toContain("https://alfafiyat.com/?legal=");
  });

  it("keeps both IAP promotional images as exact square PNG assets", () => {
    const monthly = readPngDimensions(
      "app-store-assets/awafiyat-monthly-iap-1024.png",
    );
    const annual = readPngDimensions(
      "app-store-assets/awafiyat-annual-iap-1024.png",
    );

    expect(monthly).toEqual({ width: 1024, height: 1024 });
    expect(annual).toEqual({ width: 1024, height: 1024 });
  });
});

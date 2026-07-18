import fs from "node:fs";

const configText = fs.readFileSync(new URL("../app.config.ts", import.meta.url), "utf8");
const easConfig = JSON.parse(
  fs.readFileSync(new URL("../eas.json", import.meta.url), "utf8"),
);
const admobText = fs.readFileSync(new URL("../lib/admob.ts", import.meta.url), "utf8");

const checks = {
  appName: configText.includes('appName: "ألف عافيات"'),
  androidPackage: configText.includes('const rawBundleId = "io.awafiyat.health"'),
  easProject: configText.includes("ac8a9414-c049-43f6-aa26-4647b61e4d28"),
  firebaseConfig: configText.includes('googleServicesFile: "./google-services.json"'),
  versionName: configText.includes('version: "1.0.78"'),
  androidVersionCode: configText.includes("versionCode: 78"),
  admobAndroidAppId: configText.includes(
    'androidAppId: "ca-app-pub-9147941153313979~2249498498"',
  ),
  rewardedProductionUnit: admobText.includes(
    "ca-app-pub-9147941153313979/3701631347",
  ),
  rewardedEnvironmentPolicy: admobText.includes(
    "const adUnitId = __DEV__ ? TestIds.REWARDED : (AD_UNIT_ID ?? TestIds.REWARDED)",
  ),
  previewBuildsApk: easConfig.build?.preview?.android?.buildType === "apk",
  productionBuildsApk: easConfig.build?.production?.android?.buildType === "apk",
};

console.log(JSON.stringify(checks, null, 2));

if (Object.values(checks).some((value) => !value)) {
  process.exitCode = 1;
}

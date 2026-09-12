import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(
  projectRoot,
  "node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsFullScreenAdModule.kt",
);

if (!fs.existsSync(target)) {
  throw new Error(`AdMob Android bridge was not found: ${target}`);
}

const source = fs.readFileSync(target, "utf8");
const diagnosticMarker = 'error.putInt("nativeCode", loadAdError.code)';

if (source.includes(diagnosticMarker)) {
  console.log("AdMob LoadAdError diagnostics are already installed.");
  process.exit(0);
}

const originalBlock = `      error.putString("code", codeAndMessage[0])
      error.putString("message", codeAndMessage[1])
      sendAdEvent(`;
const diagnosticBlock = `      error.putString("code", codeAndMessage[0])
      error.putString("message", codeAndMessage[1])
      error.putString("domain", loadAdError.domain)
      error.putInt("nativeCode", loadAdError.code)
      error.putString("responseId", loadAdError.responseInfo?.responseId)
      error.putString("responseInfo", loadAdError.responseInfo?.toString())
      error.putString("cause", loadAdError.cause?.toString())
      sendAdEvent(`;

if (!source.includes(originalBlock)) {
  throw new Error("Unsupported react-native-google-mobile-ads Android bridge layout.");
}

fs.writeFileSync(target, source.replace(originalBlock, diagnosticBlock), "utf8");
console.log("Installed AdMob LoadAdError diagnostics in the Android bridge.");

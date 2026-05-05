/**
 * Expo Config Plugin: withOverlayPermission
 * يضيف صلاحية SYSTEM_ALERT_WINDOW (الظهور في الأعلى) إلى AndroidManifest.xml
 * هذه الصلاحية ضرورية لعرض شاشة المنبه فوق الشاشة المقفلة
 */
const { withAndroidManifest } = require("@expo/config-plugins");

const withOverlayPermission = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // إضافة صلاحية SYSTEM_ALERT_WINDOW إذا لم تكن موجودة
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const hasOverlay = manifest["uses-permission"].some(
      (p) => p.$?.["android:name"] === "android.permission.SYSTEM_ALERT_WINDOW"
    );

    if (!hasOverlay) {
      manifest["uses-permission"].push({
        $: { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" },
      });
      console.log("[withOverlayPermission] Added SYSTEM_ALERT_WINDOW permission");
    }

    return config;
  });
};

module.exports = withOverlayPermission;

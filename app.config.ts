// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "io.awafiyat.health";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const isEasIosBuild = process.env.EAS_BUILD_PLATFORM === "ios";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "ألف عافيات",
  appSlug: "awafiyat",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663550643615/dcsFJGGHCktKMQSj.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: isEasIosBuild ? "1.0.61" : "1.0.86",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "84",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFF1DC",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    versionCode: 10065,
    googleServicesFile: "./google-services.json",
    permissions: [
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "com.google.android.gms.permission.AD_ID",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        "sounds": ["./assets/notification_female.mp3", "./assets/notification_male.mp3", "./assets/medication_reminder.mp3", "./assets/water_reminder.mp3"]
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "السماح لألف عافيات باختيار صورة طبق لنشرها في مجتمع الطبخ.",
        cameraPermission: "السماح لألف عافيات بالتقاط صورة طبق لنشرها في مجتمع الطبخ.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FFF1DC",
        dark: {
          backgroundColor: "#FFF1DC",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          // منع R8/ProGuard من إزالة كلاسات AdMob الداخلية في بناء الإنتاج
          extraProguardRules: "-keep class com.google.android.gms.ads.** { *; }\n-keep class com.google.ads.** { *; }\n-keep class com.google.android.gms.common.** { *; }\n-dontwarn com.google.android.gms.ads.**",
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-9147941153313979~6652750828",
        iosAppId: "ca-app-pub-9147941153313979~6652750828",
        skAdNetworkItems: [],
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "ac8a9414-c049-43f6-aa26-4647b61e4d28",
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;

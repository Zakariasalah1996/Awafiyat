import config from "../app.config.ts";

const expoConfig = config.default ?? config;
const requiredPermission = "com.google.android.gms.permission.AD_ID";
const forbiddenForegroundPermissions = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
];
const permissions = expoConfig.android?.permissions ?? [];
const blockedPermissions = expoConfig.android?.blockedPermissions ?? [];

if (!permissions.includes(requiredPermission)) {
  console.error(`Missing required Android permission: ${requiredPermission}`);
  process.exit(1);
}

if (expoConfig.android?.package !== "io.awafiyat.health") {
  console.error(`Unexpected Android package: ${expoConfig.android?.package}`);
  process.exit(1);
}

if ((expoConfig.android?.versionCode ?? 0) <= 10070) {
  console.error(`Android versionCode must exceed 10070; found ${expoConfig.android?.versionCode}`);
  process.exit(1);
}

const missingBlockedPermissions = forbiddenForegroundPermissions.filter(
  (permission) => !blockedPermissions.includes(permission),
);

if (missingBlockedPermissions.length > 0) {
  console.error(`Foreground-service permissions must be blocked: ${missingBlockedPermissions.join(", ")}`);
  process.exit(1);
}

console.log(JSON.stringify({
  version: expoConfig.version,
  versionCode: expoConfig.android?.versionCode,
  package: expoConfig.android?.package,
  adIdPermission: requiredPermission,
  permissions,
  blockedPermissions,
}, null, 2));

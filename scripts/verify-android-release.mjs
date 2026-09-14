import config from "../app.config.ts";

const expoConfig = config.default ?? config;
const requiredPermission = "com.google.android.gms.permission.AD_ID";
const permissions = expoConfig.android?.permissions ?? [];

if (!permissions.includes(requiredPermission)) {
  console.error(`Missing required Android permission: ${requiredPermission}`);
  process.exit(1);
}

if (expoConfig.android?.package !== "io.awafiyat.health") {
  console.error(`Unexpected Android package: ${expoConfig.android?.package}`);
  process.exit(1);
}

if ((expoConfig.android?.versionCode ?? 0) <= 10069) {
  console.error(`Android versionCode must exceed 10069; found ${expoConfig.android?.versionCode}`);
  process.exit(1);
}

console.log(JSON.stringify({
  version: expoConfig.version,
  versionCode: expoConfig.android?.versionCode,
  package: expoConfig.android?.package,
  adIdPermission: requiredPermission,
  permissions,
}, null, 2));

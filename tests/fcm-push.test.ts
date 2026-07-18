import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function readProjectFile(...parts: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), "utf-8");
}

describe("FCM and Expo push notification setup", () => {
  it("uses the production Android package in app and Firebase configuration", () => {
    const appConfig = readProjectFile("app.config.ts");
    const googleServices = JSON.parse(readProjectFile("google-services.json"));

    expect(appConfig).toContain('const rawBundleId = "io.awafiyat.health"');
    expect(googleServices.client.some((client: any) =>
      client.client_info?.android_client_info?.package_name === "io.awafiyat.health",
    )).toBe(true);
  });

  it("uses the immutable EAS project id when requesting an Expo token", () => {
    const notifications = readProjectFile("lib", "notifications.ts");

    const deviceTokenIndex = notifications.indexOf("getDevicePushTokenAsync");
    const expoTokenIndex = notifications.indexOf("getExpoPushTokenAsync");
    expect(deviceTokenIndex).toBeGreaterThan(-1);
    expect(expoTokenIndex).toBeGreaterThan(deviceTokenIndex);
    expect(notifications).toContain("Constants.expoConfig?.extra?.eas?.projectId");
    expect(notifications).toContain("getExpoPushTokenAsync({ projectId })");
    expect(notifications).toContain('`fcm:${fcmToken}`');
  });

  it("registers device and country metadata with the push token", () => {
    const notifications = readProjectFile("lib", "notifications.ts");
    expect(notifications).toContain("getDeviceId()");
    expect(notifications).toContain("token, userId: finalUserId, platform, deviceId, country");
  });

  it("routes Expo and FCM tokens through their matching providers", () => {
    const server = readProjectFile("server", "_core", "index.ts");
    expect(server).toContain("fcm.googleapis.com/v1/projects/");
    expect(server).toContain("exp.host/--/api/v2/push/send");
    expect(server).toContain("sendPushViaFCM");
    expect(server).toContain("token.startsWith('fcm:')");
    expect(server).toContain("token.substring(4)");
    expect(server).toContain("/^(Exponent|Expo)PushToken");
  });

  it("uses PostgreSQL for Render push registration and admin notification history", () => {
    const server = readProjectFile("server", "_core", "index.ts");
    const pushStore = readProjectFile("server", "push-store.ts");

    expect(server).toContain("pushStore.savePostgresPushToken");
    expect(server).toContain("pushStore.getPostgresActivePushTokens");
    expect(server).toContain("pushStore.createPostgresAdminNotification");
    expect(pushStore).toContain("ON CONFLICT (token) DO UPDATE");
    expect(pushStore).toContain('const PUSH_TOKEN_TABLE = "awafiyat_push_tokens"');
    expect(pushStore).toContain("CREATE TABLE IF NOT EXISTS ${PUSH_TOKEN_TABLE}");
  });

  it("preserves valid Expo tokens during cleanup", () => {
    const server = readProjectFile("server", "_core", "index.ts");
    expect(server).not.toContain("token LIKE 'ExponentPushToken%'");
    expect(server).toContain("cleanupPostgresPushTokens");
  });

  it("does not expose any DATABASE_URL prefix through health endpoints", () => {
    const server = readProjectFile("server", "_core", "index.ts");
    expect(server).not.toContain("url_prefix");
    expect(server).not.toContain("db_prefix");
    expect(server).not.toContain("dbUrl.substring");
  });

  it("creates a normal-priority Android channel for admin updates", () => {
    const notifications = readProjectFile("lib", "notifications.ts");
    const server = readProjectFile("server", "_core", "index.ts");

    expect(notifications).toContain('setNotificationChannelAsync("admin_updates"');
    expect(notifications).toContain("Notifications.AndroidImportance.DEFAULT");
    expect(server).toContain("priority: 'normal'");
    expect(server).toContain("channel_id: 'admin_updates'");
  });
});

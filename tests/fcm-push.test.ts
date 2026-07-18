import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("FCM Push Notification Setup", () => {
  it("firebase service account file exists", () => {
    const saPath = path.join(process.cwd(), "server", "firebase-service-account.json");
    expect(fs.existsSync(saPath)).toBe(true);
  });

  it("firebase service account has correct project_id", () => {
    const saPath = path.join(process.cwd(), "server", "firebase-service-account.json");
    const sa = JSON.parse(fs.readFileSync(saPath, "utf-8"));
    expect(sa.project_id).toBe("awafiyat");
    expect(sa.client_email).toContain("firebase-adminsdk");
    expect(sa.private_key).toBeTruthy();
  });

  it("google-services.json exists and has correct package", () => {
    const gsPath = path.join(process.cwd(), "google-services.json");
    expect(fs.existsSync(gsPath)).toBe(true);
    const gs = JSON.parse(fs.readFileSync(gsPath, "utf-8"));
    expect(gs.project_info.project_id).toBe("awafiyat");
    expect(gs.client[0].client_info.android_client_info.package_name).toBe(
      "space.manus.awafiyat.t20260413170437"
    );
  });

  it("notifications.ts uses getDevicePushTokenAsync as primary method", () => {
    const notifPath = path.join(process.cwd(), "lib", "notifications.ts");
    const content = fs.readFileSync(notifPath, "utf-8");
    
    // PRIMARY should be getDevicePushTokenAsync (FCM direct)
    const deviceTokenIndex = content.indexOf("getDevicePushTokenAsync");
    const expoTokenIndex = content.indexOf("getExpoPushTokenAsync");
    
    // getDevicePushTokenAsync should appear first in the function
    expect(deviceTokenIndex).toBeGreaterThan(-1);
    expect(expoTokenIndex).toBeGreaterThan(-1);
    expect(deviceTokenIndex).toBeLessThan(expoTokenIndex);
    
    // Should prefix FCM tokens with "fcm:"
    expect(content).toContain('`fcm:${fcmToken}`');
  });

  it("server index.ts uses FCM V1 API for sending", () => {
    const indexPath = path.join(process.cwd(), "server", "_core", "index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    
    // Should have FCM V1 API endpoint (uses template literal with projectId variable)
    expect(content).toContain("fcm.googleapis.com/v1/projects/");
    expect(content).toContain("/messages:send");
    
    // Should have sendPushViaFCM function
    expect(content).toContain("sendPushViaFCM");
    
    // Should have getFCMAccessToken function
    expect(content).toContain("getFCMAccessToken");
    
    // Should import GoogleAuth
    expect(content).toContain("GoogleAuth");
    
    // The admin notifications/send endpoint should use sendPushViaFCM
    expect(content).toContain("await sendPushViaFCM(tokens, title, body)");
  });

  it("server index.ts no longer sends all tokens via Expo Push API only", () => {
    const indexPath = path.join(process.cwd(), "server", "_core", "index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    
    // The old pattern of sending ALL tokens to exp.host should be replaced
    // There should NOT be a direct exp.host call in the notifications/send handler
    // (it should go through sendPushViaFCM which handles routing)
    const sendEndpointStart = content.indexOf("app.post('/api/admin/notifications/send'");
    const sendEndpointEnd = content.indexOf("res.json({ success: true, sentCount:", sendEndpointStart);
    const sendBlock = content.substring(sendEndpointStart, sendEndpointEnd);
    
    // The send block should NOT contain direct exp.host call
    expect(sendBlock).not.toContain("exp.host/--/api/v2/push/send");
    
    // It should use sendPushViaFCM instead
    expect(sendBlock).toContain("sendPushViaFCM");
  });

  it("cleanup endpoint removes ExponentPushToken entries", () => {
    const indexPath = path.join(process.cwd(), "server", "_core", "index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    
    // Cleanup should delete ExponentPushToken entries
    expect(content).toContain("ExponentPushToken%");
  });

  it("FCM token format is correctly handled in sendPushViaFCM", () => {
    const indexPath = path.join(process.cwd(), "server", "_core", "index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    
    // Should strip fcm: prefix before sending to FCM API
    expect(content).toContain("token.startsWith('fcm:')");
    expect(content).toContain("token.substring(4)");
  });
});

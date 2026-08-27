import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("Production admin and API integration", () => {
  it("routes the mobile app and admin panel through alfafiyat.com", () => {
    const oauth = read("constants", "oauth.ts");
    const admin = read("server", "admin", "index.html");
    expect(oauth).toContain('return "https://alfafiyat.com"');
    expect(admin).toContain("const API_BASE = window.location.origin");
    expect(`${oauth}\n${admin}`).not.toContain("awafiyat.onrender.com");
  });

  it("serves the final recipes array to the admin API", () => {
    const recipesApi = read("server", "admin", "recipes-api.ts");
    expect(recipesApi).toContain('import { RECIPES } from "../../lib/data/recipes"');
    expect(recipesApi).toContain("return RECIPES.map");
    expect(recipesApi).toContain("return RECIPES.length;");
  });

  it("exposes community reports in the admin API and dashboard", () => {
    const server = read("server", "_core", "index.ts");
    const database = read("server", "db.ts");
    const admin = read("server", "admin", "index.html");
    expect(server).toContain("/api/admin/community-reports");
    expect(server).toContain("/api/admin/community-reports/:id/hide");
    expect(database).toContain("getCommunityReportsForAdmin");
    expect(database).toContain("hideCommunityReportTarget");
    expect(admin).toContain('data-page="community-moderation"');
    expect(admin).toContain("loadCommunityReports");
    expect(admin).toContain("بلاغات المنشورات والتعليقات");
  });

  it("uses Expo Push first while keeping a correctly prefixed FCM fallback", () => {
    const notifications = read("lib", "notifications.ts");
    const expoIndex = notifications.indexOf("getExpoPushTokenAsync");
    const nativeIndex = notifications.indexOf("getDevicePushTokenAsync");
    expect(expoIndex).toBeGreaterThan(-1);
    expect(nativeIndex).toBeGreaterThan(expoIndex);
    expect(notifications).toContain('`fcm:${nativeToken}`');
    const server = read("server", "_core", "index.ts");
    expect(server).toContain("!expoTokenPattern.test(token)");
  });
});

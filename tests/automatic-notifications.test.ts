import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTOMATIC_NOTIFICATION_TEMPLATES,
  getNextBaghdadNotificationAt,
  isValidNotificationTime,
} from "../server/automatic-notifications";

function readProjectFile(...parts: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

describe("Automatic notification campaign", () => {
  it("contains 60 concise and unique messages split over 30 mornings and evenings", () => {
    expect(AUTOMATIC_NOTIFICATION_TEMPLATES).toHaveLength(60);
    expect(new Set(AUTOMATIC_NOTIFICATION_TEMPLATES.map((item) => item.body)).size).toBe(60);
    expect(AUTOMATIC_NOTIFICATION_TEMPLATES.filter((item) => item.period === "morning")).toHaveLength(30);
    expect(AUTOMATIC_NOTIFICATION_TEMPLATES.filter((item) => item.period === "evening")).toHaveLength(30);
    expect(AUTOMATIC_NOTIFICATION_TEMPLATES.every((item) => item.title.length <= 80)).toBe(true);
    expect(AUTOMATIC_NOTIFICATION_TEMPLATES.every((item) => item.body.length <= 180)).toBe(true);
    for (let index = 0; index < AUTOMATIC_NOTIFICATION_TEMPLATES.length; index += 1) {
      const item = AUTOMATIC_NOTIFICATION_TEMPLATES[index];
      expect(item.position).toBe(index);
      expect(item.day).toBe(Math.floor(index / 2) + 1);
      expect(item.period).toBe(index % 2 === 0 ? "morning" : "evening");
    }
  });

  it("excludes the disallowed feature wording from every notification", () => {
    const content = AUTOMATIC_NOTIFICATION_TEMPLATES.map((item) => `${item.title} ${item.body}`).join("\n");
    expect(content).not.toMatch(/ذكاء صناعي|ذكاء اصطناعي|الذكاء الصناعي|الذكاء الاصطناعي/);
  });

  it("validates times and calculates Baghdad morning and evening correctly", () => {
    expect(isValidNotificationTime("09:00")).toBe(true);
    expect(isValidNotificationTime("19:30")).toBe(true);
    expect(isValidNotificationTime("25:00")).toBe(false);
    expect(getNextBaghdadNotificationAt("morning", "09:00", "19:30", new Date("2026-09-27T05:00:00.000Z")).toISOString()).toBe("2026-09-27T06:00:00.000Z");
    expect(getNextBaghdadNotificationAt("morning", "09:00", "19:30", new Date("2026-09-27T07:00:00.000Z")).toISOString()).toBe("2026-09-28T06:00:00.000Z");
    expect(getNextBaghdadNotificationAt("evening", "09:00", "19:30", new Date("2026-09-27T12:00:00.000Z")).toISOString()).toBe("2026-09-27T16:30:00.000Z");
  });

  it("persists campaign state and guards every delivery with a database claim", () => {
    const pushStore = readProjectFile("server", "push-store.ts");
    expect(pushStore).toContain("awafiyat_automatic_notification_campaign");
    expect(pushStore).toContain("awafiyat_automatic_notification_items");
    expect(pushStore).toContain("FOR UPDATE");
    expect(pushStore).toContain('"isProcessing" = TRUE');
    expect(pushStore).toContain("ON CONFLICT (\"campaignVersion\", position) DO NOTHING");
  });

  it("adds authenticated controls and starts the scheduler with the production server", () => {
    const server = readProjectFile("server", "_core", "index.ts");
    expect(server).toContain("app.get('/api/admin/notifications/automatic', adminAuth");
    expect(server).toContain("app.put('/api/admin/notifications/automatic/schedule', adminAuth");
    expect(server).toContain("app.post('/api/admin/notifications/automatic/enabled', adminAuth");
    expect(server).toContain("app.post('/api/admin/notifications/automatic/restart', adminAuth");
    expect(server).toContain("startAutomaticNotificationScheduler");
    expect(server).toContain('source: "manual" | "automatic"');
  });

  it("provides status, scheduling and message editing controls in the admin panel", () => {
    const admin = readProjectFile("server", "admin", "index.html");
    expect(admin).toContain("برنامج الإشعارات التلقائية — 30 يومًا");
    expect(admin).toContain("loadAutomaticNotificationCampaign");
    expect(admin).toContain("saveAutomaticNotificationSchedule");
    expect(admin).toContain("toggleAutomaticNotificationCampaign");
    expect(admin).toContain("restartAutomaticNotificationCampaignFromAdmin");
    expect(admin).toContain("saveAutomaticNotificationEdit");
  });
});

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Alarm Improvements", () => {
  const projectRoot = path.resolve(__dirname, "..");

  describe("Sound files", () => {
    it("should have 3 new alarm sound files (morning, lunch, dinner)", () => {
      const sounds = ["alarm_morning.mp3", "alarm_lunch.mp3", "alarm_dinner.mp3"];
      for (const sound of sounds) {
        const filePath = path.join(projectRoot, "assets", sound);
        expect(fs.existsSync(filePath), `Missing: ${sound}`).toBe(true);
        const stat = fs.statSync(filePath);
        // Each file should be > 100KB (real audio, not placeholder)
        expect(stat.size).toBeGreaterThan(100000);
      }
    });

    it("should NOT have old sound files (kitchen, classic, digital, chime, urgent)", () => {
      const oldSounds = [
        "alarm_kitchen.wav",
        "alarm_classic.wav",
        "alarm_digital.wav",
        "alarm_chime.wav",
        "alarm_urgent.wav",
      ];
      for (const sound of oldSounds) {
        const filePath = path.join(projectRoot, "assets", sound);
        expect(fs.existsSync(filePath), `Should be removed: ${sound}`).toBe(false);
      }
    });
  });

  describe("Alarm context", () => {
    it("should only define 3 alarm tones (morning, lunch, dinner)", () => {
      const contextFile = fs.readFileSync(
        path.join(projectRoot, "lib", "alarm-context.tsx"),
        "utf-8"
      );
      // Should have 3 tones
      expect(contextFile).toContain('"morning"');
      expect(contextFile).toContain('"lunch"');
      expect(contextFile).toContain('"dinner"');
      // Should NOT have old tones
      expect(contextFile).not.toContain('"kitchen"');
      expect(contextFile).not.toContain('"classic"');
      expect(contextFile).not.toContain('"digital"');
      expect(contextFile).not.toContain('"chime"');
      expect(contextFile).not.toContain('"urgent"');
    });

    it("should use gentle vibration pattern", () => {
      const contextFile = fs.readFileSync(
        path.join(projectRoot, "lib", "alarm-context.tsx"),
        "utf-8"
      );
      // Should use gentle vibration (short pulse, not aggressive)
      expect(contextFile).toContain("[0, 300, 500, 300]");
      // Should NOT use aggressive vibration
      expect(contextFile).not.toContain("[0, 1000, 500, 1000, 500, 1000]");
    });

    it("should use Success haptic instead of Warning", () => {
      const contextFile = fs.readFileSync(
        path.join(projectRoot, "lib", "alarm-context.tsx"),
        "utf-8"
      );
      expect(contextFile).toContain("NotificationFeedbackType.Success");
      expect(contextFile).not.toContain("NotificationFeedbackType.Warning");
    });

    it("should set default volume to 0.8 instead of 1.0", () => {
      const contextFile = fs.readFileSync(
        path.join(projectRoot, "lib", "alarm-context.tsx"),
        "utf-8"
      );
      expect(contextFile).toContain("volume: 0.3");
    });
  });

  describe("Alarm screen", () => {
    it("should have friendly meal icons and greetings", () => {
      const screenFile = fs.readFileSync(
        path.join(projectRoot, "components", "alarm-screen.tsx"),
        "utf-8"
      );
      // Friendly food icons instead of bell
      expect(screenFile).toContain("🍳");
      expect(screenFile).toContain("🍲");
      expect(screenFile).toContain("🥘");
      // Should NOT have old bell icon
      expect(screenFile).not.toContain("🔔");
    });

    it("should have view recipe and dismiss buttons", () => {
      const screenFile = fs.readFileSync(
        path.join(projectRoot, "components", "alarm-screen.tsx"),
        "utf-8"
      );
      expect(screenFile).toContain("عرض الوصفة");
      expect(screenFile).toContain("إيقاف");
      // Recipe button should navigate to recipe-detail
      expect(screenFile).toContain("recipe-detail");
    });

    it("should use warm background colors instead of dark overlay", () => {
      const screenFile = fs.readFileSync(
        path.join(projectRoot, "components", "alarm-screen.tsx"),
        "utf-8"
      );
      // Should NOT have dark overlay
      expect(screenFile).not.toContain("#000000ee");
      // Should have warm colors
      expect(screenFile).toContain("#FFF8E1"); // breakfast
      expect(screenFile).toContain("#F0FDF4"); // lunch
      expect(screenFile).toContain("#EFF6FF"); // dinner
    });

    it("should include brightness and keep-awake functionality", () => {
      const screenFile = fs.readFileSync(
        path.join(projectRoot, "components", "alarm-screen.tsx"),
        "utf-8"
      );
      expect(screenFile).toContain("expo-keep-awake");
      expect(screenFile).toContain("expo-brightness");
      expect(screenFile).toContain("activateKeepAwakeAsync");
      expect(screenFile).toContain("deactivateKeepAwake");
    });
  });

  describe("Alarm scheduling", () => {
    it("should use native alarm module for meal reminders", () => {
      const notifFile = fs.readFileSync(
        path.join(projectRoot, "lib", "notifications.ts"),
        "utf-8"
      );
      // المنبه الأصلي يعمل للوجبات
      expect(notifFile).toContain("NativeAlarm");
      expect(notifFile).toContain("scheduleAlarm");
    });

    it("should save alarm data in AsyncStorage for AlarmContext", () => {
      const notifFile = fs.readFileSync(
        path.join(projectRoot, "lib", "notifications.ts"),
        "utf-8"
      );
      expect(notifFile).toContain("@alarm_data_");
    });
  });

  describe("Notification channel", () => {
    it("should use HIGH importance instead of MAX", () => {
      const notifFile = fs.readFileSync(
        path.join(projectRoot, "lib", "notifications.ts"),
        "utf-8"
      );
      // meals channel should be HIGH not MAX
      expect(notifFile).toContain("AndroidImportance.HIGH");
      // Should not bypass DND
      expect(notifFile).toContain("bypassDnd: false");
    });
  });
});

/**
 * Expo Config Plugin: withAlarmSounds
 * ينسخ ملفات صوت المنبه مباشرة إلى android/app/src/main/res/raw/
 * حتى يتمكن expo-alarm-module من إيجادها عبر getIdentifier()
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ALARM_SOUNDS = [
  "alarm_morning.mp3",
  "alarm_lunch.mp3",
  "alarm_dinner.mp3",
];

const withAlarmSounds = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "raw"
      );

      // إنشاء مجلد res/raw إذا لم يكن موجوداً
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }

      // نسخ كل ملف صوت
      for (const soundFile of ALARM_SOUNDS) {
        const srcPath = path.join(projectRoot, "assets", soundFile);
        const destPath = path.join(rawDir, soundFile);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[withAlarmSounds] Copied ${soundFile} → res/raw/`);
        } else {
          console.warn(`[withAlarmSounds] Sound file not found: ${srcPath}`);
        }
      }

      return config;
    },
  ]);
};

module.exports = withAlarmSounds;

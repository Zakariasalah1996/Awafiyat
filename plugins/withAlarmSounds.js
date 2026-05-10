/**
 * Expo Config Plugin: withAlarmSounds
 * ينسخ ملفات صوت الإشعارات المخصصة إلى android/app/src/main/res/raw/
 * حتى يتمكن expo-notifications من استخدامها في NotificationChannel
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NOTIFICATION_SOUNDS = [
  { file: "notification_female.mp3", src: "assets/notification_female.mp3" },
  { file: "notification_male.mp3", src: "assets/notification_male.mp3" },
  { file: "medication_reminder.mp3", src: "assets/medication_reminder.mp3" },
  { file: "water_reminder.mp3", src: "assets/water_reminder.mp3" },
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
      for (const sound of NOTIFICATION_SOUNDS) {
        const srcPath = path.join(projectRoot, sound.src);
        const destPath = path.join(rawDir, sound.file);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[withAlarmSounds] Copied ${sound.file} → res/raw/`);
        } else {
          console.warn(`[withAlarmSounds] Sound file not found: ${srcPath}`);
        }
      }

      return config;
    },
  ]);
};

module.exports = withAlarmSounds;

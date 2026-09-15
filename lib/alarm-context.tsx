import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VoiceGender, getVoiceGender, setVoiceGender, refreshAllAlarms } from "@/lib/notifications";

// التذكيرات تعمل عبر إشعارات النظام المجدولة. لا نستخدم خدمة صوت أمامية أو تشغيلًا مستمرًا بالخلفية.
const PREVIEW_SOUNDS: Record<VoiceGender, string> = {
  female: "notification_female.mp3",
  male: "notification_male.mp3",
};

const PREVIEW_CHANNELS: Record<VoiceGender, string> = {
  female: "meal_reminder_female",
  male: "meal_reminder_male",
};

export interface AlarmSettings {
  enabled: boolean;
  voiceGender: VoiceGender;
}

const DEFAULT_SETTINGS: AlarmSettings = {
  enabled: true,
  voiceGender: "female",
};

const STORAGE_KEY = "@alarm_settings_v2";

interface AlarmContextType {
  settings: AlarmSettings;
  updateSettings: (newSettings: Partial<AlarmSettings>) => void;
  previewVoice: (gender: VoiceGender) => Promise<void>;
  stopPreview: () => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AlarmSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const saved = JSON.parse(data) as AlarmSettings;
          setSettings(saved);
          settingsRef.current = saved;
          return;
        }

        const oldGender = await getVoiceGender();
        if (oldGender) {
          const restored = { ...DEFAULT_SETTINGS, voiceGender: oldGender };
          setSettings(restored);
          settingsRef.current = restored;
        }
      } catch {}
    })();
  }, []);

  const saveSettings = useCallback(async (nextSettings: AlarmSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      await setVoiceGender(nextSettings.voiceGender);
    } catch {}
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<AlarmSettings>) => {
      setSettings((previous) => {
        const updated = { ...previous, ...newSettings };
        settingsRef.current = updated;
        saveSettings(updated);

        if (newSettings.voiceGender && newSettings.voiceGender !== previous.voiceGender) {
          refreshAllAlarms().catch((error) =>
            console.warn("[AlarmContext] Failed to refresh reminders after voice change:", error),
          );
        }

        return updated;
      });
    },
    [saveSettings],
  );

  // يعرض إشعارًا محليًا قصيرًا للتجربة، باستخدام قناة تذكير النظام نفسها.
  // لا يبدأ تشغيلًا صوتيًا مستمرًا ولا خدمة Android أمامية.
  const previewVoice = useCallback(async (gender: VoiceGender) => {
    if (Platform.OS === "web") return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "معاينة صوت التذكير",
          body: "هذا نموذج لصوت التذكير.",
          sound: PREVIEW_SOUNDS[gender],
          data: { type: "reminder_voice_preview" },
          ...(Platform.OS === "android" && { channelId: PREVIEW_CHANNELS[gender] }),
        },
        trigger: null,
      });
    } catch (error) {
      console.warn("[AlarmContext] Notification sound preview failed:", error);
    }
  }, []);

  // بقيت الدالة لتوافق الواجهة؛ الإشعار القصير يديره نظام Android ولا توجد جلسة تشغيل مستمرة لإيقافها.
  const stopPreview = useCallback(() => {}, []);

  return (
    <AlarmContext.Provider
      value={{
        settings,
        updateSettings,
        previewVoice,
        stopPreview,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const context = useContext(AlarmContext);
  if (!context) throw new Error("useAlarm must be used within AlarmProvider");
  return context;
}

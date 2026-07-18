import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VoiceGender, getVoiceGender, setVoiceGender, refreshAllAlarms } from "@/lib/notifications";

// ============================================================
// AlarmContext الجديد - بدون expo-alarm-module
// يدير فقط: إعدادات الصوت (رجل/امرأة) + معاينة الصوت
// الإشعارات الفعلية تُدار عبر lib/notifications.ts
// ============================================================

// أصوات المعاينة
const PREVIEW_SOUNDS = {
  female: require("@/assets/notification_female.mp3"),
  male: require("@/assets/notification_male.mp3"),
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
  previewVoice: (gender: VoiceGender) => void;
  stopPreview: () => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AlarmSettings>(DEFAULT_SETTINGS);

  // مشغلات المعاينة
  const femalePlayer = useAudioPlayer(PREVIEW_SOUNDS.female);
  const malePlayer = useAudioPlayer(PREVIEW_SOUNDS.male);

  const players: Record<VoiceGender, ReturnType<typeof useAudioPlayer>> = {
    female: femalePlayer,
    male: malePlayer,
  };

  const previewActiveRef = useRef<VoiceGender | null>(null);

  // تحميل الإعدادات من AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const saved = JSON.parse(data) as AlarmSettings;
          setSettings(saved);
          settingsRef.current = saved;
        } else {
          // محاولة قراءة الإعداد القديم
          const oldGender = await getVoiceGender();
          if (oldGender) {
            const s = { ...DEFAULT_SETTINGS, voiceGender: oldGender };
            setSettings(s);
            settingsRef.current = s;
          }
        }
      } catch {}

      if (Platform.OS !== "web") {
        setAudioModeAsync({ playsInSilentMode: true });
      }
    })();

    return () => {
      Object.values(players).forEach((p) => {
        try { p.release(); } catch {}
      });
    };
  }, []);

  // حفظ الإعدادات
  const saveSettings = useCallback(async (s: AlarmSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      // مزامنة voiceGender مع notifications.ts
      await setVoiceGender(s.voiceGender);
    } catch {}
  }, []);

  // تحديث الإعدادات
  const updateSettings = useCallback(
    (newSettings: Partial<AlarmSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        settingsRef.current = updated;
        saveSettings(updated);

        // إذا تغير الصوت، إعادة جدولة الإشعارات بالصوت الجديد
        if (newSettings.voiceGender && newSettings.voiceGender !== prev.voiceGender) {
          refreshAllAlarms().catch((e) =>
            console.warn("[AlarmContext] Failed to refresh alarms after voice change:", e)
          );
        }

        return updated;
      });
    },
    [saveSettings]
  );

  // معاينة صوت
  const previewVoice = useCallback(
    (gender: VoiceGender) => {
      // إيقاف أي معاينة سابقة
      if (previewActiveRef.current) {
        try {
          players[previewActiveRef.current].pause();
          players[previewActiveRef.current].seekTo(0);
        } catch {}
      }

      const player = players[gender];
      try {
        player.loop = false;
        player.volume = 1.0;
        player.seekTo(0);
        player.play();
        previewActiveRef.current = gender;

        // إيقاف بعد 8 ثوانٍ (مدة الملف تقريباً)
        setTimeout(() => {
          try {
            player.pause();
            player.seekTo(0);
          } catch {}
          previewActiveRef.current = null;
        }, 9000);
      } catch (e) {
        console.warn("[AlarmContext] Preview failed:", e);
      }
    },
    [players]
  );

  // إيقاف المعاينة
  const stopPreview = useCallback(() => {
    if (previewActiveRef.current) {
      try {
        players[previewActiveRef.current].pause();
        players[previewActiveRef.current].seekTo(0);
      } catch {}
      previewActiveRef.current = null;
    }
  }, [players]);

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
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}

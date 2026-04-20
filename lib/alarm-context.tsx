import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { Vibration, Platform } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// أصوات المنبه المتاحة
const ALARM_SOUNDS = {
  morning: require("@/assets/alarm_morning.mp3"),
  lunch: require("@/assets/alarm_lunch.mp3"),
  dinner: require("@/assets/alarm_dinner.mp3"),
  kitchen: require("@/assets/alarm_kitchen.wav"),
  classic: require("@/assets/alarm_classic.wav"),
  digital: require("@/assets/alarm_digital.wav"),
  chime: require("@/assets/alarm_chime.wav"),
  urgent: require("@/assets/alarm_urgent.wav"),
};

export type AlarmTone = keyof typeof ALARM_SOUNDS;

export const ALARM_TONE_LABELS: Record<AlarmTone, string> = {
  morning: "منبه الفطور الصباحي 🌅",
  lunch: "منبه الغداء 🍽️",
  dinner: "منبه العشاء المسائي 🌙",
  kitchen: "جرس مطبخ 🍳",
  classic: "نغمة كلاسيكية 📞",
  digital: "تنبيه رقمي 🔊",
  chime: "جرس هادئ 🔔",
  urgent: "صفارة عاجلة 🚨",
};

// نغمة الوجبة حسب النوع
export const MEAL_DEFAULT_TONE: Record<"breakfast" | "lunch" | "dinner", AlarmTone> = {
  breakfast: "morning",
  lunch: "lunch",
  dinner: "dinner",
};

export interface AlarmSettings {
  enabled: boolean;
  volume: number; // 0.0 - 1.0
  tone: AlarmTone;
  vibration: boolean;
}

const DEFAULT_SETTINGS: AlarmSettings = {
  enabled: true,
  volume: 1.0,
  tone: "morning",
  vibration: true,
};

const STORAGE_KEY = "@alarm_settings";

// expo-alarm-module - منبه أصلي على مستوى النظام
let AlarmModule: {
  scheduleAlarm: (params: any) => void;
  stopAlarm: () => void;
  removeAlarm: (uid: string) => void;
} | null = null;

try {
  if (Platform.OS === "android") {
    const mod = require("expo-alarm-module");
    AlarmModule = {
      scheduleAlarm: mod.scheduleAlarm || mod.default?.scheduleAlarm,
      stopAlarm: mod.stopAlarm || mod.default?.stopAlarm,
      removeAlarm: mod.removeAlarm || mod.default?.removeAlarm,
    };
  }
} catch (e) {
  console.warn("[Alarm] expo-alarm-module not available:", e);
}

interface AlarmState {
  isRinging: boolean;
  recipeName: string;
  recipeId: string;
  mealType: string;
}

interface AlarmContextType {
  alarm: AlarmState;
  settings: AlarmSettings;
  startAlarm: (recipeName: string, recipeId?: string, mealType?: string) => void;
  stopAlarm: () => void;
  scheduleNativeAlarm: (uid: string, date: Date, title: string, description: string) => void;
  cancelNativeAlarm: (uid: string) => void;
  updateSettings: (newSettings: Partial<AlarmSettings>) => void;
  previewTone: (tone: AlarmTone) => void;
  stopPreview: () => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarm, setAlarm] = useState<AlarmState>({
    isRinging: false,
    recipeName: "",
    recipeId: "",
    mealType: "",
  });

  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AlarmSettings>(DEFAULT_SETTINGS);

  // مشغلات الصوت لكل نغمة
  const morningPlayer = useAudioPlayer(ALARM_SOUNDS.morning);
  const lunchPlayer = useAudioPlayer(ALARM_SOUNDS.lunch);
  const dinnerPlayer = useAudioPlayer(ALARM_SOUNDS.dinner);
  const kitchenPlayer = useAudioPlayer(ALARM_SOUNDS.kitchen);
  const classicPlayer = useAudioPlayer(ALARM_SOUNDS.classic);
  const digitalPlayer = useAudioPlayer(ALARM_SOUNDS.digital);
  const chimePlayer = useAudioPlayer(ALARM_SOUNDS.chime);
  const urgentPlayer = useAudioPlayer(ALARM_SOUNDS.urgent);

  const players: Record<AlarmTone, ReturnType<typeof useAudioPlayer>> = {
    morning: morningPlayer,
    lunch: lunchPlayer,
    dinner: dinnerPlayer,
    kitchen: kitchenPlayer,
    classic: classicPlayer,
    digital: digitalPlayer,
    chime: chimePlayer,
    urgent: urgentPlayer,
  };

  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewPlayerRef = useRef<AlarmTone | null>(null);

  // تحميل الإعدادات من AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const saved = JSON.parse(data) as AlarmSettings;
          setSettings(saved);
          settingsRef.current = saved;
        } catch {}
      }
    });

    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true });
    }

    return () => {
      Object.values(players).forEach((p) => {
        try { p.release(); } catch {}
      });
      if (vibrationRef.current) clearInterval(vibrationRef.current);
      Vibration.cancel();
    };
  }, []);

  // حفظ الإعدادات
  const saveSettings = useCallback(async (s: AlarmSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, []);

  // تحديث الإعدادات
  const updateSettings = useCallback(
    (newSettings: Partial<AlarmSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        settingsRef.current = updated;
        saveSettings(updated);
        return updated;
      });
    },
    [saveSettings]
  );

  // معاينة نغمة
  const previewTone = useCallback(
    (tone: AlarmTone) => {
      // إيقاف أي معاينة سابقة
      if (previewPlayerRef.current) {
        try {
          players[previewPlayerRef.current].pause();
          players[previewPlayerRef.current].seekTo(0);
        } catch {}
      }

      const player = players[tone];
      try {
        player.loop = false;
        player.volume = settingsRef.current.volume;
        player.seekTo(0);
        player.play();
        previewPlayerRef.current = tone;

        // إيقاف بعد 4 ثوانٍ
        setTimeout(() => {
          try {
            player.pause();
            player.seekTo(0);
          } catch {}
          previewPlayerRef.current = null;
        }, 4000);
      } catch (e) {
        console.warn("Preview failed:", e);
      }
    },
    [players]
  );

  // إيقاف المعاينة
  const stopPreview = useCallback(() => {
    if (previewPlayerRef.current) {
      try {
        players[previewPlayerRef.current].pause();
        players[previewPlayerRef.current].seekTo(0);
      } catch {}
      previewPlayerRef.current = null;
    }
  }, [players]);

  // جدولة منبه أصلي
  const scheduleNativeAlarm = useCallback(
    (uid: string, date: Date, title: string, description: string) => {
      if (Platform.OS !== "android" || !AlarmModule?.scheduleAlarm) return;
      try {
        AlarmModule.scheduleAlarm({
          uid,
          day: date,
          title,
          description,
          showDismiss: true,
          showSnooze: true,
          snoozeInterval: 5,
          repeating: true,
          active: true,
        } as any);
        console.log(`[Alarm] Native scheduled: ${uid} at ${date.toLocaleTimeString()}`);
      } catch (e) {
        console.error("[Alarm] Schedule failed:", e);
      }
    },
    []
  );

  // إلغاء منبه أصلي
  const cancelNativeAlarm = useCallback((uid: string) => {
    if (Platform.OS !== "android" || !AlarmModule?.removeAlarm) return;
    try {
      AlarmModule.removeAlarm(uid);
    } catch {}
  }, []);

  // تشغيل المنبه - يختار الصوت حسب نوع الوجبة تلقائياً
  const startAlarm = useCallback(
    (recipeName: string, recipeId?: string, mealType?: string) => {
      const s = settingsRef.current;

      setAlarm({
        isRinging: true,
        recipeName: recipeName || "وجبتك",
        recipeId: recipeId || "",
        mealType: mealType || "",
      });

      // تشغيل الصوت إذا مفعّل
      if (s.enabled && s.volume > 0) {
        try {
          // اختيار الصوت حسب نوع الوجبة تلقائياً
          const toneToPlay: AlarmTone =
            mealType === "breakfast"
              ? "morning"
              : mealType === "lunch"
              ? "lunch"
              : mealType === "dinner"
              ? "dinner"
              : s.tone;

          const player = players[toneToPlay];
          player.loop = true;
          player.volume = s.volume;
          player.seekTo(0);
          player.play();
        } catch (e) {
          console.warn("Alarm play failed:", e);
        }
      }

      // اهتزاز إذا مفعّل
      if (s.vibration && Platform.OS !== "web") {
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        vibrationRef.current = setInterval(() => {
          if (Platform.OS !== "web") {
            Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }, 5000);
      }
    },
    [players]
  );

  // إيقاف المنبه
  const stopAlarm = useCallback(() => {
    setAlarm({ isRinging: false, recipeName: "", recipeId: "", mealType: "" });

    // إيقاف كل المشغلات
    Object.values(players).forEach((p) => {
      try { p.pause(); p.seekTo(0); } catch {}
    });

    // إيقاف المنبه الأصلي
    if (AlarmModule?.stopAlarm) {
      try { AlarmModule.stopAlarm(); } catch {}
    }

    Vibration.cancel();
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
  }, [players]);

  return (
    <AlarmContext.Provider
      value={{
        alarm,
        settings,
        startAlarm,
        stopAlarm,
        scheduleNativeAlarm,
        cancelNativeAlarm,
        updateSettings,
        previewTone,
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

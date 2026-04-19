import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { Vibration, Platform } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";

const alarmSound = require("@/assets/alarm.wav");

// expo-alarm-module - منبه أصلي على مستوى النظام
let AlarmModule: {
  scheduleAlarm: (params: any) => void;
  stopAlarm: () => void;
  removeAlarm: (uid: string) => void;
} | null = null;

try {
  // Dynamic import to avoid crash on web/iOS
  if (Platform.OS === "android") {
    const mod = require("expo-alarm-module");
    AlarmModule = {
      scheduleAlarm: mod.scheduleAlarm || mod.default?.scheduleAlarm,
      stopAlarm: mod.stopAlarm || mod.default?.stopAlarm,
      removeAlarm: mod.removeAlarm || mod.default?.removeAlarm,
    };
  }
} catch (e) {
  console.warn("[Alarm] expo-alarm-module not available, using fallback:", e);
}

interface AlarmState {
  isRinging: boolean;
  recipeName: string;
  recipeId: string;
  mealType: string;
}

interface AlarmContextType {
  alarm: AlarmState;
  startAlarm: (recipeName: string, recipeId?: string, mealType?: string) => void;
  stopAlarm: () => void;
  scheduleNativeAlarm: (
    uid: string,
    date: Date,
    title: string,
    description: string
  ) => void;
  cancelNativeAlarm: (uid: string) => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarm, setAlarm] = useState<AlarmState>({
    isRinging: false,
    recipeName: "",
    recipeId: "",
    mealType: "",
  });

  // مشغل صوت المنبه (fallback للويب و iOS)
  const alarmPlayer = useAudioPlayer(alarmSound);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // تفعيل الصوت في الوضع الصامت
  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true });
    }
    return () => {
      alarmPlayer.release();
      if (vibrationRef.current) {
        clearInterval(vibrationRef.current);
      }
      Vibration.cancel();
    };
  }, []);

  /**
   * جدولة منبه أصلي عبر expo-alarm-module
   * يرن على مستوى النظام حتى لو التطبيق مغلق
   */
  const scheduleNativeAlarm = useCallback(
    (uid: string, date: Date, title: string, description: string) => {
      if (Platform.OS !== "android" || !AlarmModule?.scheduleAlarm) {
        console.warn("[Alarm] Native alarm not available on this platform");
        return;
      }

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
        console.log(`[Alarm] Native alarm scheduled: ${uid} at ${date.toLocaleTimeString()}`);
      } catch (e) {
        console.error("[Alarm] Failed to schedule native alarm:", e);
      }
    },
    []
  );

  /**
   * إلغاء منبه أصلي
   */
  const cancelNativeAlarm = useCallback((uid: string) => {
    if (Platform.OS !== "android" || !AlarmModule?.removeAlarm) return;
    try {
      AlarmModule.removeAlarm(uid);
      console.log(`[Alarm] Native alarm cancelled: ${uid}`);
    } catch (e) {
      console.warn("[Alarm] Failed to cancel native alarm:", e);
    }
  }, []);

  /**
   * تشغيل المنبه فوراً (داخل التطبيق)
   * يُستخدم عند الضغط على زر المنبه أو عند استقبال إشعار
   */
  const startAlarm = useCallback(
    (recipeName: string, recipeId?: string, mealType?: string) => {
      setAlarm({
        isRinging: true,
        recipeName: recipeName || "وجبتك",
        recipeId: recipeId || "",
        mealType: mealType || "",
      });

      // تشغيل صوت المنبه بصوت عالي ومتكرر (loop)
      try {
        alarmPlayer.loop = true;
        alarmPlayer.volume = 1.0;
        alarmPlayer.seekTo(0);
        alarmPlayer.play();
      } catch (e) {
        console.warn("Failed to play alarm sound:", e);
      }

      // اهتزاز متكرر مستمر
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      // اهتزاز إضافي كل 5 ثوانٍ
      vibrationRef.current = setInterval(() => {
        if (Platform.OS !== "web") {
          Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }, 5000);
    },
    [alarmPlayer]
  );

  /**
   * إيقاف المنبه (الصوت + الاهتزاز + المنبه الأصلي)
   */
  const stopAlarm = useCallback(() => {
    setAlarm({
      isRinging: false,
      recipeName: "",
      recipeId: "",
      mealType: "",
    });

    // إيقاف صوت expo-audio
    try {
      alarmPlayer.pause();
      alarmPlayer.seekTo(0);
    } catch (e) {
      // ignore
    }

    // إيقاف المنبه الأصلي
    if (AlarmModule?.stopAlarm) {
      try {
        AlarmModule.stopAlarm();
      } catch (e) {
        // ignore
      }
    }

    // إيقاف الاهتزاز
    Vibration.cancel();
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
  }, [alarmPlayer]);

  return (
    <AlarmContext.Provider
      value={{ alarm, startAlarm, stopAlarm, scheduleNativeAlarm, cancelNativeAlarm }}
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

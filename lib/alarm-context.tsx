import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { Vibration, Platform } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";

const alarmSound = require("@/assets/alarm.wav");

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
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarm, setAlarm] = useState<AlarmState>({
    isRinging: false,
    recipeName: "",
    recipeId: "",
    mealType: "",
  });

  // مشغل صوت المنبه
  const alarmPlayer = useAudioPlayer(alarmSound);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // تفعيل الصوت في الوضع الصامت على iOS
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

  const startAlarm = useCallback((recipeName: string, recipeId?: string, mealType?: string) => {
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

    // اهتزاز إضافي كل 5 ثوانٍ للتأكد من الاستمرار
    vibrationRef.current = setInterval(() => {
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 5000);
  }, [alarmPlayer]);

  const stopAlarm = useCallback(() => {
    setAlarm({
      isRinging: false,
      recipeName: "",
      recipeId: "",
      mealType: "",
    });

    // إيقاف الصوت
    try {
      alarmPlayer.pause();
      alarmPlayer.seekTo(0);
    } catch (e) {
      // ignore
    }

    // إيقاف الاهتزاز
    Vibration.cancel();
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
  }, [alarmPlayer]);

  return (
    <AlarmContext.Provider value={{ alarm, startAlarm, stopAlarm }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}

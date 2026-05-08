import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام إدارة شرب الماء - رفيق الماء
// حساب الهدف اليومي حسب الوزن + تتبع الأكواب + سجل يومي
// ============================================================

const WATER_STATE_KEY = "@water_state_v1";
const WATER_LOG_KEY = "@water_log_v1";

// حجم الكوب الافتراضي بالمل
export const DEFAULT_CUP_SIZE = 250;

// المعامل لحساب الهدف اليومي (مل لكل كغ)
const ML_PER_KG = 33;

export interface WaterSettings {
  weight: number; // الوزن بالكغ
  dailyGoalMl: number; // الهدف اليومي بالمل (محسوب من الوزن)
  cupSizeMl: number; // حجم الكوب بالمل
  remindersEnabled: boolean; // هل التذكيرات مفعلة
  reminderIntervalHours: number; // الفاصل بين التذكيرات (بالساعات)
  wakeHour: number; // ساعة الاستيقاظ
  sleepHour: number; // ساعة النوم
  setupComplete: boolean; // هل تم الإعداد
}

export interface WaterDayLog {
  date: string; // YYYY-MM-DD
  cupsCount: number; // عدد الأكواب
  totalMl: number; // المجموع بالمل
  goalMl: number; // الهدف لهذا اليوم
  timestamps: string[]; // أوقات شرب كل كوب
}

interface WaterState {
  settings: WaterSettings;
  todayLog: WaterDayLog;
}

interface WaterContextType {
  state: WaterState;
  isLoading: boolean;
  // إعدادات
  completeSetup: (weight: number, reminderInterval?: number) => Promise<void>;
  updateSettings: (settings: Partial<WaterSettings>) => Promise<void>;
  // تسجيل الأكواب
  drinkCup: () => Promise<void>;
  undoLastCup: () => Promise<void>;
  // حسابات
  getProgressPercent: () => number;
  getRemainingCups: () => number;
  getRemainingMl: () => number;
  getTotalCupsGoal: () => number;
  // سجل
  getWeekLog: () => Promise<WaterDayLog[]>;
}

const defaultSettings: WaterSettings = {
  weight: 70,
  dailyGoalMl: 2310,
  cupSizeMl: DEFAULT_CUP_SIZE,
  remindersEnabled: true,
  reminderIntervalHours: 2,
  wakeHour: 7,
  sleepHour: 23,
  setupComplete: false,
};

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createEmptyDayLog(goalMl: number): WaterDayLog {
  return {
    date: getTodayDate(),
    cupsCount: 0,
    totalMl: 0,
    goalMl,
    timestamps: [],
  };
}

const WaterContext = createContext<WaterContextType | undefined>(undefined);

export function WaterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WaterState>({
    settings: defaultSettings,
    todayLog: createEmptyDayLog(defaultSettings.dailyGoalMl),
  });
  const [isLoading, setIsLoading] = useState(true);

  // تحميل البيانات عند البدء
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(WATER_STATE_KEY);
      if (stored) {
        const parsed: WaterState = JSON.parse(stored);
        // التحقق من أن اليوم الحالي هو نفسه
        const today = getTodayDate();
        if (parsed.todayLog.date !== today) {
          // يوم جديد - إعادة تعيين العداد
          const newLog = createEmptyDayLog(parsed.settings.dailyGoalMl);
          // حفظ سجل اليوم السابق
          await saveDayLog(parsed.todayLog);
          parsed.todayLog = newLog;
        }
        setState(parsed);
      }
    } catch (e) {
      console.error("[Water] Failed to load state:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = async (newState: WaterState) => {
    try {
      await AsyncStorage.setItem(WATER_STATE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error("[Water] Failed to save state:", e);
    }
  };

  const saveDayLog = async (log: WaterDayLog) => {
    try {
      const stored = await AsyncStorage.getItem(WATER_LOG_KEY);
      const logs: WaterDayLog[] = stored ? JSON.parse(stored) : [];
      // حفظ آخر 30 يوم فقط
      logs.push(log);
      const trimmed = logs.slice(-30);
      await AsyncStorage.setItem(WATER_LOG_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error("[Water] Failed to save day log:", e);
    }
  };

  const completeSetup = useCallback(async (weight: number, reminderInterval: number = 2) => {
    const dailyGoalMl = Math.round(weight * ML_PER_KG);
    const newSettings: WaterSettings = {
      ...state.settings,
      weight,
      dailyGoalMl,
      remindersEnabled: true,
      reminderIntervalHours: reminderInterval,
      setupComplete: true,
    };
    const newState: WaterState = {
      settings: newSettings,
      todayLog: createEmptyDayLog(dailyGoalMl),
    };
    setState(newState);
    await saveState(newState);
  }, [state.settings]);

  const updateSettings = useCallback(async (updates: Partial<WaterSettings>) => {
    const newSettings = { ...state.settings, ...updates };
    // إعادة حساب الهدف إذا تغير الوزن
    if (updates.weight) {
      newSettings.dailyGoalMl = Math.round(updates.weight * ML_PER_KG);
    }
    const newState: WaterState = {
      settings: newSettings,
      todayLog: { ...state.todayLog, goalMl: newSettings.dailyGoalMl },
    };
    setState(newState);
    await saveState(newState);
  }, [state]);

  const drinkCup = useCallback(async () => {
    const now = new Date().toISOString();
    const newLog: WaterDayLog = {
      ...state.todayLog,
      cupsCount: state.todayLog.cupsCount + 1,
      totalMl: state.todayLog.totalMl + state.settings.cupSizeMl,
      timestamps: [...state.todayLog.timestamps, now],
    };
    const newState: WaterState = { ...state, todayLog: newLog };
    setState(newState);
    await saveState(newState);
  }, [state]);

  const undoLastCup = useCallback(async () => {
    if (state.todayLog.cupsCount <= 0) return;
    const newTimestamps = [...state.todayLog.timestamps];
    newTimestamps.pop();
    const newLog: WaterDayLog = {
      ...state.todayLog,
      cupsCount: state.todayLog.cupsCount - 1,
      totalMl: Math.max(0, state.todayLog.totalMl - state.settings.cupSizeMl),
      timestamps: newTimestamps,
    };
    const newState: WaterState = { ...state, todayLog: newLog };
    setState(newState);
    await saveState(newState);
  }, [state]);

  const getProgressPercent = useCallback(() => {
    if (state.settings.dailyGoalMl <= 0) return 0;
    return Math.min(100, Math.round((state.todayLog.totalMl / state.settings.dailyGoalMl) * 100));
  }, [state]);

  const getRemainingCups = useCallback(() => {
    const remainingMl = Math.max(0, state.settings.dailyGoalMl - state.todayLog.totalMl);
    return Math.ceil(remainingMl / state.settings.cupSizeMl);
  }, [state]);

  const getRemainingMl = useCallback(() => {
    return Math.max(0, state.settings.dailyGoalMl - state.todayLog.totalMl);
  }, [state]);

  const getTotalCupsGoal = useCallback(() => {
    return Math.ceil(state.settings.dailyGoalMl / state.settings.cupSizeMl);
  }, [state]);

  const getWeekLog = useCallback(async (): Promise<WaterDayLog[]> => {
    try {
      const stored = await AsyncStorage.getItem(WATER_LOG_KEY);
      const logs: WaterDayLog[] = stored ? JSON.parse(stored) : [];
      // آخر 7 أيام
      const weekLogs = logs.slice(-7);
      // إضافة اليوم الحالي
      return [...weekLogs, state.todayLog];
    } catch {
      return [state.todayLog];
    }
  }, [state.todayLog]);

  return (
    <WaterContext.Provider
      value={{
        state,
        isLoading,
        completeSetup,
        updateSettings,
        drinkCup,
        undoLastCup,
        getProgressPercent,
        getRemainingCups,
        getRemainingMl,
        getTotalCupsGoal,
        getWeekLog,
      }}
    >
      {children}
    </WaterContext.Provider>
  );
}

export function useWater(): WaterContextType {
  const context = useContext(WaterContext);
  if (!context) {
    throw new Error("useWater must be used within a WaterProvider");
  }
  return context;
}

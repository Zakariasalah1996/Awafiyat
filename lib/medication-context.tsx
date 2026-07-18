import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام إدارة الأدوية - رفيق الدواء (v2)
// ============================================================

export type MedicationFrequency = "daily" | "weekly" | "monthly";
export type DayOfWeek = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";
export type TimePeriod = "morning" | "afternoon" | "evening" | "bedtime";

// الفترات الزمنية الأربع
export const TIME_PERIODS: { id: TimePeriod; label: string; emoji: string; rangeLabel: string; minHour: number; maxHour: number; defaultHour: number }[] = [
  { id: "morning", label: "صباحاً", emoji: "🌅", rangeLabel: "5:00 ص - 11:00 ص", minHour: 5, maxHour: 11, defaultHour: 8 },
  { id: "afternoon", label: "ظهراً", emoji: "☀️", rangeLabel: "11:00 ص - 4:00 م", minHour: 11, maxHour: 16, defaultHour: 13 },
  { id: "evening", label: "مساءً", emoji: "🌆", rangeLabel: "4:00 م - 9:00 م", minHour: 16, maxHour: 21, defaultHour: 18 },
  { id: "bedtime", label: "قبل النوم", emoji: "🌙", rangeLabel: "9:00 م - 5:00 ص", minHour: 21, maxHour: 5, defaultHour: 22 },
];

export interface MedicationTime {
  hour: number; // 0-23
  minute: number; // 0-59
  period: TimePeriod; // الفترة الزمنية
}

export interface IntakeRecord {
  date: string; // YYYY-MM-DD
  timeIndex: number; // أي جرعة (0, 1, 2, 3)
  taken: boolean; // تناوله أم فاته
  timestamp: string; // ISO string
}

export interface Medication {
  id: string;
  name: string;
  frequency: MedicationFrequency;
  timesPerDay: number; // 1, 2, 3, 4
  times: MedicationTime[];
  dayOfWeek?: DayOfWeek; // للأسبوعي
  dayOfMonth?: number; // للشهري (1-30)
  dosage?: string; // كمية الجرعة: "حبة واحدة", "حبتين", "5 مل"
  note?: string; // ملاحظة: "بعد الأكل", "على معدة فارغة"
  notificationIds: string[]; // معرفات الإشعارات المجدولة
  intakeHistory: IntakeRecord[]; // سجل التناول
  createdAt: string;
  isActive: boolean;
}

export interface MedicationState {
  medications: Medication[];
  setupComplete: boolean;
  takesMedication: boolean | null;
}

const DEFAULT_STATE: MedicationState = {
  medications: [],
  setupComplete: false,
  takesMedication: null,
};

const STORAGE_KEY = "@medication_data_v2";
const OLD_STORAGE_KEY = "@medication_data_v1";

interface MedicationContextType {
  state: MedicationState;
  addMedication: (med: Omit<Medication, "id" | "createdAt" | "notificationIds" | "isActive" | "intakeHistory">) => Promise<Medication>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  recordIntake: (medicationId: string, timeIndex: number, taken: boolean) => Promise<void>;
  getIntakeForDate: (medicationId: string, date: string) => IntakeRecord[];
  getWeeklyAdherence: (medicationId: string) => number;
  setSetupComplete: (complete: boolean) => Promise<void>;
  setTakesMedication: (takes: boolean) => Promise<void>;
  canAddMoreMedications: (isSubscribed: boolean) => boolean;
  getMedicationCount: () => number;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export function MedicationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MedicationState>(DEFAULT_STATE);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      // محاولة تحميل v2 أولاً
      let stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // محاولة ترحيل من v1
        const oldStored = await AsyncStorage.getItem(OLD_STORAGE_KEY);
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          // ترحيل: إضافة الحقول الجديدة
          if (parsed.medications) {
            parsed.medications = parsed.medications.map((m: any) => ({
              ...m,
              dosage: m.dosage || "",
              note: m.note || "",
              intakeHistory: m.intakeHistory || [],
              times: (m.times || []).map((t: any) => ({
                ...t,
                period: t.period || guessPeriodFromHour(t.hour),
              })),
            }));
          }
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          stored = JSON.stringify(parsed);
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch (e) {
      console.error("[Medication] Failed to load state:", e);
    }
  };

  const saveState = async (newState: MedicationState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error("[Medication] Failed to save state:", e);
    }
  };

  const addMedication = useCallback(async (
    med: Omit<Medication, "id" | "createdAt" | "notificationIds" | "isActive" | "intakeHistory">
  ): Promise<Medication> => {
    const newMed: Medication = {
      ...med,
      id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      notificationIds: [],
      intakeHistory: [],
      isActive: true,
    };

    setState((prev) => {
      const updated = {
        ...prev,
        medications: [...prev.medications, newMed],
      };
      saveState(updated);
      return updated;
    });

    return newMed;
  }, []);

  const updateMedication = useCallback(async (id: string, updates: Partial<Medication>) => {
    setState((prev) => {
      const updated = {
        ...prev,
        medications: prev.medications.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      };
      saveState(updated);
      return updated;
    });
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    setState((prev) => {
      const updated = {
        ...prev,
        medications: prev.medications.filter((m) => m.id !== id),
      };
      saveState(updated);
      return updated;
    });
  }, []);

  const recordIntake = useCallback(async (medicationId: string, timeIndex: number, taken: boolean) => {
    const today = new Date().toISOString().split("T")[0];
    const record: IntakeRecord = {
      date: today,
      timeIndex,
      taken,
      timestamp: new Date().toISOString(),
    };

    setState((prev) => {
      const updated = {
        ...prev,
        medications: prev.medications.map((m) => {
          if (m.id !== medicationId) return m;
          // إزالة أي سجل سابق لنفس اليوم ونفس الجرعة
          const filteredHistory = m.intakeHistory.filter(
            (r) => !(r.date === today && r.timeIndex === timeIndex)
          );
          return {
            ...m,
            intakeHistory: [...filteredHistory, record],
          };
        }),
      };
      saveState(updated);
      return updated;
    });
  }, []);

  const getIntakeForDate = useCallback((medicationId: string, date: string): IntakeRecord[] => {
    const med = state.medications.find((m) => m.id === medicationId);
    if (!med) return [];
    return med.intakeHistory.filter((r) => r.date === date);
  }, [state.medications]);

  const getWeeklyAdherence = useCallback((medicationId: string): number => {
    const med = state.medications.find((m) => m.id === medicationId);
    if (!med) return 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRecords = med.intakeHistory.filter((r) => {
      const recordDate = new Date(r.date);
      return recordDate >= weekAgo && recordDate <= now;
    });

    if (weekRecords.length === 0) return 0;
    const taken = weekRecords.filter((r) => r.taken).length;
    return Math.round((taken / weekRecords.length) * 100);
  }, [state.medications]);

  const setSetupComplete = useCallback(async (complete: boolean) => {
    setState((prev) => {
      const updated = { ...prev, setupComplete: complete };
      saveState(updated);
      return updated;
    });
  }, []);

  const setTakesMedication = useCallback(async (takes: boolean) => {
    setState((prev) => {
      const updated = { ...prev, takesMedication: takes };
      saveState(updated);
      return updated;
    });
  }, []);

  // الدواء الأول مجاني، الإضافية تتطلب اشتراك
  const canAddMoreMedications = useCallback((isSubscribed: boolean): boolean => {
    if (isSubscribed) return true;
    return state.medications.filter((m) => m.isActive).length < 1;
  }, [state.medications]);

  const getMedicationCount = useCallback((): number => {
    return state.medications.filter((m) => m.isActive).length;
  }, [state.medications]);

  return (
    <MedicationContext.Provider
      value={{
        state,
        addMedication,
        updateMedication,
        deleteMedication,
        recordIntake,
        getIntakeForDate,
        getWeeklyAdherence,
        setSetupComplete,
        setTakesMedication,
        canAddMoreMedications,
        getMedicationCount,
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
}

export function useMedication() {
  const ctx = useContext(MedicationContext);
  if (!ctx) throw new Error("useMedication must be used within MedicationProvider");
  return ctx;
}

// Helper: تخمين الفترة من الساعة (للترحيل من v1)
function guessPeriodFromHour(hour: number): TimePeriod {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 21) return "evening";
  return "bedtime";
}

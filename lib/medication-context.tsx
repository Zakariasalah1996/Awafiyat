import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// نظام إدارة الأدوية - رفيق الدواء
// ============================================================

export type MedicationFrequency = "daily" | "weekly" | "monthly";
export type DayOfWeek = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";

export interface MedicationTime {
  hour: number;
  minute: number;
  label?: string; // "مع الفطور", "مع الغداء", etc.
}

export interface Medication {
  id: string;
  name: string;
  frequency: MedicationFrequency;
  timesPerDay: number; // 1, 2, 3
  times: MedicationTime[];
  dayOfWeek?: DayOfWeek; // للأسبوعي
  dayOfMonth?: number; // للشهري (1-30)
  notificationIds: string[]; // معرفات الإشعارات المجدولة
  createdAt: string;
  isActive: boolean;
}

export interface MedicationState {
  medications: Medication[];
  setupComplete: boolean; // هل أكمل إعداد رفيق الدواء
  takesMedication: boolean | null; // هل يتناول أدوية
}

const DEFAULT_STATE: MedicationState = {
  medications: [],
  setupComplete: false,
  takesMedication: null,
};

const STORAGE_KEY = "@medication_data_v1";

interface MedicationContextType {
  state: MedicationState;
  addMedication: (med: Omit<Medication, "id" | "createdAt" | "notificationIds" | "isActive">) => Promise<Medication>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
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
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
    med: Omit<Medication, "id" | "createdAt" | "notificationIds" | "isActive">
  ): Promise<Medication> => {
    const newMed: Medication = {
      ...med,
      id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      notificationIds: [],
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

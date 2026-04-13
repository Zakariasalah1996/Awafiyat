import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HealthCondition = "diabetes" | "hypertension" | "obesity" | "cholesterol" | "none";

export interface FamilyMember {
  id: string;
  name: string;
}

export interface MealTimes {
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
}

export interface NotificationSettings {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  fridge: boolean;
  shopping: boolean;
  promotions: boolean;
}

export interface UserProfile {
  name: string;
  phone: string;
  age: string;
  gender: "male" | "female" | "";
  healthCondition: HealthCondition;
  familyMembers: FamilyMember[];
  mealTimes: MealTimes;
  notifications: NotificationSettings;
  darkMode: boolean;
  onboardingComplete: boolean;
  isSubscribed: boolean;
  subscriptionType: "monthly" | "yearly" | null;
  subscriptionExpiry: string | null;
  freeAiQueries: number;
  freeRecipesViewed: number;
  savedRecipes: string[];
  triedRecipes: { recipeId: string; rating: number }[];
}

const defaultProfile: UserProfile = {
  name: "",
  phone: "",
  age: "",
  gender: "",
  healthCondition: "none",
  familyMembers: [],
  mealTimes: { breakfast: null, lunch: null, dinner: null },
  notifications: {
    breakfast: true,
    lunch: true,
    dinner: true,
    fridge: true,
    shopping: true,
    promotions: true,
  },
  darkMode: false,
  onboardingComplete: false,
  isSubscribed: false,
  subscriptionType: null,
  subscriptionExpiry: null,
  freeAiQueries: 3,
  freeRecipesViewed: 0,
  savedRecipes: [],
  triedRecipes: [],
};

interface UserContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => Promise<void>;
  canUseAi: () => boolean;
  canViewRecipe: () => boolean;
  decrementAiQueries: () => Promise<void>;
  incrementRecipesViewed: () => Promise<void>;
  saveRecipe: (recipeId: string) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  rateRecipe: (recipeId: string, rating: number) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = "@awafiyat_user_profile";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({ ...defaultProfile, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoaded(true);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.error("Failed to save profile:", e);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(async () => {
    setProfile(defaultProfile);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const canUseAi = useCallback(() => {
    return profile.isSubscribed || profile.freeAiQueries > 0;
  }, [profile.isSubscribed, profile.freeAiQueries]);

  const canViewRecipe = useCallback(() => {
    return profile.isSubscribed || profile.freeRecipesViewed < 10;
  }, [profile.isSubscribed, profile.freeRecipesViewed]);

  const decrementAiQueries = useCallback(async () => {
    if (!profile.isSubscribed && profile.freeAiQueries > 0) {
      await updateProfile({ freeAiQueries: profile.freeAiQueries - 1 });
    }
  }, [profile.isSubscribed, profile.freeAiQueries, updateProfile]);

  const incrementRecipesViewed = useCallback(async () => {
    if (!profile.isSubscribed) {
      await updateProfile({ freeRecipesViewed: profile.freeRecipesViewed + 1 });
    }
  }, [profile.isSubscribed, profile.freeRecipesViewed, updateProfile]);

  const saveRecipe = useCallback(async (recipeId: string) => {
    setProfile((prev) => {
      if (prev.savedRecipes.includes(recipeId)) return prev;
      const updated = { ...prev, savedRecipes: [...prev.savedRecipes, recipeId] };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const unsaveRecipe = useCallback(async (recipeId: string) => {
    setProfile((prev) => {
      const updated = { ...prev, savedRecipes: prev.savedRecipes.filter((id) => id !== recipeId) };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const rateRecipe = useCallback(async (recipeId: string, rating: number) => {
    setProfile((prev) => {
      const existing = prev.triedRecipes.filter((r) => r.recipeId !== recipeId);
      const updated = { ...prev, triedRecipes: [...existing, { recipeId, rating }] };
      saveProfile(updated);
      return updated;
    });
  }, []);

  if (!loaded) return null;

  return (
    <UserContext.Provider
      value={{
        profile,
        updateProfile,
        resetProfile,
        canUseAi,
        canViewRecipe,
        decrementAiQueries,
        incrementRecipesViewed,
        saveRecipe,
        unsaveRecipe,
        rateRecipe,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

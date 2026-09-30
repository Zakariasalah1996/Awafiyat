import AsyncStorage from "@react-native-async-storage/async-storage";

/** Preserve access to content that was already unlocked in older ad-supported builds. */
async function readUnlockedIds(key: string): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    const parsed: unknown = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getPreviouslyUnlockedRecipes(): Promise<string[]> {
  return readUnlockedIds("@unlocked_recipes");
}

export function getPreviouslyUnlockedWarnings(): Promise<string[]> {
  return readUnlockedIds("@unlocked_warnings");
}

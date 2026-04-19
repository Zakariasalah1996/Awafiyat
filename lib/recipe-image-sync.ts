/**
 * Recipe Image Sync - Fetches updated recipe images from the server
 * When admin uploads a new image via the dashboard, the app fetches it on next open
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const RECIPE_IMAGES_KEY = "recipe_custom_images";
const LAST_SYNC_KEY = "recipe_images_last_sync";
const SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes

// In-memory cache for fast access
let cachedImages: Record<string, string> = {};
let loaded = false;

/**
 * Load cached images from AsyncStorage
 */
async function loadCachedImages(): Promise<void> {
  if (loaded) return;
  try {
    const stored = await AsyncStorage.getItem(RECIPE_IMAGES_KEY);
    if (stored) {
      cachedImages = JSON.parse(stored);
    }
    loaded = true;
  } catch (e) {
    console.error("[RecipeImageSync] Failed to load cached images:", e);
  }
}

/**
 * Sync recipe images from server
 */
export async function syncRecipeImages(): Promise<void> {
  try {
    // Check if we need to sync
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (lastSync && Date.now() - parseInt(lastSync) < SYNC_INTERVAL) {
      // Already synced recently, just load cache
      await loadCachedImages();
      return;
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      await loadCachedImages();
      return;
    }

    const response = await fetch(`${baseUrl}/api/recipes/images`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const imageMap = await response.json();
      cachedImages = imageMap;
      loaded = true;
      await AsyncStorage.setItem(RECIPE_IMAGES_KEY, JSON.stringify(imageMap));
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } else {
      // If server fails, use cached data
      await loadCachedImages();
    }
  } catch (e) {
    // Network error - use cached data
    await loadCachedImages();
  }
}

/**
 * Get custom image URL for a recipe (if uploaded via admin dashboard)
 * Returns null if no custom image exists
 */
export function getRecipeCustomImage(recipeId: string): string | null {
  return cachedImages[recipeId] || null;
}

/**
 * Check if a recipe has a custom uploaded image
 */
export function hasCustomImage(recipeId: string): boolean {
  return !!cachedImages[recipeId];
}

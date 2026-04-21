/**
 * Recipe Image Sync - Fetches updated recipe images from the server
 * When admin uploads a new image via the dashboard, the app fetches it on next open
 * 
 * Only stores HTTP URLs (uploaded images), NOT local category names like "kurdish-dishes"
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const RECIPE_IMAGES_KEY = "recipe_custom_images_v2";
const LAST_SYNC_KEY = "recipe_images_last_sync_v2";
const SYNC_INTERVAL = 2 * 60 * 1000; // Sync every 2 minutes (was 5)

// In-memory cache for fast access
let cachedImages: Record<string, string> = {};
let loaded = false;
let syncing = false;

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
    loaded = true;
  }
}

/**
 * Check if a value is an uploaded image URL (not a local category name)
 */
function isUploadedImageUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

/**
 * Sync recipe images from server
 * Only caches HTTP URLs (uploaded images from admin panel)
 */
export async function syncRecipeImages(): Promise<void> {
  // Prevent concurrent syncs
  if (syncing) return;
  syncing = true;

  try {
    // Always load cache first
    await loadCachedImages();

    // Check if we need to sync from server
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (lastSync && Date.now() - parseInt(lastSync) < SYNC_INTERVAL) {
      return;
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[RecipeImageSync] No API base URL available");
      return;
    }

    console.log("[RecipeImageSync] Syncing from:", baseUrl);

    const response = await fetch(`${baseUrl}/api/recipes/images`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const imageMap: Record<string, string> = await response.json();
      
      // IMPORTANT: Only cache HTTP URLs (uploaded images), NOT local category names
      const httpImages: Record<string, string> = {};
      let uploadedCount = 0;
      for (const [recipeId, imageValue] of Object.entries(imageMap)) {
        if (isUploadedImageUrl(imageValue)) {
          httpImages[recipeId] = imageValue;
          uploadedCount++;
        }
      }

      cachedImages = httpImages;
      loaded = true;
      await AsyncStorage.setItem(RECIPE_IMAGES_KEY, JSON.stringify(httpImages));
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      console.log(`[RecipeImageSync] Synced ${uploadedCount} uploaded images`);
    } else {
      console.warn("[RecipeImageSync] Server returned:", response.status);
    }
  } catch (e) {
    console.warn("[RecipeImageSync] Sync error:", e);
  } finally {
    syncing = false;
  }
}

/**
 * Force sync - bypasses the time check
 * Call this after uploading a new image
 */
export async function forceSyncRecipeImages(): Promise<void> {
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
  await syncRecipeImages();
}

/**
 * Get custom image URL for a recipe (if uploaded via admin dashboard)
 * Returns null if no custom uploaded image exists
 */
export function getRecipeCustomImage(recipeId: string): string | null {
  const url = cachedImages[recipeId];
  // Double-check it's a real URL, not a category name
  if (url && isUploadedImageUrl(url)) {
    return url;
  }
  return null;
}

/**
 * Check if a recipe has a custom uploaded image
 */
export function hasCustomImage(recipeId: string): boolean {
  return !!getRecipeCustomImage(recipeId);
}

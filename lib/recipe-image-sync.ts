/**
 * Recipe Image Sync - Fetches updated recipe images from the server
 * When admin uploads a new image via the dashboard, the app fetches it on next open
 * 
 * Only stores HTTP URLs (uploaded images), NOT local category names like "kurdish-dishes"
 * 
 * Uses a listener pattern so React components can re-render when images are synced.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const RECIPE_IMAGES_KEY = "recipe_custom_images_v3";
const LAST_SYNC_KEY = "recipe_images_last_sync_v3";
const SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes max

// In-memory cache for fast access
let cachedImages: Record<string, string> = {};
let loaded = false;
let syncing = false;
let lastSyncTime = 0;

// Listener pattern for reactivity
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeRecipeImages(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

/**
 * Load cached images from AsyncStorage into memory
 */
async function loadCachedImages(): Promise<void> {
  if (loaded) return;
  try {
    const stored = await AsyncStorage.getItem(RECIPE_IMAGES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        cachedImages = parsed;
        console.log(`[RecipeImageSync] Loaded ${Object.keys(cachedImages).length} cached images from storage`);
      }
    }
  } catch (e) {
    console.error("[RecipeImageSync] Failed to load cached images:", e);
  }
  loaded = true;
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

    // If cache is empty, ALWAYS sync (don't respect interval)
    const cacheIsEmpty = Object.keys(cachedImages).length === 0;
    
    // Check if we need to sync from server (skip interval check if cache is empty)
    if (!cacheIsEmpty) {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSync && Date.now() - parseInt(lastSync) < SYNC_INTERVAL) {
        // Notify listeners with existing cached data
        notifyListeners();
        return;
      }
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[RecipeImageSync] No API base URL available");
      // Still notify with whatever we have
      if (!cacheIsEmpty) notifyListeners();
      return;
    }

    console.log("[RecipeImageSync] Syncing from:", baseUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(`${baseUrl}/api/recipes/images`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

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
      lastSyncTime = Date.now();
      await AsyncStorage.setItem(RECIPE_IMAGES_KEY, JSON.stringify(httpImages));
      await AsyncStorage.setItem(LAST_SYNC_KEY, lastSyncTime.toString());
      console.log(`[RecipeImageSync] Synced ${uploadedCount} uploaded images successfully`);
      
      // Notify all listening components to re-render
      notifyListeners();
    } else {
      console.warn("[RecipeImageSync] Server returned:", response.status);
      // Still notify with cached data
      if (!cacheIsEmpty) notifyListeners();
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      console.warn("[RecipeImageSync] Sync timed out");
    } else {
      console.warn("[RecipeImageSync] Sync error:", e?.message || e);
    }
    // Notify with whatever cached data we have
    if (Object.keys(cachedImages).length > 0) notifyListeners();
  } finally {
    syncing = false;
  }
}

/**
 * Force sync - bypasses the time check
 * Call this after uploading a new image or when screen opens
 */
export async function forceSyncRecipeImages(): Promise<void> {
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
  lastSyncTime = 0;
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

/**
 * Get all cached images (for hook usage)
 */
export function getAllCachedImages(): Record<string, string> {
  return { ...cachedImages };
}

/**
 * Get the count of cached images
 */
export function getCachedImageCount(): number {
  return Object.keys(cachedImages).length;
}

/**
 * Ensure images are loaded from AsyncStorage (call before first render)
 * Also triggers a sync if cache is empty
 */
export async function ensureImagesLoaded(): Promise<void> {
  await loadCachedImages();
  // If cache is empty after loading, trigger a sync
  if (Object.keys(cachedImages).length === 0 && !syncing) {
    // Don't await - let it happen in background
    syncRecipeImages().catch(() => {});
  }
}

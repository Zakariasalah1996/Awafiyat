/**
 * Recipe images - global cache approach.
 * Images are pre-loaded from AsyncStorage at module init time,
 * so they are available immediately on first render.
 */
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECIPE_IMAGES_KEY = "recipe_custom_images_v4";
const API_URL = "https://alfafiyat.com/api/recipes/images";

// Module-level cache - shared across all component instances
let _globalImages: Record<string, string> = {};
let _fetchState: "idle" | "loading" | "done" = "idle";
let _listeners: Array<(images: Record<string, string>) => void> = [];

function notifyListeners(images: Record<string, string>) {
  _globalImages = images;
  _listeners.forEach((fn) => fn(images));
}

// Pre-load from AsyncStorage immediately when module is imported
// This runs before any component renders, so images are ready on first render
AsyncStorage.getItem(RECIPE_IMAGES_KEY)
  .then((stored) => {
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Object.keys(parsed).length > 0) {
        _globalImages = parsed;
        // Notify any already-mounted listeners
        _listeners.forEach((fn) => fn(parsed));
      }
    }
  })
  .catch(() => {});

async function fetchAndCacheImages() {
  if (_fetchState === "loading") return;
  _fetchState = "loading";

  // Fetch fresh from server
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (response.ok) {
      const data: Record<string, string> = await response.json();

      // Keep only HTTP URLs (uploaded images, not category names)
      const httpImages: Record<string, string> = {};
      for (const [id, val] of Object.entries(data)) {
        if (val && (val.startsWith("http://") || val.startsWith("https://"))) {
          httpImages[id] = val;
        }
      }

      if (Object.keys(httpImages).length > 0) {
        notifyListeners(httpImages);
        await AsyncStorage.setItem(RECIPE_IMAGES_KEY, JSON.stringify(httpImages));
        console.log(`[RecipeImages] Loaded ${Object.keys(httpImages).length} images`);
      }
    }
  } catch (e: any) {
    console.warn("[RecipeImages] Fetch error:", e?.message);
  }

  _fetchState = "done";
}

/**
 * Hook that returns the current recipe images map.
 * Images are pre-loaded from cache so they appear immediately on first render.
 */
export function useRecipeImages(): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>(_globalImages);

  useEffect(() => {
    // Subscribe to updates
    const listener = (newImages: Record<string, string>) => {
      setImages({ ...newImages });
    };
    _listeners.push(listener);

    // Sync current global state in case it was updated before this component mounted
    if (Object.keys(_globalImages).length > 0) {
      setImages({ ..._globalImages });
    }

    // Trigger server fetch (only runs once globally)
    if (_fetchState === "idle") {
      fetchAndCacheImages();
    }

    return () => {
      _listeners = _listeners.filter((fn) => fn !== listener);
    };
  }, []);

  return images;
}

/**
 * Force refresh images from server (call after uploading a new image).
 */
export async function refreshRecipeImages() {
  _fetchState = "idle";
  await fetchAndCacheImages();
}

/**
 * Returns a version counter (for backward compatibility).
 */
export function useRecipeImagesVersion(): number {
  const images = useRecipeImages();
  return Object.keys(images).length;
}

/**
 * Get custom image URL for a specific recipe from the images map.
 */
export function getImageFromMap(
  images: Record<string, string>,
  recipeId: string
): string | null {
  const url = images[recipeId];
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return null;
}

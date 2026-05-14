/**
 * Recipe images - global cache approach.
 * Images are fetched once and stored in a module-level variable.
 * All components share the same data and re-render when it updates.
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

async function fetchAndCacheImages() {
  if (_fetchState === "loading") return;
  _fetchState = "loading";

  // Load from AsyncStorage first (instant display)
  try {
    const stored = await AsyncStorage.getItem(RECIPE_IMAGES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Object.keys(parsed).length > 0) {
        notifyListeners(parsed);
      }
    }
  } catch (_e) {}

  // Always fetch fresh from server
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
 * Fetches from server on first use, then serves from cache.
 */
export function useRecipeImages(): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>(_globalImages);

  useEffect(() => {
    // Subscribe to updates
    const listener = (newImages: Record<string, string>) => {
      setImages({ ...newImages });
    };
    _listeners.push(listener);

    // Trigger fetch (only runs once globally)
    if (_fetchState === "idle") {
      fetchAndCacheImages();
    } else if (_fetchState === "done" && Object.keys(_globalImages).length > 0) {
      // Already loaded - update state immediately
      setImages({ ..._globalImages });
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

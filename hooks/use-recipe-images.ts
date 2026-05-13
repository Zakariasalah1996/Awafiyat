/**
 * Hook to reactively get recipe custom images.
 * Fetches images directly from the server and stores them in state.
 * This ensures images are always available when the component renders.
 */
import { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const RECIPE_IMAGES_KEY = "recipe_custom_images_v3";

/**
 * Hook that fetches and returns recipe images map.
 * Components using this hook will re-render when images are loaded.
 */
export function useRecipeImages(): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      // Step 1: Load from AsyncStorage immediately
      try {
        const stored = await AsyncStorage.getItem(RECIPE_IMAGES_KEY);
        if (stored && mounted) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
            setImages(parsed);
            console.log(`[useRecipeImages] Loaded ${Object.keys(parsed).length} images from cache`);
          }
        }
      } catch (e) {
        console.warn("[useRecipeImages] Failed to load from cache:", e);
      }

      // Step 2: Fetch fresh data from server (always, to ensure up-to-date)
      if (fetchedRef.current) return; // Don't fetch twice
      fetchedRef.current = true;

      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) {
          console.warn("[useRecipeImages] No API base URL");
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${baseUrl}/api/recipes/images`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok && mounted) {
          const imageMap: Record<string, string> = await response.json();
          
          // Filter only HTTP URLs (uploaded images)
          const httpImages: Record<string, string> = {};
          for (const [recipeId, imageValue] of Object.entries(imageMap)) {
            if (imageValue && (imageValue.startsWith("http://") || imageValue.startsWith("https://"))) {
              httpImages[recipeId] = imageValue;
            }
          }

          if (Object.keys(httpImages).length > 0) {
            setImages(httpImages);
            // Save to AsyncStorage for next time
            await AsyncStorage.setItem(RECIPE_IMAGES_KEY, JSON.stringify(httpImages));
            console.log(`[useRecipeImages] Fetched ${Object.keys(httpImages).length} images from server`);
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.warn("[useRecipeImages] Fetch error:", e?.message || e);
        }
      }
    };

    loadImages();

    return () => { mounted = false; };
  }, []);

  return images;
}

/**
 * Returns a version counter that increments whenever recipe images are synced.
 * DEPRECATED: Use useRecipeImages() instead for direct access to image map.
 * Kept for backward compatibility.
 */
export function useRecipeImagesVersion(): number {
  const images = useRecipeImages();
  return Object.keys(images).length;
}

/**
 * Get custom image URL for a specific recipe from the images map.
 */
export function getImageFromMap(images: Record<string, string>, recipeId: string): string | null {
  const url = images[recipeId];
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return null;
}

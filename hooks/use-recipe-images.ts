/**
 * Hook to reactively get recipe custom images.
 * Re-renders the component when images are synced from the server.
 */
import { useEffect, useState, useCallback } from "react";
import {
  getRecipeCustomImage,
  subscribeRecipeImages,
  ensureImagesLoaded,
} from "@/lib/recipe-image-sync";

/**
 * Returns a version counter that increments whenever recipe images are synced.
 * Use this to force re-render of components that display recipe images.
 */
export function useRecipeImagesVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Load from AsyncStorage on mount
    ensureImagesLoaded().then(() => setVersion((v) => v + 1));

    // Subscribe to future syncs
    const unsubscribe = subscribeRecipeImages(() => {
      setVersion((v) => v + 1);
    });

    return unsubscribe;
  }, []);

  return version;
}

/**
 * Returns the custom image URL for a recipe, reactively updated when sync completes.
 */
export function useRecipeImage(recipeId: string): string | null {
  const version = useRecipeImagesVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return getRecipeCustomImage(recipeId);
}

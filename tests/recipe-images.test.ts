import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  queries: [] as Array<{ text: string; params?: unknown[] }>,
}));

vi.mock("pg", () => ({
  Pool: class MockPool {
    async query(text: string, params?: unknown[]) {
      state.queries.push({ text, params });
      if (text.includes('SELECT "recipeId", "imageUrl"')) {
        return {
          rows: [
            {
              recipeId: "recipe-2",
              imageUrl: "https://cdn.example.com/recipe-2.jpg",
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    }
  },
}));

describe("recipe image override store", () => {
  it("creates an isolated table and upserts only the selected recipe", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/awafiyat_test";
    const store = await import("../server/recipe-image-store");

    expect(store.isPostgresRecipeImageStoreEnabled()).toBe(true);
    await store.savePostgresRecipeImage(
      "recipe-1",
      "https://cdn.example.com/recipe-1.jpg",
    );

    expect(
      state.queries.some(({ text }) =>
        text.includes("CREATE TABLE IF NOT EXISTS awafiyat_recipe_images"),
      ),
    ).toBe(true);
    const upsert = state.queries.find(({ text }) =>
      text.includes('ON CONFLICT ("recipeId") DO UPDATE'),
    );
    expect(upsert?.params).toEqual([
      "recipe-1",
      "https://cdn.example.com/recipe-1.jpg",
    ]);

    const images = await store.getPostgresRecipeImages();
    expect(images).toEqual({
      "recipe-2": "https://cdn.example.com/recipe-2.jpg",
    });
  });

  it("rejects an unsafe URL instead of changing another recipe", async () => {
    const store = await import("../server/recipe-image-store");
    await expect(
      store.savePostgresRecipeImage("recipe-1", "http://unsafe.example/image.jpg"),
    ).rejects.toThrow("Recipe images must use HTTPS");
  });
});

describe("recipe image API and app cache contract", () => {
  it("returns overrides only and sends recipeId with direct dashboard uploads", () => {
    const root = resolve(import.meta.dirname, "..");
    const server = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");
    const dashboard = readFileSync(resolve(root, "server/admin/index.html"), "utf8");
    const hook = readFileSync(resolve(root, "hooks/use-recipe-images.ts"), "utf8");

    expect(server).toContain("Returns admin-uploaded overrides only");
    expect(server).toContain("const imageMap = await loadRecipeImageOverrides();");
    expect(dashboard).toContain(
      "recipeId: document.getElementById('rmId').value.trim()",
    );
    expect(dashboard).not.toContain(
      "image: imageUrl || document.getElementById('rmImageUrl').value.trim()",
    );
    expect(hook).toContain('recipe_custom_images_v5');
    expect(hook).toContain("AsyncStorage.multiRemove(LEGACY_RECIPE_IMAGES_KEYS)");
    expect(hook).toContain("An empty map is meaningful");
  });

  it("resolves bundled recipe storage paths against the production API origin", () => {
    const root = resolve(import.meta.dirname, "..");
    const resolver = readFileSync(resolve(root, "lib/food-category-images.ts"), "utf8");

    expect(resolver).toContain('import { getApiBaseUrl } from "@/constants/oauth"');
    expect(resolver).toContain('value?.startsWith("/")');
    expect(resolver).toContain('`${apiBaseUrl}${value}`');
  });
});

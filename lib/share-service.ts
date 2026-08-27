import { Share } from "react-native";
import * as Linking from "expo-linking";

import {
  buildBeverageShareText,
  buildRecipeShareText,
  type ShareableBeverage,
  type ShareableRecipe,
} from "@/lib/share-content";

function createAppLink(pathname: string, params: Record<string, string>): string {
  return Linking.createURL(pathname, { queryParams: params });
}

export function getRecipeShareLink(recipeId: string): string {
  return createAppLink("/sections/recipe-detail", { id: recipeId });
}

export function getBeverageShareLink(beverageId: string): string {
  return createAppLink("/sections/beverages", { beverage: beverageId });
}

export async function shareRecipe(recipe: ShareableRecipe): Promise<void> {
  const link = getRecipeShareLink(recipe.id);
  await Share.share(
    {
      title: `وصفة ${recipe.name} | ألف عافيات`,
      message: buildRecipeShareText(recipe, link),
    },
    { dialogTitle: "مشاركة الوصفة" },
  );
}

export async function shareBeverage(beverage: ShareableBeverage): Promise<void> {
  const link = getBeverageShareLink(beverage.id);
  await Share.share(
    {
      title: `مشروب ${beverage.name} | ألف عافيات`,
      message: buildBeverageShareText(beverage, link),
    },
    { dialogTitle: "مشاركة المشروب" },
  );
}

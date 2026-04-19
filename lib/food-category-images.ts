// Auto-generated food category image mapping

export const FOOD_CATEGORY_IMAGES: Record<string, any> = {
  "iraqi-rice": require("@/assets/images/food-categories/iraqi-rice.jpg"),
  "iraqi-soups-and-stews": require("@/assets/images/food-categories/iraqi-soups-and-stews.jpg"),
  "grilled-meats-kebab-tikka-mashwi": require("@/assets/images/food-categories/grilled-meats-kebab-tikka-mashwi.jpg"),
  "fresh-salads": require("@/assets/images/food-categories/fresh-salads.jpg"),
  "iraqi-breakfast": require("@/assets/images/food-categories/iraqi-breakfast.jpg"),
  "iraqi-desserts-and-sweets": require("@/assets/images/food-categories/iraqi-desserts-and-sweets.jpg"),
  "chicken-dishes": require("@/assets/images/food-categories/chicken-dishes.jpg"),
  "fish-dishes": require("@/assets/images/food-categories/fish-dishes.jpg"),
  "iraqi-bread": require("@/assets/images/food-categories/iraqi-bread.jpg"),
  "legumes-and-beans": require("@/assets/images/food-categories/legumes-and-beans.jpg"),
  "stuffed-dishes": require("@/assets/images/food-categories/stuffed-dishes.jpg"),
  "healthy-smoothies-and-drinks": require("@/assets/images/food-categories/healthy-smoothies-and-drinks.jpg"),
  "hot-beverages": require("@/assets/images/food-categories/hot-beverages.jpg"),
  "vegetable-dishes": require("@/assets/images/food-categories/vegetable-dishes.jpg"),
  "kurdish-dishes": require("@/assets/images/food-categories/kurdish-dishes.jpg"),
  "gulf-cuisine": require("@/assets/images/food-categories/gulf-cuisine.jpg"),
  "dairy-and-eggs": require("@/assets/images/food-categories/dairy-and-eggs.jpg"),
  "healthy-snacks": require("@/assets/images/food-categories/healthy-snacks.jpg"),
  "pasta-and-noodles-iraqi-style": require("@/assets/images/food-categories/pasta-and-noodles-iraqi-style.jpg"),
  "pickles-and-appetizers": require("@/assets/images/food-categories/pickles-and-appetizers.jpg"),
  "meat-stews-casseroles": require("@/assets/images/food-categories/meat-stews-casseroles.jpg"),
  "fresh-fruits-and-natural-desserts": require("@/assets/images/food-categories/fresh-fruits-and-natural-desserts.jpg"),
};

export type FoodCategory = keyof typeof FOOD_CATEGORY_IMAGES;

export function getFoodCategoryImage(category: string): any {
  // If it's a URL (uploaded image from admin), return as URI object for expo-image
  if (category && (category.startsWith('http://') || category.startsWith('https://'))) {
    return { uri: category };
  }
  return FOOD_CATEGORY_IMAGES[category] || FOOD_CATEGORY_IMAGES['iraqi-rice'];
}

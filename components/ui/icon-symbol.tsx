// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "person.fill": "person",
  "person.crop.circle": "person-outline",
  "star.fill": "star",
  "diamond.fill": "diamond",
  "cart.fill": "shopping-cart",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "bell.fill": "notifications",
  "gear": "settings",
  "fork.knife": "restaurant",
  "flame.fill": "local-fire-department",
  "leaf.fill": "eco",
  "clock.fill": "schedule",
  "magnifyingglass": "search",
  "plus": "add",
  "xmark": "close",
  "checkmark": "check",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "refrigerator.fill": "kitchen",
  "list.bullet": "list",
  "chart.bar.fill": "bar-chart",
  "map.fill": "map",
  "bookmark.fill": "bookmark",
  "square.and.arrow.up": "share",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
  "info.circle": "info",
  "exclamationmark.triangle": "warning",
  "trash.fill": "delete",
  "pencil": "edit",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

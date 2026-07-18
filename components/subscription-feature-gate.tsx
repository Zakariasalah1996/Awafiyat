import { Platform, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface SubscriptionFeatureGateProps {
  emoji: string;
  title: string;
  description: string;
  buttonLabel: string;
}

export function SubscriptionFeatureGate({
  emoji,
  title,
  description,
  buttonLabel,
}: SubscriptionFeatureGateProps) {
  const colors = useColors();

  const openSubscription = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/(tabs)/subscription" as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-6 bg-background">
        <Text style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</Text>
        <Text
          className="text-2xl font-bold text-foreground text-center"
          style={{ marginBottom: 12, writingDirection: "rtl" }}
        >
          {title}
        </Text>
        <Text
          className="text-base text-muted text-center"
          style={{ lineHeight: 26, marginBottom: 24, writingDirection: "rtl" }}
        >
          {description}
        </Text>
        <TouchableOpacity
          onPress={openSubscription}
          className="rounded-2xl px-8 py-4 items-center"
          style={{ backgroundColor: colors.primary }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-bold">{buttonLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 py-2 px-4"
          activeOpacity={0.6}
        >
          <Text className="text-sm text-muted">رجوع</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

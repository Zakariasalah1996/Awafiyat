import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, I18nManager } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { requestNotificationPermissions, setupNotificationListeners, getSavedPushToken, registerPushToken, refreshAllAlarms } from "@/lib/notifications";
import { syncRecipeImages } from "@/lib/recipe-image-sync";
import { registerGuest } from "@/lib/guest-auth";
import { useRouter } from "expo-router";
import { AlarmProvider } from "@/lib/alarm-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { UserProvider } from "@/lib/user-context";
import * as Linking from "expo-linking";

// Force RTL for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutInner() {
  const router = useRouter();

  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
    // Sync recipe images from server on app start
    syncRecipeImages().catch((e) => console.warn("[RecipeImageSync] Error:", e));
    // Auto-register as guest user
    registerGuest().catch((e) => console.warn("[Guest] Error:", e));

    // فحص إذا التطبيق فُتح بواسطة المنبه الأصلي (expo-alarm-module)
    // عند رنين المنبه الأصلي، يفتح التطبيق تلقائياً → نشغّل شاشة المنبه الجميلة بالعربي
    if (Platform.OS === "android") {
      checkAlarmLaunch();
      // إعادة جدولة المنبهات بالأصوات الجديدة (يحذف القديمة ويعيد جدولتها)
      refreshAllAlarms().catch((e) => console.warn("[Alarm] Refresh failed:", e));
    }
  }, []);

  // فحص إذا التطبيق فُتح بواسطة المنبه (عبر زر "عرض الوصفة")
  // يذهب مباشرة لصفحة الوصفة - بدون شاشة منبه داخلية
  const checkAlarmLaunch = useCallback(async () => {
    try {
      const mealTypes = ["breakfast", "lunch", "dinner"] as const;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      for (const mealType of mealTypes) {
        const data = await AsyncStorage.getItem(`@alarm_data_${mealType}`);
        if (!data) continue;

        const alarmData = JSON.parse(data);
        const alarmHour = alarmData.hour;
        const alarmMinute = alarmData.minute;

        // إذا الوقت الحالي قريب من وقت المنبه (خلال 5 دقائق)
        const diffMinutes = Math.abs((currentHour * 60 + currentMinute) - (alarmHour * 60 + alarmMinute));
        if (diffMinutes <= 5 && alarmData.recipeId) {
          console.log(`[Alarm] App launched by native alarm: ${mealType}, navigating to recipe: ${alarmData.recipeId}`);
          // الذهاب مباشرة لصفحة الوصفة
          setTimeout(() => {
            router.push({
              pathname: "/sections/recipe-detail" as any,
              params: { id: alarmData.recipeId },
            });
          }, 1500); // انتظار ليكتمل تحميل التطبيق
          break;
        }
      }
    } catch (e) {
      console.warn("[Alarm] Check alarm launch error:", e);
    }
  }, [router]);

  // معالجة deep links من المنبه (عند الضغط على "عرض الوصفة")
  useEffect(() => {
    if (Platform.OS !== "android") return;

    // معالجة deep link إذا التطبيق فُتح من deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch((e) => console.warn("[DeepLink] getInitialURL error:", e));

    // الاستماع لـ deep links أثناء تشغيل التطبيق
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [router]);

  const handleDeepLink = useCallback((url: string) => {
    try {
      // نمط: manus20260413170437://sections/recipe-detail?id=recipe_123
      const parsed = Linking.parse(url);
      console.log("[DeepLink] Received:", url, "parsed:", JSON.stringify(parsed));
      if (parsed.path === "sections/recipe-detail" && parsed.queryParams?.id) {
        const recipeId = parsed.queryParams.id as string;
        console.log("[DeepLink] Navigating to recipe:", recipeId);
        setTimeout(() => {
          router.push({
            pathname: "/sections/recipe-detail" as any,
            params: { id: recipeId },
          });
        }, 500);
      }
    } catch (e) {
      console.warn("[DeepLink] Error handling deep link:", e);
    }
  }, [router]);

  // Auto-register push notifications on app start (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Request permissions and register push token automatically
    requestNotificationPermissions()
      .then(async (granted) => {
        console.log("[Push] Auto-registration result:", granted ? "granted" : "denied");
        // Also try to re-register saved token in case previous registration failed
        if (granted) {
          const savedToken = await getSavedPushToken();
          if (savedToken) {
            console.log("[Push] Re-registering saved token on startup...");
            await registerPushToken(savedToken);
          }
        }
      })
      .catch((err) => {
        console.warn("[Push] Auto-registration error:", err);
      });

    // Setup notification listeners
    // الإشعارات للنصائح والتحفيز والتسوق فقط - المنبه الأصلي يتكفل بالوجبات
    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log("[Push] Notification received:", notification.request.content.title);
      },
      (response) => {
        console.log("[Push] Notification tapped:", response.notification.request.content.title);
        const data = response.notification.request.content.data;
        if (data?.type === "shopping") {
          setTimeout(() => {
            router.push("/sections/shopping-list" as any);
          }, 500);
        }
      }
    );

    return cleanup;
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>

        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="oauth/callback" />
              <Stack.Screen name="sections/fridge" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/recipe-detail" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/recipes-library" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/calorie-calculator" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/health-tips" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/meal-planner" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/saved-recipes" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/shopping-list" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/tried-recipes" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/about" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/beverages" options={{ gestureEnabled: true }} />
              <Stack.Screen name="sections/family-members" options={{ gestureEnabled: true }} />
            </Stack>
            <StatusBar style="auto" />
          </QueryClientProvider>
        </trpc.Provider>
      </UserProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

// المكون الرئيسي يلف كل شيء بـ AlarmProvider
export default function RootLayout() {
  return (
    <AlarmProvider>
      <RootLayoutInner />
    </AlarmProvider>
  );
}

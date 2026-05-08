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
import {
  requestNotificationPermissions,
  setupNotificationListeners,
  getSavedPushToken,
  registerPushToken,
  refreshAllAlarms,
  ACTION_VIEW_RECIPE,
} from "@/lib/notifications";
import { syncRecipeImages } from "@/lib/recipe-image-sync";
import { registerGuest } from "@/lib/guest-auth";
import { useRouter } from "expo-router";
import { AlarmProvider } from "@/lib/alarm-context";
import { MedicationProvider } from "@/lib/medication-context";
import { WaterProvider } from "@/lib/water-context";
import { setupWaterChannel, setupWaterNotificationActions } from "@/lib/water-notifications";
import {
  setupMedicationChannel,
  setupMedicationNotificationActions,
  handleMedicationNotificationResponse,
} from "@/lib/medication-notifications";
import * as Notifications from "expo-notifications";
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
  }, []);

  // Auto-register push notifications on app start (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Request permissions and register push token automatically
    requestNotificationPermissions()
      .then(async (granted) => {
        console.log("[Push] Auto-registration result:", granted ? "granted" : "denied");
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

    // إعادة جدولة الإشعارات بالإعدادات الحالية عند فتح التطبيق
    refreshAllAlarms().catch((e) => console.warn("[Notifications] Refresh failed:", e));

    // إعداد قناة إشعارات الدواء وأزرار التفاعل
    setupMedicationChannel().catch((e) => console.warn("[MedNotif] Channel setup failed:", e));
    setupMedicationNotificationActions().catch((e) => console.warn("[MedNotif] Actions setup failed:", e));

    // إعداد قناة إشعارات شرب الماء
    setupWaterChannel().catch((e) => console.warn("[WaterNotif] Channel setup failed:", e));
    setupWaterNotificationActions().catch((e) => console.warn("[WaterNotif] Actions setup failed:", e));

    // Setup notification listeners
    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log("[Notifications] Received:", notification.request.content.title);
      },
      (response) => {
        // معالجة ضغط الأزرار التفاعلية
        handleNotificationResponse(response);
      }
    );

    // التحقق من آخر استجابة (إذا التطبيق كان مغلقاً)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return cleanup;
  }, []);

  // معالجة استجابة الإشعار (ضغط زر أو ضغط على الإشعار نفسه)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;

      console.log("[Notifications] Response:", actionId, "data:", JSON.stringify(data));

      // إذا ضغط "عرض الوصفة" أو ضغط على الإشعار مباشرة (DEFAULT_ACTION_IDENTIFIER)
      if (
        actionId === ACTION_VIEW_RECIPE ||
        actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        if (data?.recipeId) {
          const recipeId = data.recipeId as string;
          console.log("[Notifications] Navigating to recipe:", recipeId);
          setTimeout(() => {
            router.push({
              pathname: "/sections/recipe-detail" as any,
              params: { id: recipeId },
            });
          }, 1000);
        }
      }
      // إذا ضغط "إيقاف" - لا نفعل شيئاً (الإشعار يُغلق تلقائياً)

      // معالجة إشعارات الدواء
      if (data?.type === "medication_reminder") {
        handleMedicationNotificationResponse(response);
        return;
      }
    },
    [router]
  );

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
              <Stack.Screen name="sections/leftovers-renew" options={{ gestureEnabled: true }} />
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

// المكون الرئيسي يلف كل شيء بـ AlarmProvider + MedicationProvider + WaterProvider
export default function RootLayout() {
  return (
    <AlarmProvider>
      <MedicationProvider>
        <WaterProvider>
          <RootLayoutInner />
        </WaterProvider>
      </MedicationProvider>
    </AlarmProvider>
  );
}

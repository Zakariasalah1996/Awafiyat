/**
 * Guest Auto-Registration
 * Automatically registers the user as a guest in the database
 * without requiring OAuth login. Uses a unique device ID.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

const GUEST_ID_KEY = "guest_device_id";
const GUEST_USER_ID_KEY = "guest_user_id";
const GUEST_REGISTERED_KEY = "guest_registered";

/**
 * Generate a unique device ID for guest registration
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const platform = Platform.OS;
  return `${platform}_${timestamp}_${random}`;
}

/**
 * Get or create a persistent device ID
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await AsyncStorage.setItem(GUEST_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the stored guest user ID (server-side ID)
 */
export async function getGuestUserId(): Promise<number | null> {
  const id = await AsyncStorage.getItem(GUEST_USER_ID_KEY);
  return id ? parseInt(id) : null;
}

/**
 * Register as guest automatically on app start
 * Returns the server-side user ID
 */
export async function registerGuest(): Promise<number | null> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[Guest] No API base URL available");
      return null;
    }

    const deviceId = await getDeviceId();

    // Get user profile info from AsyncStorage if available
    let name = "مستخدم عافيات";
    let country = "iraq";
    try {
      // Try the correct key first (@awafiyat_user_profile), then fallback to legacy key
      let profileStr = await AsyncStorage.getItem("@awafiyat_user_profile");
      if (!profileStr) {
        profileStr = await AsyncStorage.getItem("user_profile");
      }
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.name) name = profile.name;
        if (profile.country) country = profile.country;
      }
    } catch {}

    const response = await fetch(`${baseUrl}/api/user/register-guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        name,
        country,
        platform: Platform.OS,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.userId) {
        await AsyncStorage.setItem(GUEST_USER_ID_KEY, data.userId.toString());
        await AsyncStorage.setItem(GUEST_REGISTERED_KEY, "true");
        console.log("[Guest] Registered successfully:", {
          userId: data.userId,
          isNew: data.isNew,
        });
        return data.userId;
      }
    } else {
      console.warn("[Guest] Registration failed:", response.status);
    }

    return null;
  } catch (e) {
    console.warn("[Guest] Registration error:", e);
    return null;
  }
}

/**
 * Check if guest is already registered
 */
export async function isGuestRegistered(): Promise<boolean> {
  const registered = await AsyncStorage.getItem(GUEST_REGISTERED_KEY);
  return registered === "true";
}

/**
 * Send heartbeat to track active users
 * Call this on app open and when app comes to foreground
 */
export async function sendHeartbeat(): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;
    const deviceId = await getDeviceId();
    const userId = await getGuestUserId();
    await fetch(`${baseUrl}/api/user/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, userId, platform: Platform.OS }),
    });
  } catch (_) {
    // Silent - heartbeat should never crash the app
  }
}

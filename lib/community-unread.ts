import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCommunityPosts } from "@/lib/community-api";

const LAST_VISIT_KEY = "@awafiyat_community_last_visit";
const listeners = new Set<(count: number) => void>();

function emit(count: number) {
  listeners.forEach((listener) => listener(count));
}

export function subscribeToCommunityUnread(listener: (count: number) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshCommunityUnreadCount(): Promise<number> {
  const lastVisit = await AsyncStorage.getItem(LAST_VISIT_KEY);
  if (!lastVisit) {
    await AsyncStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    emit(0);
    return 0;
  }

  const since = new Date(lastVisit).getTime();
  const posts = await getCommunityPosts();
  const unread = posts.filter((post) => new Date(post.createdAt).getTime() > since).length;
  emit(unread);
  return unread;
}

export async function markCommunityAsRead() {
  await AsyncStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  emit(0);
}

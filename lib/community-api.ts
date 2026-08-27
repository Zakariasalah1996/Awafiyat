import { getApiBaseUrl } from "@/constants/oauth";
import { getDeviceId, getGuestUserId, registerGuest } from "@/lib/guest-auth";

export type CommunityPost = {
  id: number;
  authorId: number;
  authorName: string;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
};

export type CommunityComment = {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("تعذر الوصول إلى خادم المجتمع");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "تعذر إتمام الطلب");
  return payload as T;
}

async function requireCommunityUserId(): Promise<number> {
  // Refresh registration so a name saved in "حسابي" is the fixed server-side author name.
  const userId = (await registerGuest()) ?? (await getGuestUserId());
  if (!userId) throw new Error("تعذر التحقق من الحساب، حاول مرة أخرى");
  return userId;
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const deviceId = await getDeviceId();
  const result = await api<{ posts: CommunityPost[] }>(`/api/community/posts?deviceId=${encodeURIComponent(deviceId)}`);
  return result.posts;
}

export async function publishCommunityPost(input: { body: string; imageData?: string; contentType?: string }): Promise<CommunityPost> {
  const userId = await requireCommunityUserId();
  const result = await api<{ post: CommunityPost }>("/api/community/posts", {
    method: "POST",
    body: JSON.stringify({ userId, ...input }),
  });
  return result.post;
}

export async function togglePostLike(postId: number): Promise<boolean> {
  const deviceId = await getDeviceId();
  const result = await api<{ liked: boolean }>(`/api/community/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
  return result.liked;
}

export async function getPostComments(postId: number): Promise<CommunityComment[]> {
  const result = await api<{ comments: CommunityComment[] }>(`/api/community/posts/${postId}/comments`);
  return result.comments;
}

export async function publishPostComment(postId: number, body: string): Promise<CommunityComment> {
  const userId = await requireCommunityUserId();
  const result = await api<{ comment: CommunityComment }>(`/api/community/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ userId, body }),
  });
  return result.comment;
}

export async function getCommunityCurrentUserId() { return requireCommunityUserId(); }

export async function updateCommunityPost(postId: number, body: string): Promise<CommunityPost> {
  const userId = await requireCommunityUserId();
  const result = await api<{ post: CommunityPost }>(`/api/community/posts/${postId}`, { method: "PATCH", body: JSON.stringify({ userId, body }) });
  return result.post;
}

export async function deleteCommunityPost(postId: number): Promise<void> {
  const userId = await requireCommunityUserId();
  await api(`/api/community/posts/${postId}`, { method: "DELETE", body: JSON.stringify({ userId }) });
}

export async function reportCommunityPost(postId: number, reason: string): Promise<void> {
  const deviceId = await getDeviceId();
  await api(`/api/community/posts/${postId}/report`, { method: "POST", body: JSON.stringify({ deviceId, reason }) });
}

export async function reportCommunityComment(commentId: number, reason: string): Promise<void> {
  const deviceId = await getDeviceId();
  await api(`/api/community/comments/${commentId}/report`, { method: "POST", body: JSON.stringify({ deviceId, reason }) });
}

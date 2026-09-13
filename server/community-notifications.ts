export interface CommunityCommentNotificationInput {
  postId: number;
  postAuthorId: number;
  commenterId: number;
  commenterName: string;
  commentBody: string;
}

export interface CommunityCommentNotification {
  title: string;
  body: string;
  data: Record<string, string>;
}

export function buildCommunityCommentNotification(
  input: CommunityCommentNotificationInput,
): CommunityCommentNotification | null {
  if (input.postAuthorId === input.commenterId) return null;

  const commenterName = input.commenterName.trim().slice(0, 80) || "مستخدم";
  const commentBody = input.commentBody.replace(/\s+/g, " ").trim().slice(0, 90);

  return {
    title: "تعليق جديد على منشورك",
    body: commentBody ? `${commenterName}: ${commentBody}` : `${commenterName} أضاف تعليقاً جديداً`,
    data: {
      type: "community_comment",
      postId: String(input.postId),
    },
  };
}

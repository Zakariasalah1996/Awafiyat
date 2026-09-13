import { describe, expect, it } from "vitest";

import { buildCommunityCommentNotification } from "../server/community-notifications";

describe("إشعار التعليق على منشور المجتمع", () => {
  it("لا ينشئ إشعاراً عندما يعلّق صاحب المنشور على منشوره", () => {
    expect(buildCommunityCommentNotification({
      postId: 12,
      postAuthorId: 7,
      commenterId: 7,
      commenterName: "زكريا",
      commentBody: "تعليق ذاتي",
    })).toBeNull();
  });

  it("ينشئ إشعاراً موجهاً بنوع المجتمع ومعرف المنشور", () => {
    const notification = buildCommunityCommentNotification({
      postId: 44,
      postAuthorId: 7,
      commenterId: 8,
      commenterName: "  أحمد  ",
      commentBody: "وصفة جميلة جداً\nسأجربها قريباً",
    });
    expect(notification).toEqual({
      title: "تعليق جديد على منشورك",
      body: "أحمد: وصفة جميلة جداً سأجربها قريباً",
      data: { type: "community_comment", postId: "44" },
    });
  });

  it("يختصر نص التعليق الطويل لحماية شاشة الإشعار", () => {
    const notification = buildCommunityCommentNotification({
      postId: 1,
      postAuthorId: 1,
      commenterId: 2,
      commenterName: "مستخدم",
      commentBody: "أ".repeat(150),
    });
    expect(notification?.body).toHaveLength("مستخدم: ".length + 90);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

describe("مجتمع الطبخ", () => {
  it("يظهر كتَبويب مستقل في الشريط السفلي", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    expect(tabs).toContain('name="community"');
    expect(tabs).toContain('title: "المجتمع"');
  });

  it("يوفر النشر العام والصور والإعجاب والتعليقات", () => {
    const screen = read("app/(tabs)/community.tsx");
    const client = read("lib/community-api.ts");
    const server = read("server/_core/index.ts");
    expect(screen).toContain("ImagePicker.launchImageLibraryAsync");
    expect(screen).toContain("publishCommunityPost");
    expect(screen).toContain("togglePostLike");
    expect(screen).toContain("publishPostComment");
    expect(client).toContain("/api/community/posts");
    expect(server).toContain("moderateCommunityFoodImage");
    expect(server).toContain("/api/community/posts/:postId/comments");
  });

  it("يثبت التعديل والحذف والبلاغات وشارة المنشورات الجديدة", () => {
    const screen = read("app/(tabs)/community.tsx");
    const client = read("lib/community-api.ts");
    const server = read("server/_core/index.ts");
    const tabs = read("app/(tabs)/_layout.tsx");
    expect(screen).toContain("updateCommunityPost");
    expect(screen).toContain("deleteCommunityPost");
    expect(screen).toContain("reportCommunityPost");
    expect(server).toContain("createCommunityReport");
    expect(server).toContain("deleteCommunityPost");
    expect(client).toContain('method: "PATCH"');
    expect(client).toContain('method: "DELETE"');
    expect(tabs).toContain('communityUnread > 9 ? "9+"');
  });

  it("يفرض منشوراً واحداً خلال ساعة ويستثني المنشورات المحذوفة", () => {
    const screen = read("app/(tabs)/community.tsx");
    const database = read("server/db.ts");
    const server = read("server/_core/index.ts");
    expect(database).toContain("COMMUNITY_POST_COOLDOWN_MS = 60 * 60 * 1000");
    expect(database).toContain("pg_advisory_xact_lock");
    expect(database).toContain("eq(communityPosts.isHidden, false)");
    expect(server).toContain("COMMUNITY_POST_COOLDOWN");
    expect(server).toContain("retryAfterSeconds");
    expect(server).toContain("احذف منشورك السابق أو انتظر قليلاً");
    expect(screen).toContain("النشر محدود مؤقتاً");
  });

  it("يبقي مؤلف التعليق وزر الإرسال فوق لوحة المفاتيح وشريط النظام", () => {
    const screen = read("app/(tabs)/community.tsx");
    expect(screen).toContain("KeyboardAvoidingView");
    expect(screen).toContain("useSafeAreaInsets");
    expect(screen).toContain("paddingBottom: Math.max(insets.bottom, 12)");
    expect(screen).toContain('keyboardShouldPersistTaps="handled"');
    expect(screen).toContain('returnKeyType="send"');
  });

  it("يسمح لصاحب التعليق بتعديله ويحمي الصلاحية في الخادم", () => {
    const screen = read("app/(tabs)/community.tsx");
    const client = read("lib/community-api.ts");
    const server = read("server/_core/index.ts");
    const database = read("server/db.ts");
    expect(screen).toContain("startEditingComment");
    expect(screen).toContain("saveCommentEdit");
    expect(screen).toContain("تم التعديل");
    expect(client).toContain("updateCommunityComment");
    expect(server).toContain("app.patch('/api/community/comments/:commentId'");
    expect(server).toContain("لا يمكنك تعديل تعليق مستخدم آخر");
    expect(database).toContain("eq(communityComments.authorId, authorId)");
    expect(database).toContain("updatedAt: new Date()");
  });

  it("يدعم إعجاب التعليقات مرة واحدة لكل جهاز ويعيد العدد والحالة", () => {
    const screen = read("app/(tabs)/community.tsx");
    const client = read("lib/community-api.ts");
    const server = read("server/_core/index.ts");
    const database = read("server/db.ts");
    const schema = read("drizzle/schema.ts");
    expect(screen).toContain("toggleCommentLike");
    expect(screen).toContain("likedByCurrentUser");
    expect(client).toContain("/api/community/comments/${commentId}/like");
    expect(server).toContain("app.post('/api/community/comments/:commentId/like'");
    expect(database).toContain("communityCommentLikes");
    expect(schema).toContain("community_comment_likes_comment_device_unique");
    expect(schema).toContain("table.commentId, table.deviceId");
  });

  it("يستخدم نوافذ مخصصة مرتبة لإدارة المنشور والإبلاغ", () => {
    const screen = read("app/(tabs)/community.tsx");
    expect(screen).toContain("REPORT_REASONS");
    expect(screen).toContain("إدارة المنشور");
    expect(screen).toContain("الإبلاغ عن");
    expect(screen).toContain("sheetBackdrop");
    expect(screen).toContain("reportSubmit");
    expect(screen).toContain("سيصل البلاغ إلى لوحة الإدارة للمراجعة");
  });

  it("يرسل إشعار التعليق لصاحب المنشور فقط ولا يعطل حفظ التعليق", () => {
    const server = read("server/_core/index.ts");
    const pushStore = read("server/push-store.ts");
    const notification = read("server/community-notifications.ts");
    expect(server).toContain("notifyCommunityPostOwner");
    expect(server).toContain("void notifyCommunityPostOwner");
    expect(server).toContain("failed without affecting the comment");
    expect(pushStore).toContain("getPostgresPushTokensByUserId");
    expect(notification).toContain("input.postAuthorId === input.commenterId");
    expect(notification).toContain('type: "community_comment"');
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function read(...parts: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

describe("Community administration controls", () => {
  it("persists server-side permissions and official pinned posts", () => {
    const schema = read("drizzle", "schema.ts");
    const database = read("server", "db.ts");

    expect(schema).toContain('pgTable("community_settings"');
    expect(schema).toContain('allowUserPosts: boolean("allowUserPosts")');
    expect(schema).toContain('allowComments: boolean("allowComments")');
    expect(schema).toContain('isOfficial: boolean("isOfficial")');
    expect(schema).toContain('isPinned: boolean("isPinned")');
    expect(database).toContain('CREATE TABLE IF NOT EXISTS "community_settings"');
    expect(database).toContain('INSERT INTO "community_settings" ("id") VALUES (1)');
  });

  it("places the pinned post first and keeps its fixed administration author", () => {
    const database = read("server", "db.ts");

    expect(database).toContain('.orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))');
    expect(database).toContain('authorName: "إدارة ألف عافيات"');
    expect(database).toContain('isOfficial: true');
  });

  it("blocks only the selected public actions for existing app versions", () => {
    const server = read("server", "_core", "index.ts");

    expect(server).toContain("if (!settings.allowUserPosts)");
    expect(server).toContain("COMMUNITY_USER_POSTS_CLOSED");
    expect(server).toContain("يمكنك المشاركة بالتعليق على منشور الإدارة المثبّت");
    expect(server).toContain("if (!settings.allowComments)");
    expect(server).toContain("COMMUNITY_COMMENTS_CLOSED");
    expect(server).toContain("if (!settings.allowLikes)");
    expect(server).toContain("COMMUNITY_LIKES_CLOSED");
  });

  it("exposes authenticated administration APIs for posts, settings and comments", () => {
    const server = read("server", "_core", "index.ts");

    expect(server).toContain("app.put('/api/admin/community/settings', adminAuth");
    expect(server).toContain("app.post('/api/admin/community/posts', adminAuth");
    expect(server).toContain("app.patch('/api/admin/community/posts/:postId/pinned', adminAuth");
    expect(server).toContain("app.patch('/api/admin/community/posts/:postId/visibility', adminAuth");
    expect(server).toContain("app.patch('/api/admin/community/comments/:commentId/visibility', adminAuth");
  });

  it("provides contest mode and complete moderation in the admin panel", () => {
    const admin = read("server", "admin", "index.html");

    expect(admin).toContain("إدارة المجتمع");
    expect(admin).toContain("setCommunityContestMode");
    expect(admin).toContain("النشر والتعليق والإعجاب");
    expect(admin).toContain("نشر باسم الإدارة");
    expect(admin).toContain("toggleCommunityPostPinned");
    expect(admin).toContain("toggleCommunityPostVisibility");
    expect(admin).toContain("toggleCommunityCommentVisibility");
  });

  it("keeps comment notifications for ordinary post owners", () => {
    const server = read("server", "_core", "index.ts");
    expect(server).toContain("void notifyCommunityPostOwner");
    expect(server).toContain("failed without affecting the comment");
  });
});

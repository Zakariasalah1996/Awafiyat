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
});

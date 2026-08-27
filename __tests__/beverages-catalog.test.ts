import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const beveragesSource = readFileSync(
  resolve(process.cwd(), "app/sections/beverages.tsx"),
  "utf8",
);

describe("كتالوج المشروبات", () => {
  const beverageIds = [...beveragesSource.matchAll(/id: "(bev_\d+)"/g)].map((match) => match[1]);
  const beverageNames = [...beveragesSource.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);

  it("يحتوي على مئة مشروب بمعرّفات متسلسلة وفريدة", () => {
    expect(beverageIds).toHaveLength(100);
    expect(new Set(beverageIds).size).toBe(100);
    expect(beverageIds).toEqual(Array.from({ length: 100 }, (_, index) => `bev_${index + 1}`));
  });

  it("يحافظ على تنوع الساخن والبارد والصحي والعادي", () => {
    expect((beveragesSource.match(/type: "hot"/g) ?? []).length).toBeGreaterThan(25);
    expect((beveragesSource.match(/type: "cold"/g) ?? []).length).toBeGreaterThan(50);
    expect((beveragesSource.match(/subtype: "healthy"/g) ?? []).length).toBeGreaterThan(55);
    expect((beveragesSource.match(/subtype: "regular"/g) ?? []).length).toBeGreaterThan(35);
  });

  it("يربط صوراً فريدة بكل المشروبات الجديدة من 76 إلى 100", () => {
    const expansionIds = Array.from({ length: 25 }, (_, index) => `bev_${index + 76}`);
    const imagePairs = [...beveragesSource.matchAll(/(bev_\d+): "(\/manus-storage\/bev-\d{3}-[^"]+\.jpg)"/g)];
    const imageById = new Map(imagePairs.map((match) => [match[1], match[2]]));

    expect(expansionIds.every((id) => Boolean(imageById.get(id)))).toBe(true);
    expect(new Set(expansionIds.map((id) => imageById.get(id))).size).toBe(25);
    expect(beverageNames).toContain("موكا باردة بالكاكاو");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeBasicProfile, sanitizeProfileField, validateBasicProfile } from "../lib/profile-validation";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

describe("نموذج معلومات حسابي", () => {
  it("ينظف الهاتف والعمر ويحد أطوال الحقول", () => {
    expect(sanitizeProfileField("age", "3a0 سنة")).toBe("30");
    expect(sanitizeProfileField("phone", "+964 abc 770-123")).toBe("+964  770-123");
    expect(sanitizeProfileField("name", "م".repeat(100))).toHaveLength(80);
  });

  it("يتحقق من الاسم والعمر الاختياريين", () => {
    expect(validateBasicProfile({ name: "ز", phone: "", age: "", gender: "" })).toContain("حرفين");
    expect(validateBasicProfile({ name: "زكريا", phone: "", age: "121", gender: "male" })).toContain("120");
    expect(validateBasicProfile({ name: "زكريا", phone: "", age: "30", gender: "male" })).toBeNull();
  });

  it("يحفظ جميع الحقول بضغطة واحدة وينتظر AsyncStorage فعلياً", () => {
    const screen = read("app/(tabs)/profile.tsx");
    const context = read("lib/user-context.tsx");
    const normalized = normalizeBasicProfile({ name: "  زكريا  ", phone: " +964 ", age: " 30 ", gender: "male" });
    expect(normalized).toEqual({ name: "زكريا", phone: "+964", age: "30", gender: "male" });
    expect(screen).toContain("حفظ التغييرات");
    expect(screen).toContain("المعلومات محفوظة");
    expect(screen).toContain("await updateProfile(normalized)");
    expect(screen).not.toContain("editingField");
    expect(context).toContain("await saveProfile(updated)");
  });
});

describe("أمثلة نموذج حسابي", () => {
  it("يستخدم مثال اسم عام ويترك حقل الهاتف بلا مثال", () => {
    const screen = read("app/(tabs)/profile.tsx");
    expect(screen).toContain('"مثال: الطباخة زهراء"');
    expect(screen).toContain('"رقم الهاتف (اختياري)", "phone", "", "phone-pad"');
    expect(screen).not.toContain("مثال: زكريا");
  });
});

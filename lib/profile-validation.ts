import type { UserProfile } from "@/lib/user-context";

export type BasicProfileDraft = Pick<UserProfile, "name" | "phone" | "age" | "gender">;

export function sanitizeProfileField(field: "name" | "phone" | "age", value: string): string {
  if (field === "age") return value.replace(/[^0-9]/g, "").slice(0, 3);
  if (field === "phone") return value.replace(/[^0-9+()\-\s]/g, "").slice(0, 24);
  return value.slice(0, 80);
}

export function normalizeBasicProfile(draft: BasicProfileDraft): BasicProfileDraft {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    age: draft.age.trim(),
    gender: draft.gender,
  };
}

export function validateBasicProfile(draft: BasicProfileDraft): string | null {
  if (draft.name.length > 0 && draft.name.length < 2) {
    return "اكتب اسماً من حرفين على الأقل، أو اترك الحقل فارغاً.";
  }
  if (draft.age) {
    const numericAge = Number(draft.age);
    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      return "اكتب عمراً صحيحاً بين 1 و120.";
    }
  }
  return null;
}

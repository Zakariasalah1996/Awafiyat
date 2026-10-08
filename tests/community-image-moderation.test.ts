import { describe, expect, it } from "vitest";

import { parseCommunityImageModerationResponse } from "../server/community-image-moderation";

describe("فاحص صور مجتمع الطبخ", () => {
  it("يقبل نتيجة JSON مكتملة لصورة طعام", () => {
    const result = parseCommunityImageModerationResponse({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: '{"confidence":0.95,"isFoodRelated":true,"reason":"طبق طعام واضح"}',
          },
        },
      ],
    });

    expect(result).toEqual({ accepted: true, reason: "" });
  });

  it("يعيد سبب الرفض عند كون الصورة غير مرتبطة بالطعام", () => {
    const result = parseCommunityImageModerationResponse({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: '{"confidence":0.99,"isFoodRelated":false,"reason":"الصورة شخصية"}',
          },
        },
      ],
    });

    expect(result).toEqual({ accepted: false, reason: "الصورة شخصية" });
  });

  it("يتعامل مع رد النموذج المبتور على أنه فشل قابل لإعادة المحاولة", () => {
    const result = parseCommunityImageModerationResponse({
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"confidence":0.95,"isFoodRelated":' },
        },
      ],
    });

    expect(result).toBeNull();
  });

  it("لا يقبل نتيجة ناقصة حتى لو كانت JSON صالحة", () => {
    const result = parseCommunityImageModerationResponse({
      choices: [
        {
          finish_reason: "stop",
          message: { content: '{"isFoodRelated":true}' },
        },
      ],
    });

    expect(result).toBeNull();
  });
});

export type CommunityImageModeration = {
  accepted: boolean;
  reason: string;
};

type ChatCompletionPayload = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: unknown;
    };
  }>;
};

const UNAVAILABLE_REASON = "تعذر فحص الصورة الآن، حاول بعد قليل";
const FOOD_ONLY_REASON = "نقبل فقط صور الطعام والمشروبات";

const moderationResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "community_food_image_check",
    strict: true,
    schema: {
      type: "object",
      properties: {
        isFoodRelated: { type: "boolean" },
        confidence: { type: "number" },
        reason: { type: "string" },
      },
      required: ["isFoodRelated", "confidence", "reason"],
      additionalProperties: false,
    },
  },
} as const;

function extractTextContent(content: unknown): string | null {
  if (typeof content === "string" && content.trim()) return content.trim();

  // Keep compatibility with providers that return Chat Completions content as parts.
  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const candidate = part as { text?: unknown; content?: unknown };
        if (typeof candidate.text === "string") return candidate.text;
        if (typeof candidate.content === "string") return candidate.content;
        return "";
      })
      .join("")
      .trim();
    return combined || null;
  }

  return null;
}

/**
 * Returns null only when the model response is missing, truncated, or has an
 * incompatible structure. A valid rejection remains a valid moderation result.
 */
export function parseCommunityImageModerationResponse(payload: unknown): CommunityImageModeration | null {
  const response = payload as ChatCompletionPayload;
  const rawContent = extractTextContent(response?.choices?.[0]?.message?.content);
  if (!rawContent) return null;

  const jsonContent = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const verdict = JSON.parse(jsonContent) as {
      isFoodRelated?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };

    if (
      typeof verdict.isFoodRelated !== "boolean" ||
      typeof verdict.confidence !== "number" ||
      !Number.isFinite(verdict.confidence) ||
      typeof verdict.reason !== "string"
    ) {
      return null;
    }

    const accepted = verdict.isFoodRelated && verdict.confidence >= 0.7;
    return {
      accepted,
      reason: accepted ? "" : (verdict.reason.trim() || FOOD_ONLY_REASON),
    };
  } catch {
    return null;
  }
}

/**
 * Checks that a community image is food-related. The request uses minimal
 * reasoning and enough completion tokens for strict JSON; the earlier small
 * token cap allowed the model to return a truncated result. A single retry
 * handles transient incomplete responses without approving an unchecked image.
 */
export async function moderateCommunityFoodImage(
  imageData: string,
  contentType: string,
): Promise<CommunityImageModeration> {
  const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeUrl || !forgeKey) {
    return { accepted: false, reason: "فاحص الصور غير متاح مؤقتاً" };
  }

  const endpoint = `${forgeUrl.replace(/\/$/, "")}/v1/chat/completions`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${forgeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content:
                "أنت فاحص صور صارم لمجتمع طبخ. اقبل فقط صورة يظهر فيها بوضوح طبق طعام أو مشروب أو مكونات طبخ أو تحضير طعام. ارفض الصور الشخصية والوجوه والأشخاص، الحيوانات، الوثائق، المركبات، المناظر، الميمات، الشعارات، لقطات الشاشة، الإعلانات، أو أي صورة لا يكون الطعام محورها الواضح. عند الشك ارفض. أعد JSON فقط.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "هل يمكن نشر هذه الصورة في مجتمع طبخ؟" },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${contentType};base64,${imageData}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
          response_format: moderationResponseFormat,
          reasoning: { effort: "minimal" },
          max_completion_tokens: 512,
        }),
      });

      if (!response.ok) {
        console.error("[Community] Image moderation returned HTTP", response.status);
        if (attempt === 0 && response.status >= 500) continue;
        return { accepted: false, reason: UNAVAILABLE_REASON };
      }

      const payload = (await response.json()) as ChatCompletionPayload;
      const moderation = parseCommunityImageModerationResponse(payload);
      if (moderation) return moderation;

      const finishReason = payload.choices?.[0]?.finish_reason ?? "unknown";
      console.error("[Community] Image moderation returned incomplete content", { finishReason, attempt });
    } catch (error) {
      console.error("[Community] Image moderation request failed", { attempt, error });
    }
  }

  return { accepted: false, reason: UNAVAILABLE_REASON };
}

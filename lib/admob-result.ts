export type RewardedAdFailureCategory =
  | "no-fill"
  | "network"
  | "configuration"
  | "internal"
  | "unknown";

export interface RewardedAdErrorInfo {
  category: RewardedAdFailureCategory;
  code: string;
  diagnosticMessage: string;
  userMessage: string;
  retryable: boolean;
}

export type RewardedAdResult =
  | { status: "rewarded" }
  | { status: "dismissed" }
  | {
      status: "unavailable";
      error: RewardedAdErrorInfo;
      /**
       * true: Google test inventory loaded, so the SDK connection is healthy and
       * the live unit is temporarily unavailable. false: the control request also
       * failed. null: the control request was not run.
       */
      sdkHealthy: boolean | null;
    };

function cleanDiagnosticValue(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function readErrorField(error: unknown, field: "code" | "message"): unknown {
  if (!error || typeof error !== "object") return undefined;
  return (error as Record<string, unknown>)[field];
}

export function normalizeRewardedAdError(error: unknown): RewardedAdErrorInfo {
  const rawCode = cleanDiagnosticValue(readErrorField(error, "code"), "admob/unknown", 80);
  const diagnosticMessage = cleanDiagnosticValue(
    readErrorField(error, "message"),
    error instanceof Error ? error.message : "Unknown Google Mobile Ads error",
    220,
  );
  const searchable = `${rawCode} ${diagnosticMessage}`.toLowerCase();

  let category: RewardedAdFailureCategory = "unknown";
  if (
    /no[\s_-]?fill|lack of ad inventory|no ad config|error[\s_-]?code[\s_-]?no[\s_-]?fill/.test(
      searchable,
    ) || /\bcode[:\s-]*3\b/.test(searchable)
  ) {
    category = "no-fill";
  } else if (
    /network|offline|internet|timed?[\s_-]?out|timeout|unable to connect|connection/.test(
      searchable,
    )
  ) {
    category = "network";
  } else if (
    /invalid[\s_-]?(request|ad|unit)|app[\s_-]?id|application id|publisher data|not approved|misconfig|configuration|initialized incorrectly|missing/.test(
      searchable,
    )
  ) {
    category = "configuration";
  } else if (/internal|server error|service unavailable/.test(searchable)) {
    category = "internal";
  }

  const messages: Record<RewardedAdFailureCategory, string> = {
    "no-fill": "لا يتوفر إعلان مناسب حاليًا. انتظر قليلًا ثم حاول مرة أخرى.",
    network: "تعذر الاتصال بخدمة الإعلانات. تحقق من الإنترنت ثم حاول مرة أخرى.",
    configuration: "تعذر تهيئة الإعلان. حدّث التطبيق إلى أحدث إصدار ثم حاول مجددًا.",
    internal: "خدمة الإعلانات غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.",
    unknown: "تعذر تحميل الإعلان الآن. حاول مرة أخرى بعد قليل.",
  };

  return {
    category,
    code: rawCode.replace(/[^a-zA-Z0-9_.:/-]/g, "-") || `admob/${category}`,
    diagnosticMessage,
    userMessage: messages[category],
    retryable: category !== "configuration",
  };
}

export function formatRewardedAdErrorForUser(
  error: RewardedAdErrorInfo,
  sdkHealthy: boolean | null,
): string {
  const details = [error.userMessage];

  if (sdkHealthy === true && error.category === "no-fill") {
    details.push("الاتصال بخدمة الإعلانات سليم، لكن الوحدة الحقيقية لم تجد إعلانًا متاحًا بعد.");
  } else if (sdkHealthy === false) {
    details.push("تعذر أيضًا تحميل إعلان الاختبار؛ تحقق من الاتصال ثم أعد المحاولة.");
  }

  details.push(`رمز التشخيص: ${error.code}`);
  return details.join("\n");
}

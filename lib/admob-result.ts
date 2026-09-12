export type RewardedAdFailureCategory =
  | "no-fill"
  | "network"
  | "configuration"
  | "internal"
  | "unknown";

export type RewardedAdFailureStage =
  | "initialization"
  | "load"
  | "show"
  | "timeout"
  | "unknown";

export interface RewardedAdErrorInfo {
  stage: RewardedAdFailureStage;
  category: RewardedAdFailureCategory;
  code: string;
  diagnosticMessage: string;
  userMessage: string;
  retryable: boolean;
  domain?: string;
  nativeErrorCode?: string;
  responseId?: string;
  cause?: string;
}

export type RewardedAdResult =
  | { status: "rewarded" }
  | { status: "dismissed" }
  | {
      status: "unavailable";
      error: RewardedAdErrorInfo;
      /** يبقى null في الإنتاج لأن إعلان Google التجريبي لا يُطلب تلقائياً. */
      sdkHealthy: boolean | null;
    };

function cleanDiagnosticValue(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function errorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === "object" ? (error as Record<string, unknown>) : null;
}

function readErrorField(error: unknown, field: string): unknown {
  const record = errorRecord(error);
  if (!record) return undefined;
  if (record[field] !== undefined && record[field] !== null) return record[field];
  const userInfo = errorRecord(record.userInfo);
  return userInfo?.[field];
}

function readCause(error: unknown): string | undefined {
  const cause = readErrorField(error, "cause");
  if (!cause) return undefined;
  if (typeof cause === "string") return cleanDiagnosticValue(cause, "", 220) || undefined;
  const causeRecord = errorRecord(cause);
  const message = causeRecord?.message ?? causeRecord?.code;
  return cleanDiagnosticValue(message, "", 220) || undefined;
}

export function normalizeRewardedAdError(
  error: unknown,
  stage: RewardedAdFailureStage = "unknown",
): RewardedAdErrorInfo {
  const rawCode = cleanDiagnosticValue(readErrorField(error, "code"), "admob/unknown", 80);
  const diagnosticMessage = cleanDiagnosticValue(
    readErrorField(error, "message"),
    error instanceof Error ? error.message : "Unknown Google Mobile Ads error",
    300,
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
    /network|offline|internet|timed?[\s_-]?out|timeout|unable to connect|connection|resolve host/.test(
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
  } else if (/internal|server error|service unavailable|javascriptengine|webview/.test(searchable)) {
    category = "internal";
  }

  const messages: Record<RewardedAdFailureCategory, string> = {
    "no-fill": "لا يتوفر إعلان مناسب من AdMob حاليًا. انتظر قليلًا ثم حاول مرة أخرى.",
    network: "تعذر اتصال Google Mobile Ads بخادم الإعلانات. تحقق من الاتصال ثم حاول مرة أخرى.",
    configuration: "رفض AdMob طلب الإعلان بسبب إعداد التطبيق أو الوحدة الإعلانية.",
    internal: "تعذر على Google Mobile Ads إكمال التحميل أو العرض على هذا الجهاز.",
    unknown: "تعذر تحميل الإعلان لسبب غير مصنّف.",
  };

  const domain = cleanDiagnosticValue(readErrorField(error, "domain"), "", 120) || undefined;
  const nativeErrorCode =
    cleanDiagnosticValue(readErrorField(error, "nativeCode"), "", 40) || undefined;
  const responseId =
    cleanDiagnosticValue(readErrorField(error, "responseId"), "", 160) || undefined;

  return {
    stage,
    category,
    code: rawCode.replace(/[^a-zA-Z0-9_.:/-]/g, "-") || `admob/${category}`,
    diagnosticMessage,
    userMessage: messages[category],
    retryable: category !== "configuration",
    domain,
    nativeErrorCode,
    responseId,
    cause: readCause(error),
  };
}

const stageLabels: Record<RewardedAdFailureStage, string> = {
  initialization: "تهيئة Google Mobile Ads",
  load: "تحميل الإعلان",
  show: "عرض الإعلان",
  timeout: "انتهاء المهلة",
  unknown: "مرحلة غير محددة",
};

export function formatRewardedAdErrorForUser(
  error: RewardedAdErrorInfo,
  _sdkHealthy: boolean | null,
): string {
  const details = [error.userMessage, `مرحلة الفشل: ${stageLabels[error.stage]}`];

  if (error.diagnosticMessage && !error.diagnosticMessage.includes(error.userMessage)) {
    details.push(`رسالة Google: ${error.diagnosticMessage}`);
  }
  if (error.domain) details.push(`نطاق الخطأ: ${error.domain}`);
  if (error.nativeErrorCode) details.push(`رمز Android الأصلي: ${error.nativeErrorCode}`);
  if (error.responseId) details.push(`معرّف الاستجابة: ${error.responseId}`);
  if (error.cause) details.push(`السبب الفرعي: ${error.cause}`);
  details.push(`رمز التشخيص: ${error.code}`);

  return details.join("\n");
}

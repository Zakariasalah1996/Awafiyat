const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

interface ExpoPushErrorDetails {
  error?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: ExpoPushErrorDetails;
}

interface ExpoPushReceipt {
  status: "ok" | "error";
  message?: string;
  details?: ExpoPushErrorDetails;
}

export interface ExpoPushResult {
  successCount: number;
  failCount: number;
  acceptedCount: number;
  deliveredCount: number;
  pendingReceiptCount: number;
  receiptErrorCount: number;
}

interface SendExpoPushOptions {
  tokens: string[];
  title: string;
  body: string;
  deactivate?: (token: string) => Promise<void>;
  fetchImpl?: typeof fetch;
  receiptDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDeviceNotRegistered(details?: ExpoPushErrorDetails): boolean {
  return details?.error === "DeviceNotRegistered";
}

async function deactivateSafely(
  token: string,
  deactivate: SendExpoPushOptions["deactivate"],
  providerStage: "ticket" | "receipt",
): Promise<void> {
  if (!deactivate) return;

  try {
    await deactivate(token);
    console.info(`[Push] Expo token deactivated after ${providerStage} DeviceNotRegistered`);
  } catch (error) {
    console.error(`[Push] Failed to deactivate Expo token after ${providerStage}`, error);
  }
}

function providerErrorSummary(entry: ExpoPushTicket | ExpoPushReceipt) {
  return {
    code: entry.details?.error ?? "UnknownProviderError",
    message: entry.message ?? "No provider message",
  };
}

export async function sendExpoPushNotifications({
  tokens,
  title,
  body,
  deactivate,
  fetchImpl = fetch,
  receiptDelayMs = 1_500,
}: SendExpoPushOptions): Promise<ExpoPushResult> {
  if (tokens.length === 0) {
    return {
      successCount: 0,
      failCount: 0,
      acceptedCount: 0,
      deliveredCount: 0,
      pendingReceiptCount: 0,
      receiptErrorCount: 0,
    };
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    priority: "default",
    channelId: "admin_updates",
    data: { type: "admin_notification" },
  }));

  const sendResponse = await fetchImpl(EXPO_PUSH_SEND_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!sendResponse.ok) {
    throw new Error(`Expo push request failed with HTTP ${sendResponse.status}`);
  }

  const sendPayload = (await sendResponse.json()) as { data?: ExpoPushTicket[] };
  const tickets = Array.isArray(sendPayload.data) ? sendPayload.data : [];
  const accepted: Array<{ id: string; token: string }> = [];
  let ticketErrorCount = 0;

  for (let index = 0; index < tokens.length; index++) {
    const ticket = tickets[index];

    if (!ticket) {
      ticketErrorCount += 1;
      console.warn("[Push] Expo returned no ticket", { index });
      continue;
    }

    if (ticket.status === "ok" && ticket.id) {
      accepted.push({ id: ticket.id, token: tokens[index] });
      continue;
    }

    ticketErrorCount += 1;
    console.warn("[Push] Expo ticket rejected", {
      index,
      ...providerErrorSummary(ticket),
    });

    if (isDeviceNotRegistered(ticket.details)) {
      await deactivateSafely(tokens[index], deactivate, "ticket");
    }
  }

  if (accepted.length === 0) {
    return {
      successCount: 0,
      failCount: ticketErrorCount,
      acceptedCount: 0,
      deliveredCount: 0,
      pendingReceiptCount: 0,
      receiptErrorCount: 0,
    };
  }

  await delay(receiptDelayMs);

  let deliveredCount = 0;
  let receiptErrorCount = 0;
  let pendingReceiptCount = accepted.length;

  try {
    const receiptResponse = await fetchImpl(EXPO_PUSH_RECEIPTS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: accepted.map(({ id }) => id) }),
    });

    if (!receiptResponse.ok) {
      throw new Error(`Expo receipt request failed with HTTP ${receiptResponse.status}`);
    }

    const receiptPayload = (await receiptResponse.json()) as {
      data?: Record<string, ExpoPushReceipt>;
    };
    const receipts = receiptPayload.data ?? {};
    pendingReceiptCount = 0;

    for (const acceptedTicket of accepted) {
      const receipt = receipts[acceptedTicket.id];

      if (!receipt) {
        pendingReceiptCount += 1;
        continue;
      }

      if (receipt.status === "ok") {
        deliveredCount += 1;
        continue;
      }

      receiptErrorCount += 1;
      console.warn("[Push] Expo receipt failed", providerErrorSummary(receipt));

      if (isDeviceNotRegistered(receipt.details)) {
        await deactivateSafely(acceptedTicket.token, deactivate, "receipt");
      }
    }
  } catch (error) {
    console.warn("[Push] Expo receipts are not available yet", {
      acceptedCount: accepted.length,
      error: error instanceof Error ? error.message : "Unknown receipt error",
    });
  }

  const successCount = deliveredCount + pendingReceiptCount;
  const failCount = ticketErrorCount + receiptErrorCount;

  console.info("[Push] Expo result", {
    acceptedCount: accepted.length,
    deliveredCount,
    pendingReceiptCount,
    receiptErrorCount,
    ticketErrorCount,
  });

  return {
    successCount,
    failCount,
    acceptedCount: accepted.length,
    deliveredCount,
    pendingReceiptCount,
    receiptErrorCount,
  };
}

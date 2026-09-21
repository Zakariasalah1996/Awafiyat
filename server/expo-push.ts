const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_MAX_MESSAGES_PER_REQUEST = 100;
const EXPO_MAX_RECEIPTS_PER_REQUEST = 1_000;

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
  data?: Record<string, string>;
  channelId?: string;
  deactivate?: (token: string) => Promise<void>;
  fetchImpl?: typeof fetch;
  receiptDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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
  data = { type: "admin_notification" },
  channelId = "admin_updates",
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
    channelId,
    data,
  }));
  const messageBatches = chunkArray(messages, EXPO_MAX_MESSAGES_PER_REQUEST);
  const accepted: Array<{ id: string; token: string }> = [];
  let ticketErrorCount = 0;
  let batchRequestErrorCount = 0;

  for (let batchIndex = 0; batchIndex < messageBatches.length; batchIndex += 1) {
    const messageBatch = messageBatches[batchIndex];
    const tokenOffset = batchIndex * EXPO_MAX_MESSAGES_PER_REQUEST;
    const tokenBatch = tokens.slice(tokenOffset, tokenOffset + messageBatch.length);

    try {
      const sendResponse = await fetchImpl(EXPO_PUSH_SEND_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBatch),
      });

      if (!sendResponse.ok) {
        batchRequestErrorCount += tokenBatch.length;
        console.error("[Push] Expo push batch rejected", {
          batch: batchIndex + 1,
          batchSize: tokenBatch.length,
          status: sendResponse.status,
        });
        continue;
      }

      const sendPayload = (await sendResponse.json()) as { data?: ExpoPushTicket[] };
      const tickets = Array.isArray(sendPayload.data) ? sendPayload.data : [];

      for (let index = 0; index < tokenBatch.length; index += 1) {
        const ticket = tickets[index];

        if (!ticket) {
          ticketErrorCount += 1;
          console.warn("[Push] Expo returned no ticket", {
            batch: batchIndex + 1,
            index,
          });
          continue;
        }

        if (ticket.status === "ok" && ticket.id) {
          accepted.push({ id: ticket.id, token: tokenBatch[index] });
          continue;
        }

        ticketErrorCount += 1;
        console.warn("[Push] Expo ticket rejected", {
          batch: batchIndex + 1,
          index,
          ...providerErrorSummary(ticket),
        });

        if (isDeviceNotRegistered(ticket.details)) {
          await deactivateSafely(tokenBatch[index], deactivate, "ticket");
        }
      }
    } catch (error) {
      batchRequestErrorCount += tokenBatch.length;
      console.error("[Push] Expo push batch failed", {
        batch: batchIndex + 1,
        batchSize: tokenBatch.length,
        error: error instanceof Error ? error.message : "Unknown Expo batch error",
      });
    }
  }

  if (accepted.length === 0) {
    return {
      successCount: 0,
      failCount: ticketErrorCount + batchRequestErrorCount,
      acceptedCount: 0,
      deliveredCount: 0,
      pendingReceiptCount: 0,
      receiptErrorCount: 0,
    };
  }

  await delay(receiptDelayMs);

  let deliveredCount = 0;
  let receiptErrorCount = 0;
  let pendingReceiptCount = 0;
  const receiptBatches = chunkArray(accepted, EXPO_MAX_RECEIPTS_PER_REQUEST);

  for (let batchIndex = 0; batchIndex < receiptBatches.length; batchIndex += 1) {
    const acceptedBatch = receiptBatches[batchIndex];

    try {
      const receiptResponse = await fetchImpl(EXPO_PUSH_RECEIPTS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: acceptedBatch.map(({ id }) => id) }),
      });

      if (!receiptResponse.ok) {
        throw new Error(`Expo receipt request failed with HTTP ${receiptResponse.status}`);
      }

      const receiptPayload = (await receiptResponse.json()) as {
        data?: Record<string, ExpoPushReceipt>;
      };
      const receipts = receiptPayload.data ?? {};

      for (const acceptedTicket of acceptedBatch) {
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
      pendingReceiptCount += acceptedBatch.length;
      console.warn("[Push] Expo receipts are not available yet", {
        batch: batchIndex + 1,
        acceptedCount: acceptedBatch.length,
        error: error instanceof Error ? error.message : "Unknown receipt error",
      });
    }
  }

  const successCount = deliveredCount + pendingReceiptCount;
  const failCount = ticketErrorCount + batchRequestErrorCount + receiptErrorCount;

  console.info("[Push] Expo result", {
    tokenCount: tokens.length,
    messageBatchCount: messageBatches.length,
    acceptedCount: accepted.length,
    deliveredCount,
    pendingReceiptCount,
    receiptErrorCount,
    ticketErrorCount,
    batchRequestErrorCount,
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

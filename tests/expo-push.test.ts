import { describe, expect, it, vi } from "vitest";

import { sendExpoPushNotifications } from "../server/expo-push";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const token = "ExponentPushToken[test-device-token]";

describe("Expo push tickets and receipts", () => {
  it("counts a successful receipt as delivered", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ status: "ok", id: "ticket-1" }] }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { "ticket-1": { status: "ok" } } }),
      );

    const result = await sendExpoPushNotifications({
      tokens: [token],
      title: "عنوان",
      body: "نص",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    expect(result).toMatchObject({
      successCount: 1,
      failCount: 0,
      acceptedCount: 1,
      deliveredCount: 1,
      pendingReceiptCount: 0,
      receiptErrorCount: 0,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("deactivates a token when its receipt says DeviceNotRegistered", async () => {
    const deactivate = vi.fn(async () => undefined);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ status: "ok", id: "ticket-2" }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            "ticket-2": {
              status: "error",
              message: "Device is not registered",
              details: { error: "DeviceNotRegistered" },
            },
          },
        }),
      );

    const result = await sendExpoPushNotifications({
      tokens: [token],
      title: "عنوان",
      body: "نص",
      deactivate,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    expect(result.successCount).toBe(0);
    expect(result.failCount).toBe(1);
    expect(result.receiptErrorCount).toBe(1);
    expect(deactivate).toHaveBeenCalledWith(token);
  });

  it("deactivates a token rejected at ticket creation", async () => {
    const deactivate = vi.fn(async () => undefined);
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            status: "error",
            message: "Device is not registered",
            details: { error: "DeviceNotRegistered" },
          },
        ],
      }),
    );

    const result = await sendExpoPushNotifications({
      tokens: [token],
      title: "عنوان",
      body: "نص",
      deactivate,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    expect(result).toMatchObject({ successCount: 0, failCount: 1, acceptedCount: 0 });
    expect(deactivate).toHaveBeenCalledWith(token);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps an accepted ticket pending when receipts are not available yet", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ status: "ok", id: "ticket-3" }] }))
      .mockResolvedValueOnce(jsonResponse({ error: "receipts pending" }, 503));

    const result = await sendExpoPushNotifications({
      tokens: [token],
      title: "عنوان",
      body: "نص",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    expect(result).toMatchObject({
      successCount: 1,
      failCount: 0,
      acceptedCount: 1,
      deliveredCount: 0,
      pendingReceiptCount: 1,
    });
  });
});

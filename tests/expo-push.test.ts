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

  it("passes the community notification type and Android channel to Expo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ status: "ok", id: "ticket-community" }] }))
      .mockResolvedValueOnce(jsonResponse({ data: { "ticket-community": { status: "ok" } } }));

    await sendExpoPushNotifications({
      tokens: [token],
      title: "تعليق جديد على منشورك",
      body: "أحمد: وصفة جميلة",
      data: { type: "community_comment", postId: "44" },
      channelId: "admin_updates",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    const requestBody = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(requestBody[0]).toMatchObject({
      channelId: "admin_updates",
      data: { type: "community_comment", postId: "44" },
    });
  });

  it("splits bulk sends into Expo-compliant batches of at most 100 messages", async () => {
    let nextTicket = 1;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/push/send")) {
        const messages = JSON.parse(String(init?.body)) as Array<{ to: string }>;
        return jsonResponse({
          data: messages.map(() => ({ status: "ok", id: `ticket-${nextTicket++}` })),
        });
      }

      const { ids } = JSON.parse(String(init?.body)) as { ids: string[] };
      return jsonResponse({
        data: Object.fromEntries(ids.map((id) => [id, { status: "ok" }])),
      });
    });
    const tokens = Array.from(
      { length: 205 },
      (_, index) => `ExponentPushToken[bulk-device-${index}]`,
    );

    const result = await sendExpoPushNotifications({
      tokens,
      title: "عنوان جماعي",
      body: "نص جماعي",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    const sendBodies = fetchImpl.mock.calls
      .filter(([url]) => String(url).includes("/push/send"))
      .map(([, init]) => JSON.parse(String(init?.body)) as unknown[]);

    expect(sendBodies.map((batch) => batch.length)).toEqual([100, 100, 5]);
    expect(result).toMatchObject({
      successCount: 205,
      failCount: 0,
      acceptedCount: 205,
      deliveredCount: 205,
    });
  });

  it("continues with later batches when one Expo request fails", async () => {
    let sendBatch = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/push/send")) {
        sendBatch += 1;
        const messages = JSON.parse(String(init?.body)) as Array<{ to: string }>;
        if (sendBatch === 1) {
          return jsonResponse(
            { errors: [{ code: "PUSH_TOO_MANY_REQUESTS", message: "temporary failure" }] },
            503,
          );
        }
        return jsonResponse({
          data: messages.map((_, index) => ({ status: "ok", id: `recovered-${index}` })),
        });
      }

      const { ids } = JSON.parse(String(init?.body)) as { ids: string[] };
      return jsonResponse({
        data: Object.fromEntries(ids.map((id) => [id, { status: "ok" }])),
      });
    });
    const tokens = Array.from(
      { length: 150 },
      (_, index) => `ExponentPushToken[partial-device-${index}]`,
    );

    const result = await sendExpoPushNotifications({
      tokens,
      title: "عنوان جماعي",
      body: "نص جماعي",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receiptDelayMs: 0,
    });

    expect(result).toMatchObject({
      successCount: 50,
      failCount: 100,
      acceptedCount: 50,
      deliveredCount: 50,
    });
  });
});

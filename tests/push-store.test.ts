import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  queries: [] as Array<{ text: string; params?: unknown[] }>,
}));

vi.mock("pg", () => ({
  Pool: class MockPool {
    async query(text: string, params?: unknown[]) {
      state.queries.push({ text, params });
      if (text.includes("RETURNING id")) {
        return { rows: [{ id: "17" }], rowCount: 1 };
      }
      if (text.includes('COUNT(*)::text AS "activeCount"')) {
        return { rows: [{ activeCount: "1" }], rowCount: 1 };
      }
      if (text.includes('"isActive" = TRUE AND "userId" = $1')) {
        return {
          rows: [{ id: "1", userId: "17", token: "ExponentPushToken[test-device]", platform: "android", country: "iraq", deviceId: "device-123", isActive: true }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    }

    async connect() {
      return {
        query: (text: string, params?: unknown[]) => this.query(text, params),
        release: vi.fn(),
      };
    }
  },
}));

describe("PostgreSQL push store", () => {
  it("creates its isolated schema and upserts the complete registration", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/awafiyat_test";
    const store = await import("../server/push-store");

    expect(store.isPostgresPushStoreEnabled()).toBe(true);
    await store.savePostgresPushToken({
      token: "ExponentPushToken[test-device]",
      userId: null,
      platform: "android",
      country: "iraq",
      deviceId: "device-123",
    });

    expect(state.queries.some(({ text }) => text.includes("CREATE TABLE IF NOT EXISTS awafiyat_push_tokens"))).toBe(true);
    const upsert = state.queries.find(({ text }) => text.includes("ON CONFLICT (token) DO UPDATE"));
    expect(upsert).toBeDefined();
    expect(upsert?.params).toEqual([
      null,
      "ExponentPushToken[test-device]",
      "android",
      "iraq",
      "device-123",
    ]);

    const userTokens = await store.getPostgresPushTokensByUserId(17);
    expect(userTokens).toHaveLength(1);
    expect(state.queries.some(({ text, params }) => text.includes('"userId" = $1') && params?.[0] === 17)).toBe(true);

    const notificationId = await store.createPostgresAdminNotification({
      title: "اختبار",
      body: "رسالة",
      targetType: "all",
      sentCount: 1,
    });
    expect(notificationId).toBe(17);

    const status = await store.getPostgresPushStoreStatus();
    expect(status).toEqual({ ok: true, database: "postgres", activeTokenCount: 1 });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (payload?: unknown) => void;

const mockState = vi.hoisted(() => ({
  loadCalls: 0,
  showCalls: 0,
  createdUnitIds: [] as string[],
  failLoads: false,
}));

class FakeRewardedAd {
  private listeners = new Map<string, Set<Listener>>();

  addAdEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }

  private emit(type: string, payload?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(payload);
  }

  load() {
    mockState.loadCalls += 1;
    queueMicrotask(() => {
      if (mockState.failLoads) {
        this.emit("error", {
          code: "googleMobileAds/no-fill",
          message: "No ad returned because of lack of ad inventory",
          userInfo: { domain: "com.google.android.gms.ads", nativeCode: 3 },
        });
      } else {
        this.emit("rewarded_loaded");
      }
    });
  }

  async show() {
    mockState.showCalls += 1;
    queueMicrotask(() => {
      this.emit("rewarded_earned_reward", { type: "فتح الوصفة", amount: 1 });
      this.emit("closed");
    });
  }
}

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/admob-result", async () => await import("../lib/admob-result"));

vi.mock("react-native-google-mobile-ads", () => ({
  default: () => ({
    setRequestConfiguration: vi.fn(async () => undefined),
    initialize: vi.fn(async () => []),
  }),
  MaxAdContentRating: { PG: "PG" },
  RewardedAd: {
    createForAdRequest: (unitId: string) => {
      mockState.createdUnitIds.push(unitId);
      return new FakeRewardedAd();
    },
  },
  RewardedAdEventType: {
    LOADED: "rewarded_loaded",
    EARNED_REWARD: "rewarded_earned_reward",
  },
  AdEventType: {
    ERROR: "error",
    CLOSED: "closed",
  },
  TestIds: { REWARDED: "google-test-rewarded" },
}));

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("Rewarded ad single-slot lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("__DEV__", false);
    mockState.loadCalls = 0;
    mockState.showCalls = 0;
    mockState.createdUnitIds = [];
    mockState.failLoads = false;
  });

  it("fills only one cache slot when preload is requested repeatedly", async () => {
    const { preloadRewardedAd } = await import("../lib/admob");

    preloadRewardedAd();
    preloadRewardedAd();
    preloadRewardedAd();
    await vi.waitFor(() => expect(mockState.loadCalls).toBe(1));
    await flushAsyncWork();

    expect(mockState.loadCalls).toBe(1);
    expect(mockState.createdUnitIds).toEqual([
      "ca-app-pub-9147941153313979/1707506280",
    ]);
  });

  it("shows the cached ad once and refills exactly one replacement", async () => {
    const { preloadRewardedAd, showRewardedAd } = await import("../lib/admob");

    preloadRewardedAd();
    await vi.waitFor(() => expect(mockState.loadCalls).toBe(1));
    await flushAsyncWork();
    const result = await showRewardedAd();
    await vi.waitFor(() => expect(mockState.loadCalls).toBe(2));
    await flushAsyncWork();

    expect(result).toEqual({ status: "rewarded" });
    expect(mockState.showCalls).toBe(1);
    expect(mockState.loadCalls).toBe(2);
  });

  it("shares one load and one show across concurrent user taps", async () => {
    const { showRewardedAd } = await import("../lib/admob");

    const [first, second, third] = await Promise.all([
      showRewardedAd(),
      showRewardedAd(),
      showRewardedAd(),
    ]);
    await vi.waitFor(() => expect(mockState.loadCalls).toBe(2));
    await flushAsyncWork();

    expect(first).toEqual({ status: "rewarded" });
    expect(second).toEqual({ status: "rewarded" });
    expect(third).toEqual({ status: "rewarded" });
    expect(mockState.showCalls).toBe(1);
    expect(mockState.loadCalls).toBe(2);
  });

  it("does not retry or request test inventory after a production load failure", async () => {
    mockState.failLoads = true;
    const { showRewardedAd } = await import("../lib/admob");

    const result = await showRewardedAd();
    await flushAsyncWork();

    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.error.stage).toBe("load");
      expect(result.error.category).toBe("no-fill");
      expect(result.sdkHealthy).toBeNull();
    }
    expect(mockState.loadCalls).toBe(1);
    expect(mockState.createdUnitIds).toEqual([
      "ca-app-pub-9147941153313979/1707506280",
    ]);
  });
});

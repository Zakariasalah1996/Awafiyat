import { beforeEach, describe, expect, it, vi } from "vitest";

const pushStoreMock = vi.hoisted(() => ({
  claimDueAutomaticNotification: vi.fn(),
  completeAutomaticNotificationClaim: vi.fn(),
  failAutomaticNotificationClaim: vi.fn(),
  seedAutomaticNotificationCampaign: vi.fn(),
  getAutomaticNotificationCampaign: vi.fn(),
  updateAutomaticNotificationCampaignTimes: vi.fn(),
  setAutomaticNotificationCampaignActive: vi.fn(),
  restartAutomaticNotificationCampaign: vi.fn(),
  updateAutomaticNotificationItem: vi.fn(),
}));

vi.mock("../server/push-store", () => pushStoreMock);

import {
  processDueAutomaticNotification,
  stopAutomaticNotificationSchedulerForTests,
} from "../server/automatic-notification-scheduler";

const now = new Date("2026-09-27T06:00:00.000Z");

function dueClaim() {
  return {
    settings: {
      id: 1,
      campaignVersion: 1,
      currentPosition: 0,
      morningTime: "09:00",
      eveningTime: "19:30",
    },
    item: {
      id: "10",
      campaignVersion: 1,
      position: 0,
      day: 1,
      period: "morning",
      category: "ماء",
      title: "صباح العافية",
      body: "ابدأ يومك بكوب ماء.",
    },
  };
}

describe("Automatic notification scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopAutomaticNotificationSchedulerForTests();
  });

  it("sends one claimed notification and schedules the next evening item", async () => {
    pushStoreMock.claimDueAutomaticNotification.mockResolvedValue(dueClaim());
    const sender = vi.fn().mockResolvedValue({ sentCount: 120, successCount: 118, failCount: 2 });

    const result = await processDueAutomaticNotification(sender, now);

    expect(result.status).toBe("sent");
    expect(sender).toHaveBeenCalledOnce();
    expect(sender).toHaveBeenCalledWith("صباح العافية", "ابدأ يومك بكوب ماء.");
    expect(pushStoreMock.completeAutomaticNotificationClaim).toHaveBeenCalledWith(expect.objectContaining({
      campaignVersion: 1,
      position: 0,
      sentCount: 120,
      successCount: 118,
      failCount: 2,
      isCompleted: false,
      nextSendAt: new Date("2026-09-27T16:30:00.000Z"),
    }));
  });

  it("does not send when no database claim is available", async () => {
    pushStoreMock.claimDueAutomaticNotification.mockResolvedValue(null);
    const sender = vi.fn();

    const result = await processDueAutomaticNotification(sender, now);

    expect(result.status).toBe("idle");
    expect(sender).not.toHaveBeenCalled();
    expect(pushStoreMock.completeAutomaticNotificationClaim).not.toHaveBeenCalled();
  });

  it("records a retry 15 minutes later when delivery throws", async () => {
    pushStoreMock.claimDueAutomaticNotification.mockResolvedValue(dueClaim());
    const sender = vi.fn().mockRejectedValue(new Error("provider unavailable"));

    const result = await processDueAutomaticNotification(sender, now);

    expect(result.status).toBe("failed");
    expect(pushStoreMock.failAutomaticNotificationClaim).toHaveBeenCalledWith({
      itemId: 10,
      errorMessage: "provider unavailable",
      retryAt: new Date("2026-09-27T06:15:00.000Z"),
    });
  });
});

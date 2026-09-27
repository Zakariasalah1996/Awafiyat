import {
  AUTOMATIC_NOTIFICATION_CAMPAIGN_VERSION,
  AUTOMATIC_NOTIFICATION_TEMPLATES,
  DEFAULT_EVENING_TIME,
  DEFAULT_MORNING_TIME,
  getNextBaghdadNotificationAt,
  isValidNotificationTime,
} from "./automatic-notifications";
import * as pushStore from "./push-store";

export interface AutomaticNotificationDeliveryResult {
  sentCount: number;
  successCount: number;
  failCount: number;
}

export type AutomaticNotificationSender = (
  title: string,
  body: string,
) => Promise<AutomaticNotificationDeliveryResult>;

const CHECK_INTERVAL_MS = 60_000;
const FAILURE_RETRY_MS = 15 * 60_000;
let timer: ReturnType<typeof setInterval> | null = null;
let localTickRunning = false;

function getPositionNextSendAt(
  position: number,
  morningTime: string,
  eveningTime: string,
  now: Date,
): Date | null {
  const item = AUTOMATIC_NOTIFICATION_TEMPLATES[position];
  if (!item) return null;
  return getNextBaghdadNotificationAt(item.period, morningTime, eveningTime, now);
}

export async function initializeAutomaticNotificationCampaign(now = new Date()) {
  await pushStore.seedAutomaticNotificationCampaign(
    AUTOMATIC_NOTIFICATION_CAMPAIGN_VERSION,
    AUTOMATIC_NOTIFICATION_TEMPLATES,
  );
  const campaign = await pushStore.getAutomaticNotificationCampaign();
  const settings = campaign.settings;
  if (settings?.isActive && !settings.isCompleted && !settings.nextSendAt) {
    const nextSendAt = getPositionNextSendAt(
      settings.currentPosition,
      settings.morningTime || DEFAULT_MORNING_TIME,
      settings.eveningTime || DEFAULT_EVENING_TIME,
      now,
    );
    await pushStore.updateAutomaticNotificationCampaignTimes({
      morningTime: settings.morningTime || DEFAULT_MORNING_TIME,
      eveningTime: settings.eveningTime || DEFAULT_EVENING_TIME,
      nextSendAt,
    });
  }
  return pushStore.getAutomaticNotificationCampaign();
}

export async function getAutomaticNotificationCampaignStatus(now = new Date()) {
  const campaign = await initializeAutomaticNotificationCampaign(now);
  return { ...campaign, serverTime: now };
}

export async function updateAutomaticNotificationSchedule(input: {
  morningTime: string;
  eveningTime: string;
}, now = new Date()) {
  if (!isValidNotificationTime(input.morningTime) || !isValidNotificationTime(input.eveningTime)) {
    throw new Error("وقت الإشعار غير صالح");
  }
  const campaign = await initializeAutomaticNotificationCampaign(now);
  const settings = campaign.settings;
  const nextSendAt = settings?.isActive && !settings.isCompleted
    ? getPositionNextSendAt(settings.currentPosition, input.morningTime, input.eveningTime, now)
    : settings?.nextSendAt ?? null;
  await pushStore.updateAutomaticNotificationCampaignTimes({ ...input, nextSendAt });
  return getAutomaticNotificationCampaignStatus(now);
}

export async function setAutomaticNotificationCampaignEnabled(isActive: boolean, now = new Date()) {
  const campaign = await initializeAutomaticNotificationCampaign(now);
  const settings = campaign.settings;
  if (!settings) throw new Error("برنامج الإشعارات غير متاح");
  if (isActive && settings.isCompleted) throw new Error("اكتمل البرنامج؛ استخدم إعادة البدء لتشغيل شهر جديد");
  const nextSendAt = isActive
    ? getPositionNextSendAt(settings.currentPosition, settings.morningTime, settings.eveningTime, now)
    : settings.nextSendAt;
  await pushStore.setAutomaticNotificationCampaignActive({ isActive, nextSendAt });
  return getAutomaticNotificationCampaignStatus(now);
}

export async function restartAutomaticNotificationCampaign(now = new Date()) {
  await pushStore.seedAutomaticNotificationCampaign(
    AUTOMATIC_NOTIFICATION_CAMPAIGN_VERSION,
    AUTOMATIC_NOTIFICATION_TEMPLATES,
  );
  const campaign = await pushStore.getAutomaticNotificationCampaign();
  const morningTime = campaign.settings?.morningTime || DEFAULT_MORNING_TIME;
  const eveningTime = campaign.settings?.eveningTime || DEFAULT_EVENING_TIME;
  await pushStore.restartAutomaticNotificationCampaign({
    campaignVersion: AUTOMATIC_NOTIFICATION_CAMPAIGN_VERSION,
    nextSendAt: getNextBaghdadNotificationAt("morning", morningTime, eveningTime, now),
  });
  return getAutomaticNotificationCampaignStatus(now);
}

export async function updateAutomaticNotificationMessage(input: {
  id: number;
  title: string;
  body: string;
  category: string;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  const category = input.category.trim();
  if (!Number.isInteger(input.id) || input.id <= 0) throw new Error("معرف الإشعار غير صالح");
  if (!title || title.length > 80) throw new Error("عنوان الإشعار مطلوب وبحد أقصى 80 حرفًا");
  if (!body || body.length > 180) throw new Error("نص الإشعار مطلوب وبحد أقصى 180 حرفًا");
  if (!category || category.length > 64) throw new Error("فئة الإشعار غير صالحة");
  const updated = await pushStore.updateAutomaticNotificationItem({ id: input.id, title, body, category });
  if (!updated) throw new Error("لا يمكن تعديل إشعار تم إرساله");
  return getAutomaticNotificationCampaignStatus();
}

export async function processDueAutomaticNotification(
  send: AutomaticNotificationSender,
  now = new Date(),
) {
  if (localTickRunning) return { status: "busy" as const };
  localTickRunning = true;
  let claim: Awaited<ReturnType<typeof pushStore.claimDueAutomaticNotification>> = null;
  try {
    claim = await pushStore.claimDueAutomaticNotification(now);
    if (!claim) return { status: "idle" as const };

    const result = await send(claim.item.title, claim.item.body);
    const nextPosition = claim.item.position + 1;
    const isCompleted = nextPosition >= AUTOMATIC_NOTIFICATION_TEMPLATES.length;
    const nextSendAt = isCompleted
      ? null
      : getPositionNextSendAt(
          nextPosition,
          claim.settings.morningTime,
          claim.settings.eveningTime,
          now,
        );
    await pushStore.completeAutomaticNotificationClaim({
      campaignVersion: claim.settings.campaignVersion,
      position: claim.item.position,
      sentAt: now,
      sentCount: result.sentCount,
      successCount: result.successCount,
      failCount: result.failCount,
      nextSendAt,
      isCompleted,
    });
    return { status: "sent" as const, item: claim.item, result, nextSendAt, isCompleted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الإشعار التلقائي";
    if (claim) {
      await pushStore.failAutomaticNotificationClaim({
        itemId: Number(claim.item.id),
        errorMessage: message,
        retryAt: new Date(now.getTime() + FAILURE_RETRY_MS),
      });
    }
    console.error("[Automatic Notifications] Delivery failed", message);
    return { status: "failed" as const, error: message };
  } finally {
    localTickRunning = false;
  }
}

export async function startAutomaticNotificationScheduler(send: AutomaticNotificationSender) {
  await initializeAutomaticNotificationCampaign();
  const tick = () => {
    void processDueAutomaticNotification(send).then((result) => {
      if (result.status === "sent") {
        console.info("[Automatic Notifications] Sent", {
          position: result.item.position,
          title: result.item.title,
          sentCount: result.result.sentCount,
          successCount: result.result.successCount,
          failCount: result.result.failCount,
          nextSendAt: result.nextSendAt,
        });
      }
    });
  };
  tick();
  if (!timer) {
    timer = setInterval(tick, CHECK_INTERVAL_MS);
  }
}

export function stopAutomaticNotificationSchedulerForTests() {
  if (timer) clearInterval(timer);
  timer = null;
  localTickRunning = false;
}

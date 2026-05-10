import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-task-manager
const mockDefineTask = vi.fn();
const mockIsTaskDefined = vi.fn().mockReturnValue(true);
const mockIsTaskRegisteredAsync = vi.fn().mockResolvedValue(false);

vi.mock("expo-task-manager", () => ({
  defineTask: mockDefineTask,
  isTaskDefined: mockIsTaskDefined,
  isTaskRegisteredAsync: mockIsTaskRegisteredAsync,
}));

// Mock expo-notifications
const mockRegisterTaskAsync = vi.fn().mockResolvedValue(null);
const mockDismissNotificationAsync = vi.fn().mockResolvedValue(undefined);
const mockScheduleNotificationAsync = vi.fn().mockResolvedValue("mock-id");
const mockCancelScheduledNotificationAsync = vi.fn().mockResolvedValue(undefined);
const mockGetAllScheduledNotificationsAsync = vi.fn().mockResolvedValue([]);
const mockSetNotificationCategoryAsync = vi.fn().mockResolvedValue(undefined);
const mockSetNotificationChannelAsync = vi.fn().mockResolvedValue(undefined);
const mockDeleteNotificationChannelAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("expo-notifications", () => ({
  registerTaskAsync: mockRegisterTaskAsync,
  dismissNotificationAsync: mockDismissNotificationAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  setNotificationCategoryAsync: mockSetNotificationCategoryAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  deleteNotificationChannelAsync: mockDeleteNotificationChannelAsync,
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
    DAILY: "daily",
    WEEKLY: "weekly",
    CALENDAR: "calendar",
  },
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
  },
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
}));

// Mock AsyncStorage
const mockAsyncStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockAsyncStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockAsyncStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockAsyncStorage[key];
      return Promise.resolve();
    }),
  },
}));

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

describe("Notification Background Task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockAsyncStorage).forEach((key) => delete mockAsyncStorage[key]);
  });

  it("should define the task with TaskManager.defineTask", async () => {
    await import("../lib/notification-background-task");
    expect(mockDefineTask).toHaveBeenCalledWith(
      "BACKGROUND_NOTIFICATION_RESPONSE",
      expect.any(Function)
    );
  });

  it("should export NOTIFICATION_RESPONSE_TASK constant", async () => {
    const { NOTIFICATION_RESPONSE_TASK } = await import("../lib/notification-background-task");
    expect(NOTIFICATION_RESPONSE_TASK).toBe("BACKGROUND_NOTIFICATION_RESPONSE");
  });

  it("should export registerNotificationTask function", async () => {
    const { registerNotificationTask } = await import("../lib/notification-background-task");
    expect(typeof registerNotificationTask).toBe("function");
  });

  it("registerNotificationTask should call Notifications.registerTaskAsync", async () => {
    const { registerNotificationTask } = await import("../lib/notification-background-task");
    await registerNotificationTask();
    expect(mockRegisterTaskAsync).toHaveBeenCalledWith("BACKGROUND_NOTIFICATION_RESPONSE");
  });

  it("registerNotificationTask should not register if already registered", async () => {
    mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
    const { registerNotificationTask } = await import("../lib/notification-background-task");
    await registerNotificationTask();
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
  });
});

describe("Medication Notification Actions - opensAppToForeground", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set opensAppToForeground to false for TOOK_MEDICATION and SNOOZE_MEDICATION", async () => {
    const { setupMedicationNotificationActions } = await import("../lib/medication-notifications");
    await setupMedicationNotificationActions();

    expect(mockSetNotificationCategoryAsync).toHaveBeenCalledWith(
      "medication_action",
      expect.arrayContaining([
        expect.objectContaining({
          identifier: "TOOK_MEDICATION",
          options: expect.objectContaining({
            opensAppToForeground: false,
          }),
        }),
        expect.objectContaining({
          identifier: "SNOOZE_MEDICATION",
          options: expect.objectContaining({
            opensAppToForeground: false,
          }),
        }),
      ])
    );
  });
});

describe("Water Notification Actions - opensAppToForeground", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set opensAppToForeground to false for DRANK_WATER and SNOOZE_WATER", async () => {
    const { setupWaterNotificationActions } = await import("../lib/water-notifications");
    await setupWaterNotificationActions();

    expect(mockSetNotificationCategoryAsync).toHaveBeenCalledWith(
      "water_action",
      expect.arrayContaining([
        expect.objectContaining({
          identifier: "DRANK_WATER",
          options: expect.objectContaining({
            opensAppToForeground: false,
          }),
        }),
        expect.objectContaining({
          identifier: "SNOOZE_WATER",
          options: expect.objectContaining({
            opensAppToForeground: false,
          }),
        }),
      ])
    );
  });
});

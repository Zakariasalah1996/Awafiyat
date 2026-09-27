import { Pool, type QueryResultRow } from "pg";

export type PushPlatform = "ios" | "android" | "web";

export interface PushTokenRegistration {
  token: string;
  userId?: number | null;
  platform: PushPlatform;
  country?: string | null;
  deviceId?: string | null;
}

export interface StoredPushToken extends QueryResultRow {
  id: string;
  userId: string | null;
  token: string;
  platform: PushPlatform;
  country: string | null;
  deviceId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminNotificationInput {
  title: string;
  body: string;
  targetType: "all" | "country" | "user";
  targetValue?: string | null;
  sentCount: number;
}

export interface AutomaticNotificationSeed {
  position: number;
  day: number;
  period: "morning" | "evening";
  category: string;
  title: string;
  body: string;
}

export interface AutomaticNotificationCampaignSettings extends QueryResultRow {
  id: number;
  campaignVersion: number;
  isActive: boolean;
  isCompleted: boolean;
  currentPosition: number;
  morningTime: string;
  eveningTime: string;
  timezone: string;
  nextSendAt: Date | null;
  lastSentAt: Date | null;
  lastError: string | null;
  isProcessing: boolean;
  processingStartedAt: Date | null;
  updatedAt: Date;
}

export interface AutomaticNotificationCampaignItem extends QueryResultRow {
  id: string;
  campaignVersion: number;
  position: number;
  day: number;
  period: "morning" | "evening";
  category: string;
  title: string;
  body: string;
  status: "pending" | "sending" | "sent" | "failed";
  sentAt: Date | null;
  sentCount: number;
  successCount: number;
  failCount: number;
  lastError: string | null;
  updatedAt: Date;
}

const PUSH_TOKEN_TABLE = "awafiyat_push_tokens";
const NOTIFICATION_TABLE = "awafiyat_admin_notifications";
const AUTOMATIC_CAMPAIGN_TABLE = "awafiyat_automatic_notification_campaign";
const AUTOMATIC_ITEM_TABLE = "awafiyat_automatic_notification_items";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function isPostgresPushStoreEnabled(): boolean {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  return databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
}

function getPool(): Pool {
  if (!isPostgresPushStoreEnabled()) {
    throw new Error("PostgreSQL push store is not enabled");
  }

  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL as string;
    const useSsl =
      databaseUrl.includes("render.com") ||
      databaseUrl.includes("dpg-") ||
      databaseUrl.includes("sslmode=require");

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
  }

  return pool;
}

async function createSchema(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${PUSH_TOKEN_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      "userId" BIGINT NULL,
      token VARCHAR(1024) NOT NULL UNIQUE,
      platform VARCHAR(16) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
      country VARCHAR(64) NULL,
      "deviceId" VARCHAR(255) NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS awafiyat_push_tokens_active_idx
    ON ${PUSH_TOKEN_TABLE} ("isActive")
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS awafiyat_push_tokens_country_idx
    ON ${PUSH_TOKEN_TABLE} (country)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${NOTIFICATION_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      "targetType" VARCHAR(32) NOT NULL DEFAULT 'all',
      "targetValue" VARCHAR(255) NULL,
      "sentCount" INTEGER NOT NULL DEFAULT 0,
      "successCount" INTEGER NOT NULL DEFAULT 0,
      "failCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${AUTOMATIC_CAMPAIGN_TABLE} (
      id INTEGER PRIMARY KEY,
      "campaignVersion" INTEGER NOT NULL DEFAULT 1,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
      "currentPosition" INTEGER NOT NULL DEFAULT 0,
      "morningTime" VARCHAR(5) NOT NULL DEFAULT '09:00',
      "eveningTime" VARCHAR(5) NOT NULL DEFAULT '19:30',
      timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Baghdad',
      "nextSendAt" TIMESTAMPTZ NULL,
      "lastSentAt" TIMESTAMPTZ NULL,
      "lastError" TEXT NULL,
      "isProcessing" BOOLEAN NOT NULL DEFAULT FALSE,
      "processingStartedAt" TIMESTAMPTZ NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    INSERT INTO ${AUTOMATIC_CAMPAIGN_TABLE} (id, "isActive")
    VALUES (1, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${AUTOMATIC_ITEM_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      "campaignVersion" INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL,
      day INTEGER NOT NULL,
      period VARCHAR(16) NOT NULL CHECK (period IN ('morning', 'evening')),
      category VARCHAR(64) NOT NULL,
      title VARCHAR(80) NOT NULL,
      body VARCHAR(240) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
      "sentAt" TIMESTAMPTZ NULL,
      "sentCount" INTEGER NOT NULL DEFAULT 0,
      "successCount" INTEGER NOT NULL DEFAULT 0,
      "failCount" INTEGER NOT NULL DEFAULT 0,
      "lastError" TEXT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("campaignVersion", position)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS awafiyat_automatic_notification_status_idx
    ON ${AUTOMATIC_ITEM_TABLE} ("campaignVersion", status, position)
  `);
}

export async function ensurePushStoreSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function savePostgresPushToken(data: PushTokenRegistration): Promise<void> {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (data.deviceId) {
      await client.query(
        `UPDATE ${PUSH_TOKEN_TABLE}
         SET "isActive" = FALSE, "updatedAt" = NOW()
         WHERE "deviceId" = $1 AND token <> $2`,
        [data.deviceId, data.token],
      );
    }
    await client.query(
      `
      INSERT INTO ${PUSH_TOKEN_TABLE}
        ("userId", token, platform, country, "deviceId", "isActive", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
      ON CONFLICT (token) DO UPDATE SET
        "userId" = COALESCE(EXCLUDED."userId", ${PUSH_TOKEN_TABLE}."userId"),
        platform = EXCLUDED.platform,
        country = COALESCE(EXCLUDED.country, ${PUSH_TOKEN_TABLE}.country),
        "deviceId" = COALESCE(EXCLUDED."deviceId", ${PUSH_TOKEN_TABLE}."deviceId"),
        "isActive" = TRUE,
        "updatedAt" = NOW()
    `,
      [data.userId ?? null, data.token, data.platform, data.country ?? null, data.deviceId ?? null],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPostgresActivePushTokens(): Promise<StoredPushToken[]> {
  await ensurePushStoreSchema();
  const result = await getPool().query<StoredPushToken>(`
    SELECT id, "userId", token, platform, country, "deviceId", "isActive", "createdAt", "updatedAt"
    FROM ${PUSH_TOKEN_TABLE}
    WHERE "isActive" = TRUE
    ORDER BY "updatedAt" DESC
  `);
  return result.rows;
}

export async function getPostgresPushTokensByCountry(country: string): Promise<StoredPushToken[]> {
  await ensurePushStoreSchema();
  const result = await getPool().query<StoredPushToken>(
    `
      SELECT id, "userId", token, platform, country, "deviceId", "isActive", "createdAt", "updatedAt"
      FROM ${PUSH_TOKEN_TABLE}
      WHERE "isActive" = TRUE AND LOWER(country) = LOWER($1)
      ORDER BY "updatedAt" DESC
    `,
    [country],
  );
  return result.rows;
}

export async function getPostgresPushTokensByUserId(userId: number): Promise<StoredPushToken[]> {
  await ensurePushStoreSchema();
  const result = await getPool().query<StoredPushToken>(
    `
      SELECT id, "userId", token, platform, country, "deviceId", "isActive", "createdAt", "updatedAt"
      FROM ${PUSH_TOKEN_TABLE}
      WHERE "isActive" = TRUE AND "userId" = $1
      ORDER BY "updatedAt" DESC
    `,
    [userId],
  );
  return result.rows;
}

export async function deactivatePostgresPushToken(token: string): Promise<void> {
  await ensurePushStoreSchema();
  await getPool().query(
    `UPDATE ${PUSH_TOKEN_TABLE} SET "isActive" = FALSE, "updatedAt" = NOW() WHERE token = $1`,
    [token],
  );
}

export async function cleanupPostgresPushTokens(): Promise<number> {
  await ensurePushStoreSchema();
  const result = await getPool().query(
    `DELETE FROM ${PUSH_TOKEN_TABLE} WHERE token LIKE 'test%'`,
  );
  return result.rowCount ?? 0;
}

export async function createPostgresAdminNotification(
  data: AdminNotificationInput,
): Promise<number> {
  await ensurePushStoreSchema();
  const result = await getPool().query<{ id: string }>(
    `
      INSERT INTO ${NOTIFICATION_TABLE}
        (title, body, "targetType", "targetValue", "sentCount")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [data.title, data.body, data.targetType, data.targetValue ?? null, data.sentCount],
  );
  return Number(result.rows[0].id);
}

export async function getPostgresAdminNotifications(limit = 50, offset = 0) {
  await ensurePushStoreSchema();
  const result = await getPool().query(
    `
      SELECT id, title, body, "targetType", "targetValue", "sentCount", "successCount", "failCount", "createdAt"
      FROM ${NOTIFICATION_TABLE}
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );
  return result.rows;
}

export async function updatePostgresNotificationCounts(
  id: number,
  sentCount: number,
  successCount: number,
  failCount: number,
): Promise<void> {
  await ensurePushStoreSchema();
  await getPool().query(
    `
      UPDATE ${NOTIFICATION_TABLE}
      SET "sentCount" = $2, "successCount" = $3, "failCount" = $4
      WHERE id = $1
    `,
    [id, sentCount, successCount, failCount],
  );
}

export async function getPostgresPushStoreStatus() {
  await ensurePushStoreSchema();
  const result = await getPool().query<{ activeCount: string }>(`
    SELECT COUNT(*)::text AS "activeCount"
    FROM ${PUSH_TOKEN_TABLE}
    WHERE "isActive" = TRUE
  `);
  return { ok: true, database: "postgres", activeTokenCount: Number(result.rows[0]?.activeCount ?? 0) };
}

export async function seedAutomaticNotificationCampaign(
  campaignVersion: number,
  items: AutomaticNotificationSeed[],
): Promise<void> {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      await client.query(
        `
          INSERT INTO ${AUTOMATIC_ITEM_TABLE}
            ("campaignVersion", position, day, period, category, title, body)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT ("campaignVersion", position) DO NOTHING
        `,
        [campaignVersion, item.position, item.day, item.period, item.category, item.title, item.body],
      );
    }
    await client.query(
      `UPDATE ${AUTOMATIC_CAMPAIGN_TABLE} SET "campaignVersion" = $1, "updatedAt" = NOW() WHERE id = 1`,
      [campaignVersion],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAutomaticNotificationCampaign() {
  await ensurePushStoreSchema();
  const [settingsResult, itemsResult] = await Promise.all([
    getPool().query<AutomaticNotificationCampaignSettings>(
      `SELECT * FROM ${AUTOMATIC_CAMPAIGN_TABLE} WHERE id = 1`,
    ),
    getPool().query<AutomaticNotificationCampaignItem>(
      `SELECT * FROM ${AUTOMATIC_ITEM_TABLE} ORDER BY position ASC`,
    ),
  ]);
  return {
    settings: settingsResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function updateAutomaticNotificationCampaignTimes(input: {
  morningTime: string;
  eveningTime: string;
  nextSendAt: Date | null;
}): Promise<void> {
  await ensurePushStoreSchema();
  await getPool().query(
    `
      UPDATE ${AUTOMATIC_CAMPAIGN_TABLE}
      SET "morningTime" = $1, "eveningTime" = $2, "nextSendAt" = $3, "updatedAt" = NOW()
      WHERE id = 1
    `,
    [input.morningTime, input.eveningTime, input.nextSendAt],
  );
}

export async function setAutomaticNotificationCampaignActive(input: {
  isActive: boolean;
  nextSendAt: Date | null;
}): Promise<void> {
  await ensurePushStoreSchema();
  await getPool().query(
    `
      UPDATE ${AUTOMATIC_CAMPAIGN_TABLE}
      SET "isActive" = $1,
          "nextSendAt" = $2,
          "lastError" = NULL,
          "isProcessing" = FALSE,
          "processingStartedAt" = NULL,
          "updatedAt" = NOW()
      WHERE id = 1 AND "isCompleted" = FALSE
    `,
    [input.isActive, input.nextSendAt],
  );
}

export async function restartAutomaticNotificationCampaign(input: {
  campaignVersion: number;
  nextSendAt: Date;
}): Promise<void> {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ${AUTOMATIC_ITEM_TABLE}
        SET status = 'pending', "sentAt" = NULL, "sentCount" = 0, "successCount" = 0,
            "failCount" = 0, "lastError" = NULL, "updatedAt" = NOW()
        WHERE "campaignVersion" = $1
      `,
      [input.campaignVersion],
    );
    await client.query(
      `
        UPDATE ${AUTOMATIC_CAMPAIGN_TABLE}
        SET "campaignVersion" = $1, "isActive" = TRUE, "isCompleted" = FALSE,
            "currentPosition" = 0, "nextSendAt" = $2, "lastSentAt" = NULL,
            "lastError" = NULL, "isProcessing" = FALSE, "processingStartedAt" = NULL,
            "updatedAt" = NOW()
        WHERE id = 1
      `,
      [input.campaignVersion, input.nextSendAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAutomaticNotificationItem(input: {
  id: number;
  title: string;
  body: string;
  category: string;
}): Promise<boolean> {
  await ensurePushStoreSchema();
  const result = await getPool().query(
    `
      UPDATE ${AUTOMATIC_ITEM_TABLE}
      SET title = $2, body = $3, category = $4, "updatedAt" = NOW()
      WHERE id = $1 AND status IN ('pending', 'failed')
    `,
    [input.id, input.title, input.body, input.category],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function claimDueAutomaticNotification(now: Date) {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const settingsResult = await client.query<AutomaticNotificationCampaignSettings>(
      `SELECT * FROM ${AUTOMATIC_CAMPAIGN_TABLE} WHERE id = 1 FOR UPDATE`,
    );
    const settings = settingsResult.rows[0];
    if (!settings || !settings.isActive || settings.isCompleted || !settings.nextSendAt || settings.nextSendAt > now) {
      await client.query("COMMIT");
      return null;
    }
    const processingIsFresh = settings.isProcessing
      && settings.processingStartedAt
      && settings.processingStartedAt.getTime() > now.getTime() - 15 * 60 * 1000;
    if (processingIsFresh) {
      await client.query("COMMIT");
      return null;
    }

    const itemResult = await client.query<AutomaticNotificationCampaignItem>(
      `
        SELECT * FROM ${AUTOMATIC_ITEM_TABLE}
        WHERE "campaignVersion" = $1 AND position = $2
        LIMIT 1
      `,
      [settings.campaignVersion, settings.currentPosition],
    );
    const item = itemResult.rows[0];
    if (!item) {
      await client.query(
        `UPDATE ${AUTOMATIC_CAMPAIGN_TABLE} SET "isActive" = FALSE, "isCompleted" = TRUE, "nextSendAt" = NULL, "updatedAt" = NOW() WHERE id = 1`,
      );
      await client.query("COMMIT");
      return null;
    }

    await client.query(
      `UPDATE ${AUTOMATIC_CAMPAIGN_TABLE} SET "isProcessing" = TRUE, "processingStartedAt" = $1, "lastError" = NULL, "updatedAt" = NOW() WHERE id = 1`,
      [now],
    );
    await client.query(
      `UPDATE ${AUTOMATIC_ITEM_TABLE} SET status = 'sending', "lastError" = NULL, "updatedAt" = NOW() WHERE id = $1`,
      [item.id],
    );
    await client.query("COMMIT");
    return { settings, item };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeAutomaticNotificationClaim(input: {
  campaignVersion: number;
  position: number;
  sentAt: Date;
  sentCount: number;
  successCount: number;
  failCount: number;
  nextSendAt: Date | null;
  isCompleted: boolean;
}): Promise<void> {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ${AUTOMATIC_ITEM_TABLE}
        SET status = 'sent', "sentAt" = $3, "sentCount" = $4, "successCount" = $5,
            "failCount" = $6, "lastError" = NULL, "updatedAt" = NOW()
        WHERE "campaignVersion" = $1 AND position = $2
      `,
      [input.campaignVersion, input.position, input.sentAt, input.sentCount, input.successCount, input.failCount],
    );
    await client.query(
      `
        UPDATE ${AUTOMATIC_CAMPAIGN_TABLE}
        SET "currentPosition" = $2,
            "isActive" = CASE WHEN $3 THEN FALSE ELSE "isActive" END,
            "isCompleted" = $3,
            "nextSendAt" = $4,
            "lastSentAt" = $5,
            "lastError" = NULL,
            "isProcessing" = FALSE,
            "processingStartedAt" = NULL,
            "updatedAt" = NOW()
        WHERE id = 1 AND "campaignVersion" = $1
      `,
      [input.campaignVersion, input.position + 1, input.isCompleted, input.nextSendAt, input.sentAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function failAutomaticNotificationClaim(input: {
  itemId: number;
  errorMessage: string;
  retryAt: Date;
}): Promise<void> {
  await ensurePushStoreSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE ${AUTOMATIC_ITEM_TABLE} SET status = 'failed', "lastError" = $2, "updatedAt" = NOW() WHERE id = $1`,
      [input.itemId, input.errorMessage.slice(0, 500)],
    );
    await client.query(
      `
        UPDATE ${AUTOMATIC_CAMPAIGN_TABLE}
        SET "isProcessing" = FALSE, "processingStartedAt" = NULL, "lastError" = $1,
            "nextSendAt" = $2, "updatedAt" = NOW()
        WHERE id = 1
      `,
      [input.errorMessage.slice(0, 500), input.retryAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

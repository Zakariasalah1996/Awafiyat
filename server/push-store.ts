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

const PUSH_TOKEN_TABLE = "awafiyat_push_tokens";
const NOTIFICATION_TABLE = "awafiyat_admin_notifications";

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

import { Pool, type QueryResultRow } from "pg";

const RECIPE_IMAGE_TABLE = "awafiyat_recipe_images";
const MAX_RECIPE_ID_LENGTH = 128;
const MAX_IMAGE_URL_LENGTH = 4096;

interface StoredRecipeImage extends QueryResultRow {
  recipeId: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function isPostgresRecipeImageStoreEnabled(): boolean {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  return databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
}

function getPool(): Pool {
  if (!isPostgresRecipeImageStoreEnabled()) {
    throw new Error("PostgreSQL recipe image store is not enabled");
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
      max: 3,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
  }

  return pool;
}

function validateRecipeImage(recipeId: string, imageUrl: string): void {
  if (!recipeId || recipeId.length > MAX_RECIPE_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(recipeId)) {
    throw new Error("Invalid recipeId");
  }

  if (!imageUrl || imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    throw new Error("Invalid imageUrl");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("Invalid imageUrl");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Recipe images must use HTTPS");
  }
}

async function createSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${RECIPE_IMAGE_TABLE} (
      "recipeId" VARCHAR(${MAX_RECIPE_ID_LENGTH}) PRIMARY KEY,
      "imageUrl" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await getPool().query(`
    CREATE INDEX IF NOT EXISTS awafiyat_recipe_images_updated_idx
    ON ${RECIPE_IMAGE_TABLE} ("updatedAt" DESC)
  `);
}

export async function ensureRecipeImageStoreSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function savePostgresRecipeImage(recipeId: string, imageUrl: string): Promise<void> {
  validateRecipeImage(recipeId, imageUrl);
  await ensureRecipeImageStoreSchema();
  await getPool().query(
    `
      INSERT INTO ${RECIPE_IMAGE_TABLE} ("recipeId", "imageUrl", "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("recipeId") DO UPDATE SET
        "imageUrl" = EXCLUDED."imageUrl",
        "updatedAt" = NOW()
    `,
    [recipeId, imageUrl],
  );
}

export async function seedPostgresRecipeImages(images: Record<string, string>): Promise<void> {
  await ensureRecipeImageStoreSchema();

  for (const [recipeId, imageUrl] of Object.entries(images)) {
    validateRecipeImage(recipeId, imageUrl);
    await getPool().query(
      `
        INSERT INTO ${RECIPE_IMAGE_TABLE} ("recipeId", "imageUrl")
        VALUES ($1, $2)
        ON CONFLICT ("recipeId") DO NOTHING
      `,
      [recipeId, imageUrl],
    );
  }
}

export async function getPostgresRecipeImages(): Promise<Record<string, string>> {
  await ensureRecipeImageStoreSchema();
  const result = await getPool().query<StoredRecipeImage>(`
    SELECT "recipeId", "imageUrl", "createdAt", "updatedAt"
    FROM ${RECIPE_IMAGE_TABLE}
    ORDER BY "recipeId" ASC
  `);

  return Object.fromEntries(result.rows.map((row) => [row.recipeId, row.imageUrl]));
}

export async function getPostgresRecipeImageStoreStatus() {
  await ensureRecipeImageStoreSchema();
  const result = await getPool().query<{ imageCount: string }>(`
    SELECT COUNT(*)::text AS "imageCount"
    FROM ${RECIPE_IMAGE_TABLE}
  `);
  return { ok: true, database: "postgres", imageCount: Number(result.rows[0]?.imageCount ?? 0) };
}

// Storage helpers using Cloudflare R2 (S3-compatible API)
// Cloudflare R2 endpoint: https://<account-id>.r2.cloudflarestorage.com

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_client) return _client;

  if (!ENV.r2AccountId || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey) {
    throw new Error(
      "Cloudflare R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ENV.r2AccessKeyId,
      secretAccessKey: ENV.r2SecretAccessKey,
    },
  });

  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const segmentStart = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot <= segmentStart) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const key = appendHashSuffix(normalizeKey(relKey));
  const bucket = ENV.r2BucketName;

  const body = typeof data === "string" ? Buffer.from(data) : data;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  // Build public URL using the R2 public domain
  const publicUrl = ENV.r2PublicUrl
    ? `${ENV.r2PublicUrl.replace(/\/+$/, "")}/${key}`
    : `https://${ENV.r2AccountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

  return { key, url: publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // If public URL is configured, return it directly (no signed URL needed)
  if (ENV.r2PublicUrl) {
    return {
      key,
      url: `${ENV.r2PublicUrl.replace(/\/+$/, "")}/${key}`,
    };
  }

  // Fallback: generate a signed URL (expires in 1 hour)
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: ENV.r2BucketName,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: 3600 });
  return { key, url };
}

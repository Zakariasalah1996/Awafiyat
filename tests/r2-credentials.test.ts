import { describe, it, expect } from "vitest";
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = "4ae55b3c5dd50d13a7b4c040d31f7a1e";
const R2_ACCESS_KEY_ID = "4b5deaea2f6355c2fa4d56443826191c";
const R2_SECRET_ACCESS_KEY = "8dbd7f3281cec9ba96f396f5a34dcffc4a99ae6c5c03a2873164c7956d4257e3";
const R2_BUCKET_NAME = "awafiyat-images";
const R2_PUBLIC_URL = "https://pub-88cb4a50fada407899a2ef2b456568a1.r2.dev";

describe("Cloudflare R2 Credentials", () => {
  it("should connect to R2 and list objects", async () => {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 5,
    });

    const response = await client.send(command);
    console.log("[R2 Test] Connected successfully. Objects count:", response.KeyCount ?? 0);
    expect(response.$metadata.httpStatusCode).toBe(200);
  });

  it("should upload and delete a test file", async () => {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const testKey = `test/r2-test-${Date.now()}.txt`;
    const testContent = "Awafiyat R2 test file";

    // Upload
    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: "text/plain",
    });
    const putResult = await client.send(putCmd);
    console.log("[R2 Test] Upload status:", putResult.$metadata.httpStatusCode);
    expect(putResult.$metadata.httpStatusCode).toBe(200);

    // Build public URL
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${testKey}`;
    console.log("[R2 Test] Public URL:", publicUrl);
    expect(publicUrl).toContain("r2.dev");

    // Cleanup
    const deleteCmd = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
    });
    await client.send(deleteCmd);
    console.log("[R2 Test] Cleanup done");
  });
});

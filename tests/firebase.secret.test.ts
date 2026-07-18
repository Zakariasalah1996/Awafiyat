import { describe, expect, it } from "vitest";
import { GoogleAuth } from "google-auth-library";

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  client_email: string;
  private_key: string;
}

describe("Firebase FCM V1 service account", () => {
  it("decodes the configured secret and acquires a scoped OAuth token", async () => {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    expect(encoded, "FIREBASE_SERVICE_ACCOUNT_BASE64 must be configured").toBeTruthy();

    const credentials = JSON.parse(
      Buffer.from(encoded as string, "base64").toString("utf8"),
    ) as FirebaseServiceAccount;

    expect(credentials.type).toBe("service_account");
    expect(credentials.project_id).toBe("awafiyat");
    expect(credentials.client_email).toMatch(/@awafiyat\.iam\.gserviceaccount\.com$/);
    expect(credentials.private_key).toContain("BEGIN PRIVATE KEY");

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    expect(accessToken.token).toBeTruthy();
  }, 20_000);
});

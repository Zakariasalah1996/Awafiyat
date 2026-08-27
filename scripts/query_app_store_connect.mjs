import fs from "node:fs";
import crypto from "node:crypto";

const issuerId = "a75a8f2c-dc65-44f3-a745-542108ca6e8b";
const keyId = "VYRHKDCQBX";
const bundleId = "io.awafiyat.health";
const privateKeyPath = "/home/ubuntu/.awafiyat-secrets/AuthKey_VYRHKDCQBX.p8";

const base64url = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
const payload = base64url(
  JSON.stringify({ iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" }),
);
const signingInput = `${header}.${payload}`;
const key = fs.readFileSync(privateKeyPath, "utf8");
const signature = crypto
  .sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" })
  .toString("base64url");
const token = `${signingInput}.${signature}`;

const response = await fetch(
  `https://api.appstoreconnect.apple.com/v1/apps?filter%5BbundleId%5D=${encodeURIComponent(bundleId)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const body = await response.text();
if (!response.ok) {
  console.error(`REQUEST_FAILED ${response.status}`);
  console.error(body);
  process.exit(1);
}
const parsed = JSON.parse(body);
const apps = (parsed.data ?? []).map((app) => ({
  appStoreConnectAppId: app.id,
  bundleId: app.attributes?.bundleId,
  name: app.attributes?.name,
  sku: app.attributes?.sku,
  primaryLocale: app.attributes?.primaryLocale,
}));
console.log(JSON.stringify({ apps }, null, 2));

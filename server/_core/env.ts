export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Cloudflare R2 Storage
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "4ae55b3c5dd50d13a7b4c040d31f7a1e",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "4b5deaea2f6355c2fa4d56443826191c",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "8dbd7f3281cec9ba96f396f5a34dcffc4a99ae6c5c03a2873164c7956d4257e3",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "awafiyat-images",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "https://pub-88cb4a50fada407899a2ef2b456568a1.r2.dev",
};

import "./scripts/load-env.js";
import { getActivePushTokens } from "./server/db";

async function main() {
  const tokens = await getActivePushTokens();
  console.log("Tokens count:", tokens.length);
  tokens.forEach((t: any) => {
    console.log("---");
    console.log("Token:", t.token.substring(0, 80));
    console.log("Platform:", t.platform, "| User:", t.userId);
  });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

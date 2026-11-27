import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./e2e/local-supabase";

const PORT = 3100;

// ローカルの Supabase が動いていれば、タグのページのテストもそれに向けて行う
// アプリにはローカルの接続情報と、通知をテスト用受信箱へ送る設定を渡す
const db = localSupabase();
process.env.E2E_HAS_DB = db ? "1" : "";
process.env.E2E_SUPABASE_URL = db?.url ?? "";
process.env.E2E_SECRET_KEY = db?.secretKey ?? "";
process.env.E2E_MAILPIT_URL = db?.mailpitUrl ?? "";
const appEnv: Record<string, string> = db
  ? {
      NEXT_PUBLIC_SUPABASE_URL: db.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: db.publishableKey,
      SUPABASE_SECRET_KEY: db.secretKey ?? "",
      SITE_URL: `http://127.0.0.1:${PORT}`,
      MAIL_PROVIDER: "mailpit",
      MAILPIT_URL: db.mailpitUrl ?? "",
      RATE_LIMIT_SALT: "e2e-salt",
      CRON_SECRET: "e2e-cron-secret",
    }
  : {};

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
  },
  // 拾った人はほぼスマホで開くので、スマホ表示を基本にする。
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: appEnv,
    timeout: 180_000,
  },
});

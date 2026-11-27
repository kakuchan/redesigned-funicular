import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./e2e/local-supabase";

const PORT = 3100;

// ローカルの Supabase が動いていれば、タグのページのテストもそれに向けて行う
// （テスト側の補助にだけ secret key とテスト用受信箱の URL を渡す。アプリには渡さない）
const db = localSupabase();
process.env.E2E_HAS_DB = db ? "1" : "";
process.env.E2E_SUPABASE_URL = db?.url ?? "";
process.env.E2E_SECRET_KEY = db?.secretKey ?? "";
process.env.E2E_MAILPIT_URL = db?.mailpitUrl ?? "";
const appEnv: Record<string, string> = db
  ? {
      NEXT_PUBLIC_SUPABASE_URL: db.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: db.publishableKey,
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

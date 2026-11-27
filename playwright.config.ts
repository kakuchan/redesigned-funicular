import { defineConfig, devices } from "@playwright/test";
import { localSupabaseEnv } from "./e2e/local-supabase";

const PORT = 3100;

// ローカルの Supabase が動いていれば、タグのページのテストもそれに向けて行う
const supabaseEnv = localSupabaseEnv();
process.env.E2E_HAS_DB = supabaseEnv ? "1" : "";

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
    env: { ...supabaseEnv },
    timeout: 180_000,
  },
});

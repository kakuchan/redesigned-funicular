import { execSync } from "node:child_process";

/**
 * E2E 用に、ローカルの Supabase の URL と公開キーを取ってくる。
 * 環境変数があればそれを使う。どちらもなければ null（DB を使うテストは飛ばす）。
 */
export function localSupabaseEnv(): Record<string, string> | null {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  }
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const vars = Object.fromEntries(
      out
        .split("\n")
        .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1], m[2]]),
    );
    const url = vars.API_URL;
    const key = vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;
    if (!url || !key) return null;
    return {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    };
  } catch {
    return null;
  }
}

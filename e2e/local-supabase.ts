import { execSync } from "node:child_process";

export type LocalSupabase = {
  url: string;
  publishableKey: string;
  secretKey?: string;
  mailpitUrl?: string;
};

/**
 * E2E 用に、ローカルの Supabase の接続情報を取ってくる。
 * 動いていなければ null（DB を使うテストは飛ばす）。
 */
export function localSupabase(): LocalSupabase | null {
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
    const publishableKey = vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;
    if (!url || !publishableKey) return null;
    return {
      url,
      publishableKey,
      secretKey: vars.SECRET_KEY ?? vars.SERVICE_ROLE_KEY,
      mailpitUrl: vars.MAILPIT_URL ?? vars.INBUCKET_URL,
    };
  } catch {
    return null;
  }
}

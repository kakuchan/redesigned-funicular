import { createHash } from "node:crypto";

/**
 * 拾った人の IP アドレスを、秘密の塩を付けた SHA-256 にする。
 * 生の IP アドレスは保存もログ出力もしない（設計書 §4）。
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function ipHashFromHeaders(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const ip = clientIp(headers);
  const salt = env.RATE_LIMIT_SALT || env.SUPABASE_SECRET_KEY;
  if (!ip || !salt) return null;
  return hashIp(ip, salt);
}

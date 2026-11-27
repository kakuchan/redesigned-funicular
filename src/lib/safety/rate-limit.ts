import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** 回数制限の設定（D-012） */
export const LIMITS = {
  // 1つのタグへの新しい連絡: 1時間に5件
  startPerTag: { limit: 5, windowSeconds: 60 * 60 },
  // 同じ送信元からの新しい連絡: 1時間に10件
  startPerIp: { limit: 10, windowSeconds: 60 * 60 },
  // 1つの会話への拾った人の返信: 1時間に20件
  replyPerConversation: { limit: 20, windowSeconds: 60 * 60 },
  // 通報: 同じ送信元から1日に10件
  reportPerIp: { limit: 10, windowSeconds: 24 * 60 * 60 },
} as const;

/** すべて通れば true。DB に届かないときは安全側（止める）に倒す。 */
export async function allow(
  checks: { key: string; limit: number; windowSeconds: number }[],
): Promise<boolean> {
  const admin = createAdminClient();
  for (const check of checks) {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: check.key,
      p_limit: check.limit,
      p_window_seconds: check.windowSeconds,
    });
    if (error || data !== true) return false;
  }
  return true;
}

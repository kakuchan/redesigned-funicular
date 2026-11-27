import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * service_role で動くクライアント。RLS を通らないので、使う場所を絞る。
 * - 拾った人の操作（finder_* 関数。トークンでしか会話を特定しない）
 * - 通知メールの宛先（持ち主のメールアドレス）を調べる
 * ブラウザに渡す値や画面には、ここで取ったデータをそのまま出さない。
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY が設定されていません（.env.example を参照）");
  }
  const { supabaseUrl } = publicEnv();
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 持ち主のメールアドレス（通知用）。見つからなければ null。 */
export async function ownerEmail(ownerId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().auth.admin.getUserById(ownerId);
  if (error) return null;
  return data.user?.email ?? null;
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { GetTagPublicRpc } from "@/lib/tags/public";
import type { Database } from "./database.types";

/**
 * 拾った人用ページ（未ログイン）から DB を読むクライアント。
 * cookie を使わず、公開キーだけで get_tag_public() を呼ぶ。
 */
function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const getTagPublicRpc: GetTagPublicRpc = async (tagId) => {
  const { data, error } = await createPublicClient().rpc("get_tag_public", {
    p_tag_id: tagId,
  });
  return { data, error };
};

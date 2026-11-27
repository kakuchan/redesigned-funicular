import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/** Client Component から使う Supabase クライアント（公開キーのみ）。 */
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

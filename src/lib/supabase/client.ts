import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Client Component から使う Supabase クライアント（公開キーのみ）。 */
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}

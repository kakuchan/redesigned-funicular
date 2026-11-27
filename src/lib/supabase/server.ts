import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Server Component / Route Handler / Server Action から使う Supabase クライアント。
 * ログイン中の利用者の権限で動くので、RLS がそのまま効く。
 */
export async function createClient() {
  // 先に cookie を読む（リクエストごとの処理になり、ビルド時には実行されない）
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = publicEnv();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component からは cookie を書けない。
          // セッションの更新は M2（ログイン）で追加する proxy.ts で行う。
        }
      },
    },
  });
}

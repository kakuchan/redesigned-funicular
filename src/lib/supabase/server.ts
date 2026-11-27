import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Server Component / Route Handler / Server Action から使う Supabase クライアント。
 * ログイン中の利用者の権限で動くので、RLS がそのまま効く。
 */
export async function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
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

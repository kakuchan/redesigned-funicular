import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** ログイン中の利用者。いなければ null。 */
export async function currentUser() {
  // ログイン状態はリクエストごとに違うので、事前描画しない
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** ログインしていなければログイン画面へ送る。 */
export async function requireUser(nextPath: string) {
  const { supabase, user } = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}

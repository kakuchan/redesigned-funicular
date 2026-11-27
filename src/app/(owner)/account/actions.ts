"use server";

import { redirect } from "next/navigation";
import { PHOTO_BUCKET } from "@/lib/photos/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * 退会: ログイン中の本人のアカウントを消す。
 * 持ち物・やり取りは DB の on delete cascade で一緒に消え、タグは未登録に戻す。
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: items } = await admin.from("items").select("tag_id").eq("owner_id", user.id);
  const tagIds = (items ?? []).map((i) => i.tag_id);

  // 写真はストレージにあるので、先に消す（DB の行は退会で一緒に消える）
  const { data: photos } = await admin
    .from("messages")
    .select("photo_path, conversations!inner(items!inner(owner_id))")
    .eq("conversations.items.owner_id", user.id)
    .not("photo_path", "is", null);
  const paths = (photos ?? []).map((p) => p.photo_path).filter((p): p is string => !!p);
  if (paths.length > 0) await admin.storage.from(PHOTO_BUCKET).remove(paths);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error("退会できませんでした");

  if (tagIds.length > 0) {
    await admin.from("tags").update({ status: "unregistered" }).in("id", tagIds).eq("status", "active");
  }
  await supabase.auth.signOut();
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateItemInput } from "@/lib/items/validate";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string; saved?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function ownerClient(itemId: string) {
  if (!UUID.test(itemId)) redirect("/items");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/items/${itemId}`)}`);
  return supabase;
}

export async function updateItem(
  itemId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await ownerClient(itemId);
  const input = validateItemInput(form);
  if (!input.ok) return { error: input.error };

  // RLS で自分の持ち物しか更新されない。0件なら見つからない扱い。
  const { data, error } = await supabase
    .from("items")
    .update({ name: input.value.name, public_message: input.value.publicMessage })
    .eq("id", itemId)
    .select("id");
  if (error || data.length === 0) return { error: "保存できませんでした" };
  revalidatePath(`/items/${itemId}`);
  return { saved: true };
}

// bind した引数はブラウザから送り返されるので、中身を信用せずに確かめる
export async function setFlag(itemId: string, flag: "lost_mode" | "paused", value: boolean) {
  const supabase = await ownerClient(itemId);
  const on = value === true;
  const patch =
    flag === "lost_mode" ? { lost_mode: on } : flag === "paused" ? { paused: on } : null;
  if (!patch) return;
  await supabase.from("items").update(patch).eq("id", itemId);
  revalidatePath(`/items/${itemId}`);
}

export async function releaseItem(itemId: string) {
  const supabase = await ownerClient(itemId);
  await supabase.rpc("release_tag", { p_item_id: itemId });
  redirect("/items");
}

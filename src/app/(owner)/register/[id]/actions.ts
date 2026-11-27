"use server";

import { redirect } from "next/navigation";
import { isTagId } from "@/lib/tags/id";
import { validateItemInput } from "@/lib/items/validate";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

export async function registerTag(
  tagId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isTagId(tagId)) return { error: "タグが見つかりません" };
  const input = validateItemInput(form);
  if (!input.ok) return { error: input.error };

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect(`/login?next=${encodeURIComponent(`/register/${tagId}`)}`);

  const { data, error } = await supabase.rpc("register_tag", {
    p_tag_id: tagId,
    p_name: input.value.name,
    p_public_message: input.value.publicMessage,
  });
  if (error) {
    if (error.code === "P0001") return { error: "このタグはすでに登録されているか、使えません" };
    if (error.code === "P0002") return { error: "タグが見つかりません" };
    console.error("register_tag failed", error.code);
    return { error: "登録できませんでした。少し時間をおいてもう一度お試しください" };
  }
  redirect(`/items/${data}?registered=1`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MESSAGE_MAX } from "@/lib/conversations/labels";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string; sent?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function ownerClient(conversationId: string) {
  if (!UUID.test(conversationId)) redirect("/items");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/conversations/${conversationId}`)}`);
  return supabase;
}

export async function ownerReply(
  conversationId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await ownerClient(conversationId);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "メッセージを入れてください" };
  if ([...body].length > MESSAGE_MAX) return { error: `メッセージは${MESSAGE_MAX}文字までです` };

  const { error } = await supabase.rpc("owner_reply", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) {
    if (error.code === "P0001") return { error: "このやり取りは終わっています" };
    return { error: "送れませんでした" };
  }
  revalidatePath(`/conversations/${conversationId}`);
  return { sent: Date.now() };
}

export async function closeConversation(conversationId: string) {
  const supabase = await ownerClient(conversationId);
  await supabase.rpc("owner_close_conversation", { p_conversation_id: conversationId });
  revalidatePath(`/conversations/${conversationId}`);
}

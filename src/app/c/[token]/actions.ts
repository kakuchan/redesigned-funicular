"use server";

import { revalidatePath } from "next/cache";
import { MESSAGE_MAX } from "@/lib/conversations/labels";
import { hashFinderToken, isFinderToken } from "@/lib/conversations/token";
import { sendQuietly } from "@/lib/notify/mailer";
import { replyMail } from "@/lib/notify/templates";
import { siteUrl } from "@/lib/site";
import { createAdminClient, ownerEmail } from "@/lib/supabase/admin";

type FormState = { error?: string; sent?: number };

export async function finderReply(
  token: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isFinderToken(token)) return { error: "このやり取りは見つかりません" };
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "メッセージを入れてください" };
  if ([...body].length > MESSAGE_MAX) return { error: `メッセージは${MESSAGE_MAX}文字までです` };

  const { data, error } = await createAdminClient().rpc("finder_reply", {
    p_token_hash: hashFinderToken(token),
    p_body: body,
  });
  const reply = data?.[0];
  if (error || !reply) {
    if (error?.code === "P0001") return { error: "このやり取りは終わっています" };
    return { error: "送れませんでした。少し時間をおいてもう一度お試しください" };
  }

  const to = await ownerEmail(reply.owner_id);
  if (to) {
    await sendQuietly({
      to,
      ...replyMail({
        itemName: reply.item_name,
        conversationUrl: `${siteUrl()}/conversations/${reply.conversation_id}`,
      }),
    });
  }
  revalidatePath(`/c/${token}`);
  return { sent: Date.now() };
}

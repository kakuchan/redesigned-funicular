"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { MESSAGE_MAX } from "@/lib/conversations/labels";
import { hashFinderToken, isFinderToken } from "@/lib/conversations/token";
import { sendQuietly } from "@/lib/notify/mailer";
import { replyMail, reportMail } from "@/lib/notify/templates";
import { ipHashFromHeaders } from "@/lib/safety/ip";
import { LIMITS, allow } from "@/lib/safety/rate-limit";
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

  const hash = hashFinderToken(token);
  if (!(await allow([{ key: `reply:${hash}`, ...LIMITS.replyPerConversation }]))) {
    return { error: "短い時間に送られたメッセージが多すぎます。しばらくしてからもう一度お試しください" };
  }

  const { data, error } = await createAdminClient().rpc("finder_reply", {
    p_token_hash: hash,
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

export async function finderReport(
  token: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isFinderToken(token)) return { error: "このやり取りは見つかりません" };
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return { error: "理由を入れてください" };
  if ([...reason].length > 1000) return { error: "理由は1000文字までです" };

  const ipHash = ipHashFromHeaders(await headers());
  if (ipHash && !(await allow([{ key: `report:${ipHash}`, ...LIMITS.reportPerIp }]))) {
    return { error: "しばらくしてからもう一度お試しください" };
  }
  const hash = hashFinderToken(token);
  const admin = createAdminClient();
  const { error } = await admin.rpc("finder_report_conversation", {
    p_token_hash: hash,
    p_reason: reason,
  });
  if (error) return { error: "送れませんでした" };

  const operator = process.env.REPORT_EMAIL;
  if (operator) {
    const { data } = await admin.rpc("finder_get_conversation", { p_token_hash: hash });
    const id = (data as { id?: string } | null)?.id ?? "不明";
    await sendQuietly({ to: operator, ...reportMail({ reporter: "finder", conversationId: id, reason }) });
  }
  return { sent: Date.now() };
}

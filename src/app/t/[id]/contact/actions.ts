"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rememberFinderToken } from "@/lib/conversations/finder-cookie";
import { MESSAGE_MAX, isItemLocation, parseLatLng } from "@/lib/conversations/labels";
import { newFinderToken } from "@/lib/conversations/token";
import { sendQuietly } from "@/lib/notify/mailer";
import { readPhoto, storeFinderPhoto } from "@/lib/photos/store";
import { ipHashFromHeaders } from "@/lib/safety/ip";
import { LIMITS, allow } from "@/lib/safety/rate-limit";
import { foundMail } from "@/lib/notify/templates";
import { siteUrl } from "@/lib/site";
import { createAdminClient, ownerEmail } from "@/lib/supabase/admin";
import { isTagId } from "@/lib/tags/id";

export type ContactState = { error?: string };

export async function startContact(
  tagId: string,
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  if (!isTagId(tagId)) return { error: "このタグには今は連絡できません" };

  const location = form.get("location");
  if (!isItemLocation(location)) return { error: "「どこにありますか」を選んでください" };
  const body = String(form.get("body") ?? "").trim();
  if ([...body].length > MESSAGE_MAX) return { error: `メッセージは${MESSAGE_MAX}文字までです` };
  const position = form.get("sharePosition") === "on"
    ? parseLatLng(form.get("latitude"), form.get("longitude"))
    : null;

  const photo = await readPhoto(form.get("photo"));
  if (photo && "error" in photo) return { error: photo.error };

  const ipHash = ipHashFromHeaders(await headers());
  const allowed = await allow([
    { key: `start:tag:${tagId}`, ...LIMITS.startPerTag },
    ...(ipHash ? [{ key: `start:ip:${ipHash}`, ...LIMITS.startPerIp }] : []),
  ]);
  if (!allowed) {
    return { error: "短い時間に送られた連絡が多すぎます。しばらくしてからもう一度お試しください" };
  }

  const { token, hash } = newFinderToken();
  const { data, error } = await createAdminClient().rpc("finder_start_conversation", {
    p_tag_id: tagId,
    p_token_hash: hash,
    p_item_location: location,
    p_body: body,
    p_latitude: position?.latitude,
    p_longitude: position?.longitude,
    p_ip_hash: ipHash ?? undefined,
  });
  const started = data?.[0];
  if (error || !started) {
    if (error?.code === "P0001" || error?.code === "P0003") {
      // ブロックされていることは相手に分からないようにする
      return { error: "このタグには今は連絡できません" };
    }
    console.error("finder_start_conversation failed", error?.code);
    return { error: "送れませんでした。少し時間をおいてもう一度お試しください" };
  }

  if (photo) await storeFinderPhoto(started.conversation_id, started.message_id, photo.bytes);

  const to = await ownerEmail(started.owner_id);
  if (to) {
    await sendQuietly({
      to,
      ...foundMail({
        itemName: started.item_name,
        location,
        hasPosition: position !== null,
        hasPhoto: photo !== null,
        conversationUrl: `${siteUrl()}/conversations/${started.conversation_id}`,
      }),
    });
  }

  await rememberFinderToken(tagId, token);
  redirect(`/c/${token}?sent=1`);
}

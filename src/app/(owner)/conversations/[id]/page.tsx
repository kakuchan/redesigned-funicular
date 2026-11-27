import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MessageForm } from "@/components/message-form";
import { MessageList, type MessageView } from "@/components/message-list";
import { ReportForm } from "@/components/report-form";
import { signedPhotoUrl } from "@/lib/photos/store";
import { ConfirmButton } from "../../items/[id]/confirm-button";
import { requireUser } from "@/lib/auth/user";
import { blockConversation, closeConversation, ownerReply, reportConversation } from "./actions";

export const metadata: Metadata = { title: "見つけた人とのやり取り" };

export default function OwnerConversationPage({ params }: PageProps<"/conversations/[id]">) {
  return (
    <main>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Conversation params={params} />
      </Suspense>
    </main>
  );
}

async function Conversation({ params }: { params: PageProps<"/conversations/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/conversations/${id}`);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, status, expires_at, item:items(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!conversation || !conversation.item) notFound();

  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender, body, item_location, latitude, longitude, photo_path, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // RLS で読めたメッセージの写真だけ、一時 URL を作る
  const messages: MessageView[] = await Promise.all((rows ?? []).map(async (m) => ({
    id: m.id,
    sender: m.sender as "finder" | "owner",
    body: m.body,
    itemLocation: m.item_location,
    createdAt: m.created_at,
    position:
      m.latitude !== null && m.longitude !== null
        ? { latitude: m.latitude, longitude: m.longitude }
        : null,
    hasPosition: m.latitude !== null,
    photoUrl: m.photo_path ? await signedPhotoUrl(m.photo_path) : null,
    hasPhoto: m.photo_path !== null,
  })));

  const active = conversation.status === "open" && new Date(conversation.expires_at) > new Date();

  return (
    <>
      <p>
        <Link href={`/items/${conversation.item.id}`}>← {conversation.item.name}</Link>
      </p>
      <h1>見つけた人とのやり取り</h1>
      <MessageList messages={messages} viewer="owner" />
      {active ? (
        <>
          <MessageForm action={ownerReply.bind(null, id)} label="見つけた人へのメッセージ" />
          <p className="note">
            受け取り方の相談は、人の多い場所や施設の窓口を使うと安心です。あなたの連絡先は書かないでください。
          </p>
          <section className="card">
            <h2>受け取りが済んだら</h2>
            <form action={closeConversation.bind(null, id)}>
              <button className="button button-secondary" type="submit">
                受け取った（やり取りを終える）
              </button>
            </form>
          </section>
        </>
      ) : (
        <p className="card">
          {conversation.status === "closed"
            ? "このやり取りは終わりました。"
            : conversation.status === "blocked"
              ? "この相手をブロックしました。30日間、この持ち物に連絡できません。"
              : "見つけた人の返信用リンクの期限が切れました。"}
        </p>
      )}
      {conversation.status !== "blocked" && (
        <section className="card">
          <h2>いたずら・嫌がらせのとき</h2>
          <p className="note">ブロックすると、このやり取りを終え、同じ相手から30日間この持ち物に連絡が来なくなります。</p>
          <ConfirmButton
            action={blockConversation.bind(null, id)}
            label="この相手をブロックする"
            confirmLabel="ブロックする"
          />
        </section>
      )}
      <ReportForm action={reportConversation.bind(null, id)} />
    </>
  );
}

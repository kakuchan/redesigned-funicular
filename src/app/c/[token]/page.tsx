import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MessageForm } from "@/components/message-form";
import { MessageList, type MessageView } from "@/components/message-list";
import { hashFinderToken, isFinderToken } from "@/lib/conversations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { finderReply } from "./actions";

export const metadata: Metadata = {
  title: "持ち主とのやり取り",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type FinderConversation = {
  id: string;
  item_name: string;
  status: "open" | "closed";
  expires_at: string;
  active: boolean;
  messages: {
    id: string;
    sender: "finder" | "owner";
    body: string;
    item_location: string | null;
    has_location: boolean;
    created_at: string;
  }[];
};

export default function FinderConversationPage({
  params,
  searchParams,
}: PageProps<"/c/[token]">) {
  return (
    <main>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Conversation params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

async function Conversation({
  params,
  searchParams,
}: Pick<PageProps<"/c/[token]">, "params" | "searchParams">) {
  const { token } = await params;
  const { sent } = await searchParams;
  if (!isFinderToken(token)) notFound();

  const { data, error } = await createAdminClient().rpc("finder_get_conversation", {
    p_token_hash: hashFinderToken(token),
  });
  if (error) throw new Error("やり取りを読み込めませんでした");
  const conversation = data as FinderConversation | null;
  if (!conversation) notFound();

  const messages: MessageView[] = conversation.messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    itemLocation: m.item_location,
    createdAt: m.created_at,
    position: null,
    hasPosition: m.has_location,
  }));

  return (
    <>
      {sent && (
        <p className="success" role="status">
          持ち主に届きました。ありがとうございます。
        </p>
      )}
      <p className="eyebrow">{conversation.item_name}</p>
      <h1>持ち主とのやり取り</h1>
      <MessageList messages={messages} viewer="finder" />
      {conversation.active ? (
        <>
          <MessageForm action={finderReply.bind(null, token)} label="持ち主へのメッセージ" />
          <section className="card">
            <h2>このページを残しておいてください</h2>
            <p>
              持ち主からの返事はこのページに届きます（メールなどでは届きません）。ブックマークするか、このページの URL を控えておいてください。
              {dateFormat.format(new Date(conversation.expires_at))} まで使えます。
            </p>
          </section>
        </>
      ) : conversation.status === "closed" ? (
        <p className="card">持ち主が受け取りを済ませました。ご協力ありがとうございました。</p>
      ) : (
        <p className="card">このやり取りは期限が切れました。</p>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTagPublicRpc } from "@/lib/supabase/public";
import { readPublicTag } from "@/lib/tags/public";

export const metadata: Metadata = {
  title: "落とし物のタグ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TagPage({ params }: PageProps<"/t/[id]">) {
  return (
    <main>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <TagView params={params} />
      </Suspense>
    </main>
  );
}

async function TagView({ params }: { params: PageProps<"/t/[id]">["params"] }) {
  const { id } = await params;
  const tag = await readPublicTag(id, getTagPublicRpc);

  switch (tag.status) {
    case "not_found":
      notFound();

    case "unregistered":
      return (
        <>
          <h1>まだ登録されていないタグです</h1>
          <p>このタグは、持ち主の登録がまだ済んでいません。</p>
          <section className="card">
            <h2>このタグの持ち主の方へ</h2>
            <p>登録すると、拾った人から連絡が届くようになります。</p>
            <Link className="button" href={`/register/${id}`}>
              登録する
            </Link>
          </section>
          <p className="note">
            拾った方へ: 持ち主に連絡することができません。お近くの施設の窓口や交番に届けてください。
          </p>
        </>
      );

    case "suspended":
      return (
        <>
          <h1>このタグは今は使えません</h1>
          <p>
            このタグは止められています。拾った方は、お近くの施設の窓口や交番に届けてください。
          </p>
        </>
      );

    case "active":
      return (
        <>
          {tag.lostMode && (
            <p className="lost" role="status">
              持ち主がさがしています
            </p>
          )}
          <p className="eyebrow">落とし物を見つけてくれてありがとうございます</p>
          <h1>{tag.itemName}</h1>
          {tag.publicMessage && (
            <section className="card">
              <h2>持ち主からのひとこと</h2>
              <p className="message">{tag.publicMessage}</p>
            </section>
          )}
          {/* 連絡の送信は M3 で作る */}
          <button className="button" type="button" disabled>
            持ち主に連絡する（準備中）
          </button>
          <p className="note">
            あなたの名前や連絡先は、持ち主には伝わりません。
          </p>
        </>
      );
  }
}

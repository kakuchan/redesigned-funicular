import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/user";
import { ItemForm } from "../item-form";
import { releaseItem, setFlag, updateItem } from "./actions";
import { ConfirmButton } from "./confirm-button";

export const metadata: Metadata = { title: "持ち物の設定" };

export default function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  return (
    <main>
      <p>
        <Link href="/items">← 登録した持ち物</Link>
      </p>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Item params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Item({
  params,
  searchParams,
}: Pick<PageProps<"/items/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { registered } = await searchParams;
  const { supabase } = await requireUser(`/items/${id}`);

  const { data: item } = await supabase
    .from("items")
    .select("id, tag_id, name, public_message, lost_mode, paused")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  return (
    <>
      {registered && (
        <p className="success" role="status">
          登録しました。タグを読んだ人から連絡が届くようになりました。
        </p>
      )}
      <h1>{item.name}</h1>

      <section className="card">
        <h2>状態</h2>
        <p>
          {item.paused
            ? "一時停止中です。タグを読んだ人には「今は使えません」と表示されます。"
            : "連絡を受け付けています。"}
        </p>
        <form action={setFlag.bind(null, item.id, "lost_mode", !item.lost_mode)}>
          <button className="button button-secondary" type="submit">
            {item.lost_mode ? "「さがしています」をやめる" : "なくした（「さがしています」と表示する）"}
          </button>
        </form>
        <form action={setFlag.bind(null, item.id, "paused", !item.paused)}>
          <button className="button button-secondary" type="submit">
            {item.paused ? "受け付けを再開する" : "一時停止する"}
          </button>
        </form>
        <p className="note">
          <Link href={`/t/${item.tag_id}`}>拾った人に見える画面を確かめる</Link>
        </p>
      </section>

      <section>
        <h2>名前とひとこと</h2>
        <ItemForm
          action={updateItem.bind(null, item.id)}
          submitLabel="保存する"
          defaults={{ name: item.name, publicMessage: item.public_message }}
        />
      </section>

      <section className="card">
        <h2>登録の解除</h2>
        <p>
          この持ち物の登録を消します。タグは未登録に戻り、もう一度登録できます。
        </p>
        <ConfirmButton
          action={releaseItem.bind(null, item.id)}
          label="登録を解除する"
          confirmLabel="本当に解除する"
        />
      </section>
    </>
  );
}

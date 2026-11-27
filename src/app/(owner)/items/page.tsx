import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/user";

export const metadata: Metadata = { title: "登録した持ち物" };

export default function ItemsPage() {
  return (
    <main>
      <h1>登録した持ち物</h1>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <ItemList />
      </Suspense>
    </main>
  );
}

async function ItemList() {
  const { supabase } = await requireUser("/items");
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, lost_mode, paused")
    .order("created_at", { ascending: true });
  if (error) throw new Error("持ち物を読み込めませんでした");

  if (items.length === 0) {
    return (
      <p>
        まだ登録した持ち物はありません。タグをスマホでかざすか、台紙の QR コードを読むと登録できます。
      </p>
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/items/${item.id}`} className="card item-link">
            <span className="item-name">{item.name}</span>
            {item.paused && <span className="badge">一時停止中</span>}
            {item.lost_mode && <span className="badge badge-lost">さがしています</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

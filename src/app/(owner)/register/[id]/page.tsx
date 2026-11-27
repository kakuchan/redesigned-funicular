import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/user";
import { getTagPublicRpc } from "@/lib/supabase/public";
import { readPublicTag } from "@/lib/tags/public";
import { ItemForm } from "../../items/item-form";
import { registerTag } from "./actions";

export const metadata: Metadata = {
  title: "タグの登録",
  referrer: "no-referrer",
};

export default function RegisterPage({ params }: PageProps<"/register/[id]">) {
  return (
    <main>
      <h1>タグの登録</h1>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Register params={params} />
      </Suspense>
    </main>
  );
}

async function Register({ params }: { params: PageProps<"/register/[id]">["params"] }) {
  const { id } = await params;
  const tag = await readPublicTag(id, getTagPublicRpc);
  if (tag.status === "not_found") notFound();

  if (tag.status !== "unregistered") {
    return (
      <>
        <p>このタグはすでに登録されているか、今は使えません。</p>
        <p>
          <Link href="/items">登録した持ち物を見る</Link>
        </p>
      </>
    );
  }

  await requireUser(`/register/${id}`);

  return (
    <>
      <p>このタグを付ける持ち物と、拾った人に見せるひとことを入れてください。</p>
      <ItemForm action={registerTag.bind(null, id)} submitLabel="登録する" />
    </>
  );
}

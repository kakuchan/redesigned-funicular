import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/next-path";
import { pendingEmail } from "../actions";
import { CodeForm } from "../forms";

export const metadata: Metadata = { title: "確認コードの入力" };

export default function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  return (
    <main>
      <h1>確認コードの入力</h1>
      <Suspense fallback={null}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Verify({
  searchParams,
}: {
  searchParams: PageProps<"/login/verify">["searchParams"];
}) {
  const next = safeNextPath((await searchParams).next);
  const email = await pendingEmail();
  if (!email) {
    return (
      <p>
        時間がたったため、もう一度やり直してください。
        <Link href={`/login?next=${encodeURIComponent(next)}`}>メールアドレスの入力へ</Link>
      </p>
    );
  }
  return (
    <>
      <p>{email} に届いた6桁の確認コードを入れてください。</p>
      <CodeForm next={next} />
      <p className="note">
        届かないときは迷惑メールのフォルダも確かめてください。
        <Link href={`/login?next=${encodeURIComponent(next)}`}>メールアドレスを入れ直す</Link>
      </p>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/user";
import { ConfirmButton } from "../items/[id]/confirm-button";
import { deleteAccount } from "./actions";

export const metadata: Metadata = { title: "アカウント" };

export default function AccountPage() {
  return (
    <main>
      <h1>アカウント</h1>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const { user } = await requireUser("/account");
  return (
    <>
      <section className="card">
        <h2>メールアドレス</h2>
        <p>{user.email}</p>
        <p className="note">通知はこのアドレスに届きます。</p>
      </section>
      <section className="card">
        <h2>退会</h2>
        <p>
          アカウントを消します。登録した持ち物と、届いたやり取りもすべて消え、元に戻せません。タグは未登録に戻ります。
        </p>
        <ConfirmButton action={deleteAccount} label="退会する" confirmLabel="本当に退会する" />
      </section>
    </>
  );
}

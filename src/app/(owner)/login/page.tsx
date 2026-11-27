import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/next-path";
import { currentUser } from "@/lib/auth/user";
import { EmailForm } from "./forms";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main>
      <h1>ログイン</h1>
      <p>
        メールアドレスに確認コードを送ります。パスワードはいりません。初めての方もこちらから登録できます。
      </p>
      <Suspense fallback={null}>
        <Login searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const next = safeNextPath((await searchParams).next);
  const { user } = await currentUser();
  if (user) redirect(next);
  return <EmailForm next={next} />;
}

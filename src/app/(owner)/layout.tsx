import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth/user";
import { signOut } from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OwnerLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="site-header">
        <Link href="/items" className="brand">
          持ち物タグ
        </Link>
        <Suspense fallback={null}>
          <SignOutButton />
        </Suspense>
      </header>
      {children}
    </>
  );
}

async function SignOutButton() {
  const { user } = await currentUser();
  if (!user) return null;
  return (
    <form action={signOut} className="header-actions">
      <Link href="/account">アカウント</Link>
      <button type="submit" className="link-button">
        ログアウト
      </button>
    </form>
  );
}

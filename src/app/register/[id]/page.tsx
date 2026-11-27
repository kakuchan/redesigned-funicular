import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "タグの登録",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// 登録（メールログインと持ち物の設定）は M2 で作る
export default function RegisterPage() {
  return (
    <main>
      <h1>タグの登録</h1>
      <p>登録の受付は準備中です。もうしばらくお待ちください。</p>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>持ち物タグ</h1>
      <p>
        持ち物に付けたタグを、拾った人がスマホで読むと、持ち主に連絡が届きます。
        お互いの連絡先は相手に見えません。
      </p>

      <section className="card">
        <h2>落とし物を拾った方へ</h2>
        <p>
          タグにスマホをかざすか、タグの QR コードを読んでください。アプリも登録もいりません。持ち主に「どこにあるか」を知らせることができます。
        </p>
      </section>

      <section className="card">
        <h2>タグを持っている方へ</h2>
        <ol className="steps">
          <li>タグにスマホをかざす（または台紙の QR コードを読む）</li>
          <li>メールアドレスに届く確認コードでログイン</li>
          <li>持ち物の名前と、拾った人へのひとことを入れる</li>
        </ol>
        <p className="note">
          お名前・学校名・クラス・住所・電話番号は書かないでください。
        </p>
        <Link className="button" href="/items">
          登録した持ち物を見る
        </Link>
      </section>
    </main>
  );
}

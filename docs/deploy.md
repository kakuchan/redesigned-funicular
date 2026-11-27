# 本番に出す手順

ローカルで動いているものを、本番のドメインで公開するまでの手順です。
上から順に進めてください。〔 〕は決まったら埋めるところです。

## 0. 先に決めること（かくちゃん）

| 項目 | 例 | メモ |
|---|---|---|
| ドメイン | `〔tag.example.jp〕` | **タグに焼くので後から変えられません**。長く使えるものを |
| Supabase の本番プロジェクト | 東京リージョン（`ap-northeast-1`） | 無料プランは1週間使わないと止まるので、試験配布からは有料プランを推奨 |
| メール送信サービス | Resend | 送信元ドメインの DNS 設定（SPF・DKIM）が必要 |
| 公開先 | Vercel | Cron（毎日の自動削除）を使う |
| 運営の連絡先 | `〔support@…〕` | 通報の受け取り（`REPORT_EMAIL`）、規約・ポリシーの問い合わせ先 |

## 1. Supabase（本番）

1. Supabase で新しいプロジェクトを東京リージョンで作る。
2. 手元でプロジェクトにつなぎ、マイグレーションを流す。
   ```bash
   npx supabase login
   npx supabase link --project-ref 〔project-ref〕
   npx supabase db push          # supabase/migrations/ をすべて適用（seed.sql は入らない）
   ```
3. ダッシュボードの **Authentication → URL Configuration**
   - Site URL: `https://〔ドメイン〕`
   - Redirect URLs: `https://〔ドメイン〕/**`
4. **Authentication → Emails → SMTP Settings** で独自の SMTP を設定する（Supabase 標準の送信は1時間あたりの上限が小さく、本番には使えません）。Resend なら SMTP の情報が Resend の画面にあります。
5. **Authentication → Emails → Templates** の「Magic Link」と「Confirm signup」を、`supabase/templates/login_code.html` と同じ内容にする（6桁のコード `{{ .Token }}` を出す）。件名は「【持ち物タグ】ログインの確認コード」。
6. **Authentication → Sign In / Providers → Email**: 「Confirm email」はオフのまま（確認コードの入力が確認を兼ねる）。OTP の有効期限は 3600 秒。
7. **Storage**: マイグレーションで非公開バケット `photos` ができていることを確かめる。
8. **Project Settings → API Keys** で publishable key と secret key を控える（secret key は誰にも渡さない）。

## 2. メール（Resend）

1. Resend に送信元ドメイン（例: `〔mail.ドメイン〕`）を追加し、表示される DNS レコードを設定して認証を通す。
2. API キーを作る（送信だけの権限）。
3. 同じドメインで SMTP 用の情報を確認し、上の 1-4 に入れる。

## 3. Vercel

1. GitHub のこのリポジトリを Vercel にインポートする（Framework: Next.js）。
2. **Environment Variables**（Production）に次を入れる。値は `.env.example` の説明どおり。

   | 名前 | 値 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の API URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
   | `SUPABASE_SECRET_KEY` | secret key |
   | `SITE_URL` | `https://〔ドメイン〕` |
   | `MAIL_PROVIDER` | `resend` |
   | `MAIL_FROM` | `持ち物タグ <no-reply@〔mail.ドメイン〕>` |
   | `RESEND_API_KEY` | Resend の API キー |
   | `RATE_LIMIT_SALT` | 長いランダム文字列（`openssl rand -hex 32`） |
   | `REPORT_EMAIL` | 運営のメールアドレス |
   | `CRON_SECRET` | 長いランダム文字列（`openssl rand -hex 32`） |

3. **Domains** にドメインを追加し、DNS を設定する。
4. デプロイ後、**Settings → Cron Jobs** に `/api/cron/purge`（毎日 03:00 JST）が出ていることを確かめる（`vercel.json`）。

## 4. 公開前の確認

- [ ] 利用規約・プライバシーポリシー（`src/app/terms`・`src/app/privacy`）の〔 〕を埋め、専門家の確認を受けた
- [ ] 自分のメールアドレスでログインできる（確認コードのメールが届く）
- [ ] テスト用のタグを1つ発行し（下の 5.）、登録 → 別のスマホから連絡 → 通知メール → 返信 → 受け取り、まで通る
- [ ] 写真を送ると持ち主にだけ見え、位置情報が付いていない
- [ ] `https://〔ドメイン〕/api/cron/purge` を秘密の文字列なしで開くと 401 になる
- [ ] 通報が `REPORT_EMAIL` に届く

## 5. タグの発行

運営の端末で、本番の値を `.env.local` に入れてから:

```bash
npm run tags:issue -- --lot "〔学校・イベント名 2026春〕" --count 100 --base-url https://〔ドメイン〕
```

`issued/` に `id,url,lot` の CSV ができます。NFC の書き込みと QR の印刷は [試験配布の手順](./pilot.md) を参照。

## 運営の作業（Supabase の画面で行う）

- **通報**: `reports` テーブルで `status = 'new'` を確認し、対応したら `done` に。
- **タグを止める**: `tags` の `status` を `suspended` に（拾った人には「今は使えません」）。
- **問い合わせで退会を代行**: Authentication → Users から削除（持ち物・やり取りも消える。写真はストレージの `photos/<会話ID>/` を手で消す）。

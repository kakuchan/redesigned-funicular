# 持ち物タグ（NFC で持ち主に連絡が届くサービス）

持ち物に付けた NFC タグ（または QR）を拾った人がスマホで読むと、持ち主に連絡が届くサービスです。
お互いの連絡先は見せず、サーバーで中継します。仕様の正は Notion の設計書です（`.claude/decisions.md` にリンクがあります）。

## 必要なもの

- Node.js 22 以上
- Docker（ローカルの Supabase を動かすため）

## はじめかた

```bash
npm install
cp .env.example .env.local   # 値は下の手順で入れる
npm run db:start             # ローカルの Supabase を起動（初回はイメージの取得に時間がかかります）
npx supabase status          # API URL と公開キー（Publishable key）を .env.local に書く
npm run dev                  # http://localhost:3000
```

## よく使うコマンド

| コマンド | 内容 |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | ルートの型を生成してから TypeScript の型チェック |
| `npm test` | 単体テスト（Vitest） |
| `npm run test:e2e` | E2E（Playwright、スマホ表示）。初回は `npx playwright install chromium` |
| `npm run build` | 本番ビルド |
| `npm run test:db` | DB のテスト（pgTAP、ローカルの Supabase が必要） |
| `npm run db:types` | DB から TypeScript の型を作り直す |
| `npm run tags:issue -- --lot <ロット名> --count <数> --base-url <URL>` | タグ ID を発行して DB に登録し、`issued/` に CSV を出す（運営用。`SUPABASE_SECRET_KEY` が必要） |
| `npm run db:start` / `npm run db:stop` | ローカルの Supabase の起動・停止 |

## フォルダ

- `src/app/` 画面（App Router）
- `src/lib/supabase/` Supabase クライアント（ブラウザ用 `client.ts`、サーバー用 `server.ts`）
- `src/lib/env.ts` 公開してよい環境変数の読み込み
- `supabase/` ローカル設定とマイグレーション（`supabase/migrations/`）
- `scripts/` 運営用のスクリプト（タグ ID の発行）
- `e2e/` Playwright のテスト
- `.claude/` 開発の進め方（エージェント、コマンド、タスク、設計判断）

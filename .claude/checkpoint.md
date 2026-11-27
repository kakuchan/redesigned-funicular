# セッション引き継ぎ

`/checkpoint` で上書きされます。

- 日時: 2026-11-27（JST）
- ブランチ: `claude/project-thread-4tpw9r`
- やっていたこと: T-001（Next.js ＋ Supabase の雛形）
- 終わったこと: Next.js 16 の雛形、Supabase クライアント（ブラウザ／サーバー）、`.env.example`、Vitest・Playwright の設定とテスト、`supabase/` の初期設定
- 未コミットの変更: なし（PR でレビュー待ち）
- 次にやること: PR のマージ後に T-002（タグ・持ち物のテーブルと RLS）
- 確認待ち: PR のマージ
- 覚えておくこと: 仕様の正は Notion の設計書 v0.1。`npm run typecheck` は `next typegen` を先に走らせる（`LayoutProps` などの型が生成されるため）。

---
id: T-004
title: /t/[id] の振り分け
status: review
milestone: M1
depends: [T-002, T-003]
parallel: no
branch: claude/project-thread-4tpw9r
---

## 目的
タグを読んだ人が、タグの状態に応じた画面に着くようにする（設計書 §3-1・§3-2）。

## 完了条件
- [x] 形式が違う ID・存在しない ID は「見つかりません」
- [x] 未登録は「まだ登録されていません」と、持ち主向けの登録への入口（登録画面は M2）
- [x] 有効は拾った人用ページ（持ち物の名前・一言・紛失モードだけ。連絡ボタンは M3 で動かす）
- [x] 停止は「このタグは今は使えません」
- [x] 持ち主の情報を返さないこと・検索エンジンに載らないこと・外部へ URL を送らないこと
- [x] 単体テストと、スマホ表示の E2E（ローカル DB のテスト用データ）

## メモ・作業ログ
- 2026-11-27: 作成
- 2026-11-27: `src/app/t/[id]`（未登録／有効／停止／見つからない）、`src/lib/tags/public.ts`（RPC の結果を正しい型に直す）、登録画面の仮ページ `/register/[id]`。
  `/t/*` と `/register/*` に noindex と Referrer-Policy: no-referrer。`supabase/seed.sql` に E2E 用データ。
  単体テスト 7 件、E2E 7 件（ローカル Supabase がないときは飛ばす）が通ることを確認。PR でレビュー待ち。

---
id: T-002
title: タグ・持ち物のテーブルと RLS
status: done
milestone: M1
depends: [T-001]
parallel: yes
branch: claude/project-thread-4tpw9r
---

## 目的
`/t/[id]` の振り分け（未登録→登録画面、有効→拾った人用ページ）に必要なデータを用意する。

## 完了条件
- [x] タグ（ID、状態: 未登録/有効/停止、ロット、作成日）と持ち物（タグID、持ち主、名前、一言、紛失モード）のマイグレーション
- [x] RLS: 持ち物は持ち主だけが読み書きできる。拾った人用には「名前・一言・状態」だけを返す経路を用意する
- [x] 他人の持ち物を読めないことのテスト

## メモ・作業ログ
- 2026-11-27: 作成
- 2026-11-27: `supabase/migrations/20261127130000_tags_items.sql` を追加。tags / items、RLS、列単位の update 権限、拾った人用の `get_tag_public()`（security definer）。
  pgTAP のテスト 24 件（`supabase/tests/database/tags_items.test.sql`、`npm run test:db`）が通ることを確認。型は `npm run db:types` で生成。PR でレビュー待ち。

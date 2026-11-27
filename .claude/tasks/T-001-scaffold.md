---
id: T-001
title: Next.js ＋ Supabase の雛形を作る
status: done
milestone: M0
depends: []
parallel: no
branch: claude/project-thread-4tpw9r
---

## 目的
以後のタスクが同じ土台で進められるようにする。

## 完了条件
- [x] Next.js（App Router, TypeScript strict）のプロジェクトがある
- [x] `npm run lint` / `npm run typecheck` / `npm test`（Vitest）/ `npm run build` が通る
- [x] Playwright の設定があり、スマホ表示で空ページのE2Eが1本通る
- [x] `supabase/` がありローカルで `supabase start` できる
- [x] `.env.example` に必要な変数名だけを書く（値は書かない）。`.env*` は `.gitignore` 済み

## メモ・作業ログ
- 2026-11-27: 作成
- 2026-11-27: 雛形を作成。Next.js 16.4（App Router, TS strict, src/）、Vitest、Playwright（Pixel 7 表示）、Supabase CLI（devDependency、設定は `supabase/config.jsonc`）。
  lint / typecheck / test / build / E2E が通ることと、ローカルで `supabase start` が起動することを確認。PR でレビュー待ち。

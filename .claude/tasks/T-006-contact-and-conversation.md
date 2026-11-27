---
id: T-006
title: 拾った人からの連絡・メール通知・中継の会話
status: done
milestone: M3, M4
depends: [T-005]
parallel: no
branch: claude/project-thread-4tpw9r
---

## 目的
拾った人がアプリも登録もなしに持ち主へ知らせ、連絡先を見せ合わずにやり取りできるようにする（設計書 §3-2・§3-3）。

## 完了条件
- [x] 「どこにありますか」（必須）・ひとこと・位置情報（既定オフ）で知らせる
- [x] 持ち主にメールで通知（本文はメールに入れず、サイトで読む）
- [x] 拾った人は一時リンク（7日）で返事を読み、返信できる。同じタグを読み直すと戻れる
- [x] 持ち主は返信と「受け取った」（会話を閉じる）ができる
- [x] お互いの連絡先・持ち主の ID・位置の値を相手側に返さない
- [x] DB テスト・単体テスト・E2E

## メモ・作業ログ
- 2026-11-27: 実装。conversations / messages、finder_* 関数（service_role 専用）、owner_reply / owner_close_conversation、通知メール（Resend / Mailpit / ログ）。
  写真は M5 で位置情報の削除と一緒に入れる。

---
id: T-003
title: タグIDの発行スクリプト
status: review
milestone: M1
depends: [T-002]
parallel: yes
branch: claude/project-thread-4tpw9r
---

## 目的
運営がロット単位でタグIDを発行し、NFC書き込み用のURL一覧とQR印刷用データを出せるようにする。

## 完了条件
- [x] 暗号学的に安全な乱数で、推測できない長さのIDを指定数だけ発行してDBに登録する
- [x] ロット名を指定できる
- [x] URL一覧（CSV）を出力する。個人情報は含まない
- [x] IDの重複がないこと・形式のテスト

## メモ・作業ログ
- 2026-11-27: 作成
- 2026-11-27: `scripts/issue-tags.ts`（`npm run tags:issue`）を追加。ID は見間違えやすい文字を除いた 57 文字 × 16 桁（約 93 ビット）、`crypto.getRandomValues` と棄却法で偏りなし。
  DB 登録は service_role で upsert（重複は作り直し）。CSV は id,url,lot だけ。出力先は既定で `issued/`（git 対象外）、既存ファイルは上書きしない。
  単体テスト 20 件、ローカル DB で 1200 件の発行（重複 0）を確認。PR でレビュー待ち。

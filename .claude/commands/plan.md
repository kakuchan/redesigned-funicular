---
description: タスク計画。依頼された機能を architect と scheduler で設計・分解し、.claude/tasks/ にタスクファイルを作る。
argument-hint: <作りたい機能や課題>
---

# タスク計画

対象: $ARGUMENTS

1. **architect** エージェントに対象の設計を依頼する。設計書 v0.1（`.claude/decisions.md` の参照欄）と既存コードを踏まえ、推奨案・データの形・画面/API・プライバシーの確認・実装手順・テスト観点を出してもらう。
2. 設計の中で新しく決めたことがあれば、`.claude/decisions.md` に追記する。
3. **scheduler** エージェントに実装手順をタスクに分解してもらい、`.claude/tasks/` に1タスク1ファイルで作る（書式は `.claude/tasks/README.md`）。依存関係と、並列にできるかどうかを書く。
4. `.claude/progress.md` のマイルストーン表を更新する。
5. 最後に、作ったタスクの一覧（ID・タイトル・依存・並列可否）と、ユーザーに確認したいことを出す。

まだコードは書かないこと。

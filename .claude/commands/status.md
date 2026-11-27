---
description: 進捗確認。tasks/ の状態を集計して progress.md を更新し、要点を報告する。
---

# 進捗確認

**scheduler** エージェントに次を依頼してください。

1. `.claude/tasks/` の全タスクを読み、状態（todo / doing / review / done / blocked / later）ごとに数える。
2. マイルストーンごとの進み具合を出す。
3. `git log --since="7 days ago" --oneline` で直近の動きを確認する。
4. `.claude/progress.md` を更新する（最終更新日を JST で書く）。
5. 報告: 全体の進み具合、今週やったこと、次にやること、詰まっていること（原因と打ち手の案）。

$ARGUMENTS

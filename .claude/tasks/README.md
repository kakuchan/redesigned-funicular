# タスク管理

1タスク1ファイルで管理します。ファイル名は `T-<3桁の番号>-<短い名前>.md`（例: `T-001-tag-id.md`）。

## 書式

```markdown
---
id: T-001
title: タグIDの発行スクリプト
status: todo        # todo / doing / review / done / blocked / later
milestone: M1
depends: []         # 例: [T-001]
parallel: yes       # 他タスクと同時に進めてよいか
branch:             # 作業ブランチ（着手時に記入）
---

## 目的
なぜやるか（1〜2行）

## 完了条件
- [ ] 検証できる形で書く

## メモ・作業ログ
- 2026-11-27: 作成
```

## 状態の意味

- `todo`: 未着手 / `doing`: 作業中 / `review`: PR・レビュー待ち / `done`: 完了
- `blocked`: 何かを待っている（理由をメモに書く） / `later`: MVPの後に回す

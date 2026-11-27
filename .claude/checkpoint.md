# セッション引き継ぎ

`/checkpoint` で上書きされます。

- 日時: 2026-11-27（JST）
- ブランチ: `claude/project-thread-4tpw9r`
- やっていたこと: T-003（タグ ID の発行スクリプト）
- 終わったこと: `src/lib/tag-id.ts`・`src/lib/tag-issue.ts`・`scripts/issue-tags.ts`、単体テスト、ローカル DB での発行確認、D-007 の記録
- 未コミットの変更: なし（PR でレビュー待ち）
- 次にやること: PR のマージ後、`/t/[id]` の振り分けのタスクを作って着手（M1 の残り）
- 確認待ち: PR のマージ。本番ドメイン（タグに焼く前に必須）
- 覚えておくこと: package.json は `"type": "module"`（scripts/ を Node でそのまま実行するため）。`get_tag_public` の生成型は null を含まないが、未登録・停止中は null が返る。

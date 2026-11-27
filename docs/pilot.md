# 試験配布の手順（50〜100個）

設計書 §8「検証の仕方」の実施手順です。1つの学校かイベントで配り、登録率と戻った件数を測ります。

## 準備（2〜3週間前）

1. **タグを選ぶ**: NTAG213 相当のシール／キーホルダー。水筒・鍵など金属に付ける人向けに金属対応タグも用意する。iPhone・Android の手持ちの端末で読めるか先に試す。
2. **タグ ID を発行する**（本番のドメインで）
   ```bash
   npm run tags:issue -- --lot "〔〇〇小 2026春〕" --count 100 --base-url https://〔ドメイン〕
   ```
3. **NFC に書き込む**: CSV の `url` を、NDEF の URI レコード1件だけとして書き込む（NXP TagWriter などのアプリ、または書き込み機）。書き込んだら**ロック（書き換え禁止）**する。
4. **台紙・タグ表面の QR を作る**: 同じ `url` を QR にする。台紙には次を入れる。
   - 「スマホをかざすか QR を読んで登録してください」
   - タグ ID の末尾4文字（問い合わせのとき用）
   - 「お名前・学校名・クラスは書かないでください」
   - iPhone: 画面をつけてかざす／Android: NFC をオンにしてかざす
5. **1枚ずつ確かめる**: 書き込み後、ランダムに10枚ほどを iPhone・Android で読み、未登録の画面が開くことを確かめる。
6. **配布先への案内文**: 保護者向けに「何のためのタグか」「連絡先は相手に見えない」「やり取りは90日で消える」「規約・ポリシーの URL」を1枚にまとめる。

## 配布当日

- 配った数をロットごとに記録する（CSV の行数と同じか）。
- 余ったタグは回収し、ID を控える（あとで `tags` の `status` を `suspended` にするか、次のロットに回す）。

## 測るもの（Supabase の SQL エディタで実行）

```sql
-- ロットごとの登録率
select lot,
       count(*)                                        as 発行,
       count(*) filter (where status = 'active')       as 登録済み,
       round(100.0 * count(*) filter (where status = 'active') / count(*), 1) as 登録率
from public.tags
group by lot
order by lot;

-- ロットごとの連絡件数と、受け取りまで終わった件数
select t.lot,
       count(distinct c.id)                                 as 連絡,
       count(distinct c.id) filter (where c.status = 'closed') as 受け取り済み,
       count(distinct c.id) filter (where c.status = 'blocked') as ブロック
from public.tags t
join public.items i on i.tag_id = t.id
left join public.conversations c on c.item_id = i.id
group by t.lot
order by t.lot;

-- 通報の件数（未対応）
select count(*) from public.reports where status = 'new';
```

「かざされた回数」はアクセスログで数えます（Vercel の Analytics などで `/t/` へのアクセス数）。

## 振り返り（配布から1か月後）

- 登録率、連絡が届いた件数、戻った件数（受け取り済み）
- 利用者の声（保護者・学校・拾った人）
- 困ったこと（読めない端末、いたずら、問い合わせ）
- 次の判断: 料金、LINE 通知、子どもの迷子札（フェーズ2）に進むか

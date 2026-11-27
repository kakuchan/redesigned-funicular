-- M5: 回数制限・ブロック・通報・写真・自動削除
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'owner-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'owner-f@example.test');
insert into public.tags (id, status, lot) values ('SafeTagAbcdefghj', 'active', 'test');
insert into public.items (tag_id, owner_id, name) values
  ('SafeTagAbcdefghj', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '緑の帽子');

-- 回数制限
set local role anon;
select throws_ok($$ select public.rate_limit_hit('k', 1, 60) $$, '42501', null, 'anon は回数制限を操作できない');
reset role;
set local role service_role;
select is(public.rate_limit_hit('test:key', 2, 60), true, '1回目は通る');
select is(public.rate_limit_hit('test:key', 2, 60), true, '2回目は通る');
select is(public.rate_limit_hit('test:key', 2, 60), false, '上限を超えると止まる');
select is(public.rate_limit_hit('test:other', 2, 60), true, '別のキーは別に数える');

-- IP ハッシュ付きで連絡
select lives_ok(
  $$ select * from public.finder_start_conversation('SafeTagAbcdefghj', repeat('1', 64), 'holding', 'こんにちは', null, null, repeat('9', 64)) $$,
  'IP ハッシュ付きで連絡できる'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('SafeTagAbcdefghj', repeat('2', 64), 'holding', 'x', null, null, 'raw-ip-1.2.3.4') $$,
  '23514', null, '生の IP アドレスは保存できない'
);
reset role;

create temp table conv as
  select c.id from public.conversations c join public.items i on i.id = c.item_id
  where i.tag_id = 'SafeTagAbcdefghj';
grant select on conv to authenticated;

-- 他人はブロック・通報できない
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}', true);
select throws_ok($$ select public.owner_block_conversation((select id from conv)) $$, 'P0002', null, '他人の会話はブロックできない');
select throws_ok($$ select public.owner_report_conversation((select id from conv), 'x') $$, 'P0002', null, '他人の会話は通報できない');

-- 持ち主が通報・ブロック
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}', true);
select lives_ok($$ select public.owner_report_conversation((select id from conv), 'いたずらです') $$, '持ち主は通報できる');
select lives_ok($$ select public.owner_block_conversation((select id from conv)) $$, '持ち主はブロックできる');
select is((select status from public.conversations where id = (select id from conv)), 'blocked', 'ブロックした会話は閉じる');
select throws_ok($$ select * from public.reports $$, '42501', null, '持ち主は通報の一覧を読めない');
reset role;

set local role service_role;
select throws_ok(
  $$ select * from public.finder_start_conversation('SafeTagAbcdefghj', repeat('3', 64), 'holding', 'また', null, null, repeat('9', 64)) $$,
  'P0003', null, 'ブロックされた相手は同じ持ち物に連絡できない'
);
select lives_ok(
  $$ select * from public.finder_start_conversation('SafeTagAbcdefghj', repeat('4', 64), 'holding', '別の人', null, null, repeat('8', 64)) $$,
  '別の人は連絡できる'
);
select lives_ok(
  $$ select public.finder_report_conversation(repeat('4', 64), '持ち主の返信が不快です') $$,
  '拾った人も通報できる'
);
select is(
  (select count(*)::int from public.reports r
   join public.conversations c on c.id = r.conversation_id
   where r.reporter = 'finder' and c.finder_token_hash = repeat('4', 64)),
  1, '拾った人の通報が記録される'
);

-- 写真
select throws_ok(
  $$ select public.finder_attach_photo((select id from public.messages limit 1), '../../etc/passwd') $$,
  '23514', null, '決めた形以外の写真パスは保存できない'
);
reset role;

-- 自動削除
update public.conversations set closed_at = now() - interval '91 days', status = 'closed'
  where id = (select id from conv);
update public.messages set photo_path = (select id from conv)::text || '/' || id::text || '.jpg'
  where conversation_id = (select id from conv);
set local role service_role;
select is(
  (select count(*)::int from public.purge_expired_data()), 1,
  '90日を過ぎた会話の写真パスが返る'
);
reset role;
select is((select count(*)::int from public.conversations where id = (select id from conv)), 0, '90日を過ぎた会話は消える');

select * from finish();
rollback;

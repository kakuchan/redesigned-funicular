-- M3/M4: 拾った人からの連絡と中継の会話
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner-d@example.test');
insert into public.tags (id, status, lot) values
  ('ConvTagAbcdefghj', 'active', 'test'),
  ('ConvPausedTagAbc', 'active', 'test'),
  ('ConvNewTagAbcdef', 'unregistered', 'test');
insert into public.items (tag_id, owner_id, name, paused) values
  ('ConvTagAbcdefghj', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '青い水筒', false),
  ('ConvPausedTagAbc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '止めた傘', true);

-- 公開キー（anon）やログイン利用者からは拾った人用の関数を呼べない
set local role anon;
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvTagAbcdefghj', repeat('a', 64), 'holding', 'x') $$,
  '42501', null, 'anon は finder_start_conversation を呼べない'
);
select throws_ok(
  $$ select public.finder_get_conversation(repeat('a', 64)) $$,
  '42501', null, 'anon は finder_get_conversation を呼べない'
);
reset role;
set local role authenticated;
select throws_ok(
  $$ select * from public.finder_reply(repeat('a', 64), 'x') $$,
  '42501', null, 'authenticated は finder_reply を呼べない'
);
reset role;

-- サーバー（service_role）から最初の連絡
set local role service_role;
select results_eq(
  $$ select item_name, owner_id from public.finder_start_conversation(
       'ConvTagAbcdefghj', repeat('a', 64), 'handed_in', '  駅の窓口に届けました  ', 35.68, 139.76) $$,
  $$ values ('青い水筒'::text, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid) $$,
  '有効なタグに連絡でき、通知先の持ち主が分かる'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvPausedTagAbc', repeat('b', 64), 'holding', '') $$,
  'P0001', null, '一時停止中の持ち物には連絡できない'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvNewTagAbcdef', repeat('b', 64), 'holding', '') $$,
  'P0001', null, '未登録のタグには連絡できない'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvTagAbcdefghj', 'not-a-hash', 'holding', '') $$,
  '23514', null, 'トークンのハッシュの形が違えば入らない'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvTagAbcdefghj', repeat('c', 64), null, '   ') $$,
  '23514', null, '場所もメッセージもない連絡は入らない'
);
select throws_ok(
  $$ select * from public.finder_start_conversation('ConvTagAbcdefghj', repeat('c', 64), 'holding', 'x', 35.0, null) $$,
  '23514', null, '緯度だけ・経度だけは入らない'
);

select is(
  (public.finder_get_conversation(repeat('a', 64)) ->> 'item_name'), '青い水筒',
  'トークンで会話を読める'
);
select is(
  (public.finder_get_conversation(repeat('a', 64)) -> 'messages' -> 0 ->> 'body'), '駅の窓口に届けました',
  '本文は前後の空白を取って保存'
);
select ok(
  (public.finder_get_conversation(repeat('a', 64))::text) !~ '(owner_id|owner-c@|cccccccc|latitude|35\.68)',
  '拾った人への応答に持ち主の情報も位置の値も含まない'
);
select is(public.finder_get_conversation(repeat('f', 64)), null, '違うトークンでは読めない');

select lives_ok(
  $$ select * from public.finder_reply(repeat('a', 64), '17時まで窓口にあります') $$,
  '拾った人は返信できる'
);
reset role;

-- 持ち主 C
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select is((select count(*)::int from public.messages), 2, '持ち主は自分の会話のメッセージを読める');
select lives_ok(
  $$ select public.owner_reply((select id from public.conversations limit 1), 'ありがとうございます！') $$,
  '持ち主は返信できる'
);
reset role;

-- 持ち主 D は C の会話を読めず、返信も終了もできない
create temp table conv as
  select c.id from public.conversations c
  join public.items i on i.id = c.item_id
  where i.tag_id = 'ConvTagAbcdefghj';
grant select on conv to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
select is((select count(*)::int from public.conversations), 0, '他人の会話は見えない');
select throws_ok(
  $$ select public.owner_reply((select id from conv), 'のっとり') $$,
  'P0002', null, '他人の会話に返信できない'
);
select throws_ok(
  $$ select public.owner_close_conversation((select id from conv)) $$,
  'P0002', null, '他人の会話を閉じられない'
);

-- C が受け取り済みにする
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select lives_ok(
  $$ select public.owner_close_conversation((select id from conv)) $$,
  '持ち主は会話を閉じられる'
);
reset role;

set local role service_role;
select throws_ok(
  $$ select * from public.finder_reply(repeat('a', 64), 'まだですか') $$,
  'P0001', null, '閉じた会話には返信できない'
);
reset role;

-- 期限切れ
update public.conversations set status = 'open', expires_at = now() - interval '1 minute'
  where id = (select id from conv);
set local role service_role;
select throws_ok(
  $$ select * from public.finder_reply(repeat('a', 64), '期限後') $$,
  'P0001', null, '期限が切れた会話には返信できない'
);
reset role;

select * from finish();
rollback;

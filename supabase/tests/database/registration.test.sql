-- M2: タグの登録・一時停止・登録の解除のテスト
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.test');

insert into public.tags (id, status, lot) values
  ('RegNewTagAbcdefg', 'unregistered', 'test'),
  ('RegStopTagAbcdef', 'suspended', 'test');

-- 未ログインでは登録できない
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$ select public.register_tag('RegNewTagAbcdefg', '水筒') $$,
  '42501', null, '未ログインは register_tag を実行できない'
);
reset role;

-- A が登録する
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select lives_ok(
  $$ select public.register_tag('RegNewTagAbcdefg', '  青い水筒  ', ' よろしく ') $$,
  'A は未登録のタグを登録できる'
);
select results_eq(
  $$ select name, public_message, paused from public.items $$,
  $$ values ('青い水筒'::text, 'よろしく'::text, false) $$,
  '前後の空白は取って保存される'
);
select results_eq(
  $$ select status::text from public.tags where id = 'RegNewTagAbcdefg' $$,
  $$ values ('active'::text) $$,
  '登録したタグは有効になる'
);
select throws_ok(
  $$ select public.register_tag('RegNewTagAbcdefg', '二重') $$,
  'P0001', 'このタグは登録できません', '登録済みのタグは登録し直せない'
);
select throws_ok(
  $$ select public.register_tag('RegStopTagAbcdef', '停止') $$,
  'P0001', 'このタグは登録できません', '停止中のタグは登録できない'
);
select throws_ok(
  $$ select public.register_tag('RegNotExistTagAb', 'なし') $$,
  'P0002', 'タグが見つかりません', '存在しないタグは登録できない'
);
select throws_ok(
  $$ select public.register_tag('RegNewTagAbcdefg', '') $$,
  null, null, '名前が空なら登録できない'
);

-- 一時停止
update public.items set paused = true;
select results_eq(
  $$ select status::text, item_name from public.get_tag_public('RegNewTagAbcdefg') $$,
  $$ values ('suspended'::text, null::text) $$,
  '一時停止中は拾った人に停止と見え、名前は出ない'
);
update public.items set paused = false;
select results_eq(
  $$ select status::text, item_name from public.get_tag_public('RegNewTagAbcdefg') $$,
  $$ values ('active'::text, '青い水筒'::text) $$,
  '再開すると元に戻る'
);

-- B は A の持ち物を解除できない
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select throws_ok(
  $$ select public.release_tag((select id from public.items limit 1)) $$,
  'P0002', null, 'B は A の持ち物が見えず、解除もできない'
);
reset role;
select is(
  (select count(*)::int from public.items where tag_id = 'RegNewTagAbcdefg'), 1,
  'A の持ち物は残っている'
);
-- ID を知っている場合（postgres 権限で控えておく）
create temp table known_item as select id from public.items where tag_id = 'RegNewTagAbcdefg';
grant select on known_item to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select throws_ok(
  $$ select public.release_tag((select id from known_item)) $$,
  'P0002', null, 'B は A の持ち物の ID を知っていても解除できない'
);
reset role;

-- A が解除する
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select lives_ok(
  $$ select public.release_tag((select id from public.items where tag_id = 'RegNewTagAbcdefg')) $$,
  'A は自分の持ち物を解除できる'
);
reset role;
select results_eq(
  $$ select status::text from public.tags where id = 'RegNewTagAbcdefg' $$,
  $$ values ('unregistered'::text) $$,
  '解除したタグは未登録に戻る'
);
select is(
  (select count(*)::int from public.items where tag_id = 'RegNewTagAbcdefg'), 0,
  '持ち物は消える'
);

-- B が登録し直せる
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select lives_ok(
  $$ select public.register_tag('RegNewTagAbcdefg', '黒い傘') $$,
  '解除されたタグは登録し直せる'
);
reset role;

select * from finish();
rollback;

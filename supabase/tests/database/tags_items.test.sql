-- T-002: タグ・持ち物の RLS と拾った人用関数のテスト
-- 実行: npm run test:db（ローカルの Supabase が起動している必要があります）
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- ---------- 準備（postgres 権限で作る） ----------
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.test');

insert into public.tags (id, status, lot) values
  ('TagAaaaaaaaaaaaa', 'active', 'test-lot'),
  ('TagBbbbbbbbbbbbb', 'active', 'test-lot'),
  ('TagNewnnnnnnnnnn', 'unregistered', 'test-lot'),
  ('TagStopsssssssss', 'suspended', 'test-lot');

insert into public.items (tag_id, owner_id, name, public_message) values
  ('TagAaaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '青い水筒', '連絡お願いします'),
  ('TagBbbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '黒い傘', 'ありがとう'),
  ('TagStopsssssssss', '22222222-2222-2222-2222-222222222222', '赤い鍵', '止めています');

-- ---------- 制約 ----------
select throws_ok(
  $$ insert into public.tags (id, lot) values ('short', 'x') $$,
  '23514', null, 'タグ ID は短すぎると入らない'
);
select throws_ok(
  $$ insert into public.tags (id, lot) values ('has-symbol-aaaaaa', 'x') $$,
  '23514', null, 'タグ ID に記号は入らない'
);
select throws_ok(
  $$ insert into public.items (tag_id, owner_id, name)
     values ('TagAaaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '二重登録') $$,
  '23505', null, '1 つのタグに持ち物は 1 つだけ'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.tags'::regclass), true,
  'tags は RLS が有効'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.items'::regclass), true,
  'items は RLS が有効'
);

-- ---------- 持ち主 A としてログイン ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select results_eq(
  $$ select name from public.items $$,
  $$ values ('青い水筒'::text) $$,
  '持ち主 A は自分の持ち物だけが見える'
);
select results_eq(
  $$ select id from public.tags $$,
  $$ values ('TagAaaaaaaaaaaaa'::text) $$,
  '持ち主 A は自分のタグだけが見える'
);

update public.items set name = '乗っ取り' where tag_id = 'TagBbbbbbbbbbbbb';
select throws_ok(
  $$ delete from public.items where tag_id = 'TagBbbbbbbbbbbbb' $$,
  '42501', null, '持ち物を直接 delete できない（release_tag() を使う）'
);

update public.items set name = '青い水筒（大）', lost_mode = true
  where tag_id = 'TagAaaaaaaaaaaaa';
select results_eq(
  $$ select name, lost_mode from public.items $$,
  $$ values ('青い水筒（大）'::text, true) $$,
  '持ち主 A は自分の持ち物を直せる'
);

select throws_ok(
  $$ update public.items set owner_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, '持ち主は owner_id を書き換えられない'
);
select throws_ok(
  $$ update public.items set tag_id = 'TagNewnnnnnnnnnn' $$,
  '42501', null, '持ち主は tag_id を書き換えられない'
);
select throws_ok(
  $$ insert into public.items (tag_id, owner_id, name)
     values ('TagNewnnnnnnnnnn', '11111111-1111-1111-1111-111111111111', '勝手に登録') $$,
  '42501', null, '持ち物を直接 insert できない（登録は M2 の関数で行う）'
);
select throws_ok(
  $$ update public.tags set status = 'active' where id = 'TagNewnnnnnnnnnn' $$,
  '42501', null, '持ち主はタグの状態を変えられない'
);
select throws_ok(
  $$ insert into public.tags (id, lot) values ('TagEvileeeeeeeee', 'x') $$,
  '42501', null, '持ち主はタグを作れない'
);

-- ---------- 未ログイン（拾った人） ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select * from public.items $$,
  '42501', null, '拾った人は items を直接読めない'
);
select throws_ok(
  $$ select * from public.tags $$,
  '42501', null, '拾った人は tags を直接読めない'
);

select results_eq(
  $$ select status::text, item_name, public_message, lost_mode
     from public.get_tag_public('TagAaaaaaaaaaaaa') $$,
  $$ values ('active'::text, '青い水筒（大）'::text, '連絡お願いします'::text, true) $$,
  '有効なタグは名前・一言・紛失モードを返す'
);
select results_eq(
  $$ select status::text, item_name, public_message, lost_mode
     from public.get_tag_public('TagNewnnnnnnnnnn') $$,
  $$ values ('unregistered'::text, null::text, null::text, null::boolean) $$,
  '未登録のタグは状態だけを返す'
);
select results_eq(
  $$ select status::text, item_name, public_message, lost_mode
     from public.get_tag_public('TagStopsssssssss') $$,
  $$ values ('suspended'::text, null::text, null::text, null::boolean) $$,
  '停止中のタグは持ち物の情報を返さない'
);
select is_empty(
  $$ select * from public.get_tag_public('TagNotExistxxxxx') $$,
  '存在しない ID は 0 行'
);

-- 返す列に持ち主の情報が含まれないこと
select is(
  (select array_agg(a order by a) from unnest(
     (select proargnames from pg_proc where oid = 'public.get_tag_public(text)'::regprocedure)
   ) a),
  array['item_name', 'lost_mode', 'p_tag_id', 'public_message', 'status'],
  'get_tag_public の引数・戻り値は決めた列だけ'
);

-- ---------- 持ち主 B から見た A のデータ ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.items where tag_id = 'TagAaaaaaaaaaaaa'), 0,
  '持ち主 B は A の持ち物を読めない'
);

reset role;

-- A が B の持ち物を変えようとした結果（RLS で 0 行更新・0 行削除になっていること）
select results_eq(
  $$ select name from public.items where tag_id = 'TagBbbbbbbbbbbbb' $$,
  $$ values ('黒い傘'::text) $$,
  '他人の持ち物は書き換えられていない・消えていない'
);
select isnt(
  (select updated_at from public.items where tag_id = 'TagAaaaaaaaaaaaa'),
  null, 'updated_at が入っている'
);

-- ---------- 持ち主の退会 ----------
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.items where tag_id = 'TagAaaaaaaaaaaaa'), 0,
  '持ち主が消えると持ち物も消える（タグは残る）'
);

select * from finish();
rollback;

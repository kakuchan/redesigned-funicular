-- ローカル開発・E2E 用のデータ。`supabase db reset` で入る。本番には入らない。
-- ID は E2E（e2e/tag-page.spec.ts）と合わせてある。

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-00000000e2e0', 'e2e-owner@example.test')
on conflict (id) do nothing;

insert into public.tags (id, status, lot) values
  ('E2eActiveTagAbcd', 'active', 'e2e'),
  ('E2eLostModeTagAb', 'active', 'e2e'),
  ('E2eNewTagAbcdefg', 'unregistered', 'e2e'),
  ('E2eStoppedTagAbc', 'suspended', 'e2e')
on conflict (id) do nothing;

insert into public.items (tag_id, owner_id, name, public_message, lost_mode) values
  ('E2eActiveTagAbcd', '00000000-0000-4000-8000-00000000e2e0',
   '青い水筒', '〇〇小の子どもの水筒です。連絡お願いします', false),
  ('E2eLostModeTagAb', '00000000-0000-4000-8000-00000000e2e0',
   '<b>黒い傘</b>', '<script>window.__xss = 1</script>', true),
  ('E2eStoppedTagAbc', '00000000-0000-4000-8000-00000000e2e0',
   '赤い鍵', '見えてはいけない', false)
on conflict (tag_id) do nothing;

-- T-002: タグと持ち物のテーブル、RLS、拾った人用の読み取り関数
--
-- 方針
-- - タグ ID は推測できないランダム文字列（発行は T-003）。連番にしない。
-- - 持ち物は持ち主だけが読み書きできる。
-- - 拾った人（未ログイン）はテーブルを直接読めない。get_tag_public() だけが
--   「状態・持ち物の名前・一言・紛失モード」を返す。持ち主の情報は返さない。

-- タグの状態: 未登録 / 有効 / 停止
create type public.tag_status as enum ('unregistered', 'active', 'suspended');

create table public.tags (
  id text primary key
    constraint tags_id_format check (id ~ '^[0-9A-Za-z]{12,32}$'),
  status public.tag_status not null default 'unregistered',
  -- どの学校・イベント向けに発行したか
  lot text not null
    constraint tags_lot_length check (char_length(lot) between 1 and 100),
  created_at timestamptz not null default now()
);

comment on table public.tags is 'NFC タグ。中身はランダム ID の URL だけで、個人情報は持たない。';

create table public.items (
  id uuid primary key default gen_random_uuid(),
  tag_id text not null unique references public.tags (id) on delete restrict,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 例: 青い水筒
  name text not null
    constraint items_name_length check (char_length(name) between 1 and 50),
  -- 拾った人に見せる一言
  public_message text not null default ''
    constraint items_public_message_length check (char_length(public_message) <= 200),
  lost_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.items is '持ち物。持ち主だけが読み書きできる。';
create index items_owner_id_idx on public.items (owner_id);

-- updated_at を自動で更新する
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 権限と RLS
-- ---------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.items enable row level security;

-- 既定の権限をいったん外し、必要なものだけを付け直す
revoke all on public.tags from anon, authenticated;
revoke all on public.items from anon, authenticated;

-- タグ: 持ち主は自分の持ち物に付いたタグだけを読める。書き込みは運営（service_role）のみ。
grant select on public.tags to authenticated;

create policy "持ち主は自分のタグを読める"
  on public.tags for select
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.tag_id = tags.id
        and i.owner_id = (select auth.uid())
    )
  );

-- 持ち物: 持ち主だけが読む・直す・消す。
-- 登録（タグと持ち物の結び付け）は M2 で関数として用意するため、ここでは insert を許可しない。
grant select, delete on public.items to authenticated;
-- tag_id と owner_id は書き換えさせない
grant update (name, public_message, lost_mode) on public.items to authenticated;

create policy "持ち主は自分の持ち物を読める"
  on public.items for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "持ち主は自分の持ち物を直せる"
  on public.items for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "持ち主は自分の持ち物を消せる"
  on public.items for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------
-- 拾った人用: /t/[id] の振り分けに使う
-- ---------------------------------------------------------------
-- 返すもの
-- - 存在しない ID: 0 行
-- - 未登録: status = 'unregistered'、ほかは null
-- - 停止: status = 'suspended'、ほかは null（「このタグは使えません」と出すため）
-- - 有効: status = 'active' と、持ち物の名前・一言・紛失モード
-- 持ち主の ID・メールなどは返さない。

create function public.get_tag_public(p_tag_id text)
returns table (
  status public.tag_status,
  item_name text,
  public_message text,
  lost_mode boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.status,
    case when t.status = 'active' then i.name end,
    case when t.status = 'active' then i.public_message end,
    case when t.status = 'active' then i.lost_mode end
  from public.tags t
  left join public.items i on i.tag_id = t.id
  where t.id = p_tag_id;
$$;

revoke all on function public.get_tag_public(text) from public;
grant execute on function public.get_tag_public(text) to anon, authenticated;

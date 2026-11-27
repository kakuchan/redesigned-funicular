-- M2: 持ち主の登録・持ち物の一時停止・登録の解除

-- 持ち主による一時停止（運営による停止 tags.status = 'suspended' とは別）
alter table public.items add column paused boolean not null default false;

-- 持ち主が直せる列に paused を足す。削除は release_tag() 経由だけにする。
revoke delete on public.items from authenticated;
drop policy "持ち主は自分の持ち物を消せる" on public.items;
grant update (paused) on public.items to authenticated;

-- ---------------------------------------------------------------
-- タグの登録: 未登録のタグに持ち物を結び付け、タグを有効にする
-- ---------------------------------------------------------------
create function public.register_tag(
  p_tag_id text,
  p_name text,
  p_public_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_status public.tag_status;
  v_item_id uuid;
begin
  if v_owner is null then
    raise exception 'ログインが必要です' using errcode = '42501';
  end if;

  -- 同時に2人が登録しないよう、タグの行をロックする
  select status into v_status
  from public.tags
  where id = p_tag_id
  for update;

  if not found then
    raise exception 'タグが見つかりません' using errcode = 'P0002';
  end if;
  if v_status <> 'unregistered' then
    raise exception 'このタグは登録できません' using errcode = 'P0001';
  end if;

  insert into public.items (tag_id, owner_id, name, public_message)
  values (p_tag_id, v_owner, btrim(p_name), btrim(coalesce(p_public_message, '')))
  returning id into v_item_id;

  update public.tags set status = 'active' where id = p_tag_id;

  return v_item_id;
end;
$$;

revoke all on function public.register_tag(text, text, text) from public, anon;
grant execute on function public.register_tag(text, text, text) to authenticated;

-- ---------------------------------------------------------------
-- 登録の解除: 持ち物を消し、タグを未登録に戻す（同じタグを登録し直せる）
-- ---------------------------------------------------------------
create function public.release_tag(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag_id text;
begin
  delete from public.items
  where id = p_item_id
    and owner_id = auth.uid()
  returning tag_id into v_tag_id;

  if v_tag_id is null then
    raise exception '持ち物が見つかりません' using errcode = 'P0002';
  end if;

  -- 運営が止めたタグは止めたままにする
  update public.tags
  set status = 'unregistered'
  where id = v_tag_id
    and status = 'active';
end;
$$;

revoke all on function public.release_tag(uuid) from public, anon;
grant execute on function public.release_tag(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 拾った人用: 持ち主が一時停止中なら「停止」として返す
-- ---------------------------------------------------------------
create or replace function public.get_tag_public(p_tag_id text)
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
    case
      when t.status = 'active' and coalesce(i.paused, false) then 'suspended'::public.tag_status
      else t.status
    end,
    case when t.status = 'active' and not coalesce(i.paused, false) then i.name end,
    case when t.status = 'active' and not coalesce(i.paused, false) then i.public_message end,
    case when t.status = 'active' and not coalesce(i.paused, false) then i.lost_mode end
  from public.tags t
  left join public.items i on i.tag_id = t.id
  where t.id = p_tag_id;
$$;

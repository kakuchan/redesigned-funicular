-- M5: 回数制限・ブロック・通報・写真・記録の自動削除
--
-- - 拾った人の IP アドレスは、秘密の塩を付けたハッシュだけを保存する（生の値は保存しない）。
--   回数制限の記録は1日、会話に付けたハッシュは7日で消す（purge_expired_data）。
-- - 写真は非公開のバケット photos に保存し、service_role だけが読み書きする。

-- ---------------------------------------------------------------
-- 回数制限
-- ---------------------------------------------------------------
create table public.rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_events_key_idx on public.rate_events (key, created_at);
alter table public.rate_events enable row level security;
revoke all on public.rate_events from anon, authenticated;

-- 記録して、窓の中で上限を超えていれば false を返す
create function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  -- 同じキーへの同時アクセスで数え漏れないようにする
  perform pg_advisory_xact_lock(hashtext(p_key));
  select count(*) into v_count
  from public.rate_events
  where key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.rate_events (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ---------------------------------------------------------------
-- ブロック（持ち主が、ある会話の相手からの連絡を止める）
-- ---------------------------------------------------------------
alter table public.conversations
  add column finder_ip_hash text
    constraint conversations_ip_hash_format check (finder_ip_hash ~ '^[0-9a-f]{64}$');

alter table public.conversations drop constraint conversations_status;
alter table public.conversations
  add constraint conversations_status check (status in ('open', 'closed', 'blocked'));

create table public.blocked_senders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  ip_hash text not null,
  until timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  unique (item_id, ip_hash)
);
alter table public.blocked_senders enable row level security;
revoke all on public.blocked_senders from anon, authenticated;

create function public.owner_block_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  select c.* into v_conversation
  from public.conversations c
  join public.items i on i.id = c.item_id
  where c.id = p_conversation_id
    and i.owner_id = auth.uid()
  for update of c;

  if not found then
    raise exception '会話が見つかりません' using errcode = 'P0002';
  end if;

  update public.conversations
  set status = 'blocked', closed_at = coalesce(closed_at, now())
  where id = p_conversation_id;

  if v_conversation.finder_ip_hash is not null then
    insert into public.blocked_senders (item_id, ip_hash)
    values (v_conversation.item_id, v_conversation.finder_ip_hash)
    on conflict (item_id, ip_hash) do update set until = now() + interval '30 days';
  end if;
end;
$$;

revoke all on function public.owner_block_conversation(uuid) from public, anon;
grant execute on function public.owner_block_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 通報
-- ---------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete set null,
  reporter text not null constraint reports_reporter check (reporter in ('owner', 'finder')),
  reason text not null constraint reports_reason_length check (char_length(reason) between 1 and 1000),
  status text not null default 'new' constraint reports_status check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create function public.owner_report_conversation(p_conversation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations c
    join public.items i on i.id = c.item_id
    where c.id = p_conversation_id and i.owner_id = auth.uid()
  ) then
    raise exception '会話が見つかりません' using errcode = 'P0002';
  end if;
  insert into public.reports (conversation_id, reporter, reason)
  values (p_conversation_id, 'owner', btrim(p_reason));
end;
$$;

revoke all on function public.owner_report_conversation(uuid, text) from public, anon;
grant execute on function public.owner_report_conversation(uuid, text) to authenticated;

create function public.finder_report_conversation(p_token_hash text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.conversations where finder_token_hash = p_token_hash;
  if v_id is null then
    raise exception '会話が見つかりません' using errcode = 'P0002';
  end if;
  insert into public.reports (conversation_id, reporter, reason)
  values (v_id, 'finder', btrim(p_reason));
end;
$$;

revoke all on function public.finder_report_conversation(text, text) from public, anon, authenticated;
grant execute on function public.finder_report_conversation(text, text) to service_role;

-- ---------------------------------------------------------------
-- 写真
-- ---------------------------------------------------------------
alter table public.messages add column photo_path text
  constraint messages_photo_path_format check (photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');

alter table public.messages drop constraint messages_not_empty;
alter table public.messages add constraint messages_not_empty
  check (char_length(btrim(body)) > 0 or item_location is not null or photo_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- 拾った人用の関数を作り直す（IP ハッシュ・ブロック・写真）
-- ---------------------------------------------------------------
drop function public.finder_start_conversation(text, text, text, text, double precision, double precision);

create function public.finder_start_conversation(
  p_tag_id text,
  p_token_hash text,
  p_item_location text,
  p_body text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_ip_hash text default null
)
returns table (conversation_id uuid, message_id uuid, item_id uuid, item_name text, owner_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items;
  v_conversation_id uuid;
  v_message_id uuid;
begin
  select i.* into v_item
  from public.tags t
  join public.items i on i.tag_id = t.id
  where t.id = p_tag_id
    and t.status = 'active'
    and not i.paused;

  if not found then
    raise exception 'このタグには今は連絡できません' using errcode = 'P0001';
  end if;

  if p_ip_hash is not null and exists (
    select 1 from public.blocked_senders b
    where b.item_id = v_item.id and b.ip_hash = p_ip_hash and b.until > now()
  ) then
    raise exception 'このタグには今は連絡できません' using errcode = 'P0003';
  end if;

  insert into public.conversations (item_id, finder_token_hash, finder_ip_hash)
  values (v_item.id, p_token_hash, p_ip_hash)
  returning id into v_conversation_id;

  insert into public.messages (conversation_id, sender, body, item_location, latitude, longitude)
  values (v_conversation_id, 'finder', btrim(coalesce(p_body, '')), p_item_location, p_latitude, p_longitude)
  returning id into v_message_id;

  return query select v_conversation_id, v_message_id, v_item.id, v_item.name, v_item.owner_id;
end;
$$;

revoke all on function public.finder_start_conversation(text, text, text, text, double precision, double precision, text) from public, anon, authenticated;
grant execute on function public.finder_start_conversation(text, text, text, text, double precision, double precision, text) to service_role;

-- 写真を付ける（保存に成功してから呼ぶ）
create function public.finder_attach_photo(p_message_id uuid, p_photo_path text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages set photo_path = p_photo_path
  where id = p_message_id and sender = 'finder' and photo_path is null;
$$;

revoke all on function public.finder_attach_photo(uuid, text) from public, anon, authenticated;
grant execute on function public.finder_attach_photo(uuid, text) to service_role;

-- 閲覧用: 写真の有無も返す（パスは返さない）
create or replace function public.finder_get_conversation(p_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'item_name', i.name,
    'status', c.status,
    'expires_at', c.expires_at,
    'active', public.conversation_is_active(c),
    'messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'sender', m.sender,
          'body', m.body,
          'item_location', m.item_location,
          'has_location', m.latitude is not null,
          'has_photo', m.photo_path is not null,
          'created_at', m.created_at
        ) order by m.created_at
      )
      from public.messages m
      where m.conversation_id = c.id
    ), '[]'::jsonb)
  )
  from public.conversations c
  join public.items i on i.id = c.item_id
  where c.finder_token_hash = p_token_hash;
$$;

-- ---------------------------------------------------------------
-- 記録の自動削除（毎日 /api/cron/purge から呼ぶ）
-- ---------------------------------------------------------------
-- 終わってから90日たった会話を消し、消した会話の写真のパスを返す（ストレージ側はアプリが消す）
create function public.purge_expired_data()
returns table (photo_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rate_events where created_at < now() - interval '1 day';
  update public.conversations set finder_ip_hash = null
    where finder_ip_hash is not null and created_at < now() - interval '7 days';
  delete from public.blocked_senders where until < now();

  create temp table if not exists purge_ids (id uuid) on commit drop;
  insert into purge_ids
    select c.id from public.conversations c
    where coalesce(c.closed_at, c.expires_at) < now() - interval '90 days';

  return query
    select m.photo_path from public.messages m
    where m.conversation_id in (select id from purge_ids)
      and m.photo_path is not null;

  delete from public.conversations where id in (select id from purge_ids);
end;
$$;

revoke all on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;

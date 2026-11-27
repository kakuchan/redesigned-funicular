-- M3/M4: 拾った人からの連絡と、中継の会話
--
-- 方針
-- - 拾った人は登録もログインもしない。送信時に発行する一時トークン（URL に入れる）で会話を開く。
--   DB にはトークンの SHA-256 だけを保存する。
-- - 拾った人側の操作は、サーバー（service_role）からだけ呼べる関数で行う。
--   ブラウザから公開キーで直接呼べないので、回数制限などをサーバーで必ず通せる。
-- - 持ち主は RLS で自分の持ち物の会話だけを読める。返信・終了は関数で行う。
-- - お互いの連絡先は DB の会話データに一切含めない。

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  finder_token_hash text not null unique
    constraint conversations_token_hash_format check (finder_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'open'
    constraint conversations_status check (status in ('open', 'closed')),
  -- 拾った人の一時リンクの期限
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  last_message_at timestamptz not null default now()
);

create index conversations_item_id_idx on public.conversations (item_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null
    constraint messages_sender check (sender in ('finder', 'owner')),
  body text not null default ''
    constraint messages_body_length check (char_length(body) <= 1000),
  -- 最初の連絡で拾った人が選ぶ「どこにありますか」
  item_location text
    constraint messages_item_location check (item_location in ('holding', 'handed_in', 'left_there')),
  latitude double precision
    constraint messages_latitude check (latitude between -90 and 90),
  longitude double precision
    constraint messages_longitude check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  constraint messages_lat_lng_pair check ((latitude is null) = (longitude is null)),
  constraint messages_not_empty check (char_length(btrim(body)) > 0 or item_location is not null)
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;

create policy "持ち主は自分の持ち物の会話を読める"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = conversations.item_id
        and i.owner_id = (select auth.uid())
    )
  );

create policy "持ち主は自分の持ち物の会話のメッセージを読める"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.items i on i.id = c.item_id
      where c.id = messages.conversation_id
        and i.owner_id = (select auth.uid())
    )
  );

-- 会話が「開いていて期限内」か
create function public.conversation_is_active(c public.conversations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select c.status = 'open' and c.expires_at > now();
$$;

-- ---------------------------------------------------------------
-- 拾った人側（service_role 専用）
-- ---------------------------------------------------------------

-- 最初の連絡。タグが有効（持ち主の一時停止もなし）のときだけ。
-- 戻り値の owner_id は通知メールの宛先を調べるためにサーバーだけが使う。
create function public.finder_start_conversation(
  p_tag_id text,
  p_token_hash text,
  p_item_location text,
  p_body text,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns table (conversation_id uuid, item_id uuid, item_name text, owner_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items;
  v_conversation_id uuid;
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

  insert into public.conversations (item_id, finder_token_hash)
  values (v_item.id, p_token_hash)
  returning id into v_conversation_id;

  insert into public.messages (conversation_id, sender, body, item_location, latitude, longitude)
  values (v_conversation_id, 'finder', btrim(coalesce(p_body, '')), p_item_location, p_latitude, p_longitude);

  return query select v_conversation_id, v_item.id, v_item.name, v_item.owner_id;
end;
$$;

-- トークンから会話を読む。持ち主の情報は返さない。
create function public.finder_get_conversation(p_token_hash text)
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

-- 拾った人の返信。戻り値は通知のためにサーバーだけが使う。
create function public.finder_reply(p_token_hash text, p_body text)
returns table (conversation_id uuid, item_id uuid, item_name text, owner_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
  v_item public.items;
begin
  select * into v_conversation
  from public.conversations
  where finder_token_hash = p_token_hash
  for update;

  if not found or not public.conversation_is_active(v_conversation) then
    raise exception 'このやり取りは終わっています' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'メッセージを入れてください' using errcode = '22023';
  end if;

  insert into public.messages (conversation_id, sender, body)
  values (v_conversation.id, 'finder', btrim(p_body));
  update public.conversations set last_message_at = now() where id = v_conversation.id;

  select * into v_item from public.items where id = v_conversation.item_id;
  return query select v_conversation.id, v_item.id, v_item.name, v_item.owner_id;
end;
$$;

revoke all on function public.finder_start_conversation(text, text, text, text, double precision, double precision) from public, anon, authenticated;
revoke all on function public.finder_get_conversation(text) from public, anon, authenticated;
revoke all on function public.finder_reply(text, text) from public, anon, authenticated;
grant execute on function public.finder_start_conversation(text, text, text, text, double precision, double precision) to service_role;
grant execute on function public.finder_get_conversation(text) to service_role;
grant execute on function public.finder_reply(text, text) to service_role;

-- ---------------------------------------------------------------
-- 持ち主側（ログイン中の持ち主）
-- ---------------------------------------------------------------

create function public.owner_reply(p_conversation_id uuid, p_body text)
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
  if not public.conversation_is_active(v_conversation) then
    raise exception 'このやり取りは終わっています' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'メッセージを入れてください' using errcode = '22023';
  end if;

  insert into public.messages (conversation_id, sender, body)
  values (p_conversation_id, 'owner', btrim(p_body));
  update public.conversations set last_message_at = now() where id = p_conversation_id;
end;
$$;

-- 「受け取った」: 会話を閉じる
create function public.owner_close_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations c
  set status = 'closed', closed_at = now()
  from public.items i
  where c.id = p_conversation_id
    and i.id = c.item_id
    and i.owner_id = auth.uid()
    and c.status = 'open';

  if not found then
    raise exception '会話が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.owner_reply(uuid, text) from public, anon;
revoke all on function public.owner_close_conversation(uuid) from public, anon;
grant execute on function public.owner_reply(uuid, text) to authenticated;
grant execute on function public.owner_close_conversation(uuid) to authenticated;

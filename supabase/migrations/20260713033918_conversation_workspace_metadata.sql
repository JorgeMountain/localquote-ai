+
alter table public.conversations
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists last_read_at timestamptz,
  add column if not exists internal_notes text not null default '',
  add column if not exists tags text[] not null default '{}';

update public.conversations
set last_message_at = coalesce(
  (
    select max(messages.created_at)
    from public.messages
    where messages.conversation_id = conversations.id
  ),
  conversations.created_at
)
where last_message_at is null or last_message_at = conversations.created_at;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_internal_notes_length'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_internal_notes_length
      check (char_length(internal_notes) <= 2000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_tags_count'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_tags_count
      check (cardinality(tags) <= 10);
  end if;
end
$$;

create index if not exists conversations_business_last_message_idx
  on public.conversations(business_id, last_message_at desc);

create index if not exists conversations_tags_idx
  on public.conversations using gin(tags);

revoke update on public.conversations from authenticated;
grant update (last_read_at, internal_notes, tags) on public.conversations to authenticated;

drop policy if exists "conversations_authorized_update" on public.conversations;
create policy "conversations_authorized_update"
on public.conversations for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1
    from public.businesses
    where businesses.id = conversations.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1
    from public.businesses
    where businesses.id = conversations.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

revoke insert, update, delete on public.messages from authenticated;
grant insert on public.messages to authenticated;

drop policy if exists "messages_public_insert" on public.messages;
drop policy if exists "messages_authorized_insert" on public.messages;
create policy "messages_authorized_insert"
on public.messages for insert to authenticated
with check (
  role = 'assistant'
  and exists (
    select 1
    from public.conversations
    join public.businesses on businesses.id = conversations.business_id
    where conversations.id = messages.conversation_id
      and (
        (select private.current_profile_role()) = 'platform_admin'
        or businesses.owner_id = (select auth.uid())
      )
  )
);

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

revoke all on function public.touch_conversation_last_message() from public, anon, authenticated;

drop trigger if exists messages_touch_conversation_last_message on public.messages;
create trigger messages_touch_conversation_last_message
after insert on public.messages
for each row execute function public.touch_conversation_last_message();

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(14, 8) not null default 0,
  latency_ms integer,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint ai_generations_provider_length check (char_length(provider) between 1 and 64),
  constraint ai_generations_model_length check (char_length(model) between 1 and 160),
  constraint ai_generations_input_tokens_nonnegative check (input_tokens is null or input_tokens >= 0),
  constraint ai_generations_output_tokens_nonnegative check (output_tokens is null or output_tokens >= 0),
  constraint ai_generations_estimated_cost_nonnegative check (estimated_cost >= 0),
  constraint ai_generations_latency_nonnegative check (latency_ms is null or latency_ms >= 0),
  constraint ai_generations_status_valid check (status in ('success', 'fallback', 'failed')),
  constraint ai_generations_error_message_length check (error_message is null or char_length(error_message) <= 1000)
);

alter table public.ai_generations enable row level security;
revoke all on public.ai_generations from anon, authenticated;
grant select on public.ai_generations to authenticated;
grant all on public.ai_generations to service_role;

drop policy if exists "ai_generations_authorized_select" on public.ai_generations;
create policy "ai_generations_authorized_select"
on public.ai_generations for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1
    from public.businesses
    where businesses.id = ai_generations.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create index if not exists ai_generations_business_created_idx
  on public.ai_generations(business_id, created_at desc);

create or replace function public.record_internal_ai_generation(
  p_token text,
  p_business_id uuid,
  p_conversation_id uuid,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost numeric,
  p_latency_ms integer,
  p_status text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.businesses
    where id = p_business_id
  ) then
    raise exception 'Business not found' using errcode = '22023';
  end if;

  if p_conversation_id is not null and not exists (
    select 1
    from public.conversations
    where id = p_conversation_id
      and business_id = p_business_id
  ) then
    raise exception 'Invalid conversation for business' using errcode = '22023';
  end if;

  insert into public.ai_generations (
    business_id,
    conversation_id,
    provider,
    model,
    input_tokens,
    output_tokens,
    estimated_cost,
    latency_ms,
    status,
    error_message
  )
  values (
    p_business_id,
    p_conversation_id,
    left(trim(p_provider), 64),
    left(trim(p_model), 160),
    greatest(p_input_tokens, 0),
    greatest(p_output_tokens, 0),
    greatest(coalesce(p_estimated_cost, 0), 0),
    greatest(p_latency_ms, 0),
    p_status,
    nullif(left(trim(coalesce(p_error_message, '')), 1000), '')
  );
end;
$$;

revoke all on function public.record_internal_ai_generation(
  text, uuid, uuid, text, text, integer, integer, numeric, integer, text, text
) from public, anon, authenticated;

grant execute on function public.record_internal_ai_generation(
  text, uuid, uuid, text, text, integer, integer, numeric, integer, text, text
) to anon;


alter table businesses
  add column if not exists whatsapp_phone_number_id text;

alter table appointment_requests
  add column if not exists conversation_id uuid references conversations(id) on delete cascade;

alter table quotes
  add column if not exists conversation_id uuid references conversations(id) on delete cascade;

update appointment_requests
set conversation_id = (
  select conversations.id
  from conversations
  where conversations.business_id = appointment_requests.business_id
    and conversations.customer_id = appointment_requests.customer_id
  order by conversations.created_at desc
  limit 1
)
where conversation_id is null;

update quotes
set conversation_id = (
  select conversations.id
  from conversations
  where conversations.business_id = quotes.business_id
    and conversations.customer_id = quotes.customer_id
  order by conversations.created_at desc
  limit 1
)
where conversation_id is null;

create unique index if not exists businesses_whatsapp_phone_number_id_idx
  on businesses(whatsapp_phone_number_id)
  where whatsapp_phone_number_id is not null;

create index if not exists customers_business_phone_idx
  on customers(business_id, phone);

create unique index if not exists customers_business_id_id_idx
  on customers(business_id, id);

create unique index if not exists conversations_business_customer_channel_idx
  on conversations(business_id, customer_id, channel);

create unique index if not exists conversations_business_id_id_idx
  on conversations(business_id, id);

create unique index if not exists appointment_requests_active_slot_idx
  on appointment_requests(business_id, preferred_date, preferred_time)
  where status in ('pending', 'confirmed');

create unique index if not exists appointment_requests_conversation_active_idx
  on appointment_requests(conversation_id)
  where conversation_id is not null and status in ('pending', 'confirmed');

create unique index if not exists quotes_conversation_idx
  on quotes(conversation_id)
  where conversation_id is not null;

create index if not exists appointment_requests_conversation_id_idx
  on appointment_requests(conversation_id);

create index if not exists quotes_conversation_id_idx
  on quotes(conversation_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_business_customer_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table conversations
      add constraint conversations_business_customer_fkey
      foreign key (business_id, customer_id)
      references customers(business_id, id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_requests_business_customer_fkey'
      and conrelid = 'public.appointment_requests'::regclass
  ) then
    alter table appointment_requests
      add constraint appointment_requests_business_customer_fkey
      foreign key (business_id, customer_id)
      references customers(business_id, id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_business_customer_fkey'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table quotes
      add constraint quotes_business_customer_fkey
      foreign key (business_id, customer_id)
      references customers(business_id, id)
      on delete cascade;
  end if;
end
$$;

revoke insert on customers, conversations, messages, appointment_requests, quotes from anon;
revoke select on businesses, business_hours, availability_slots, appointment_requests from anon;
revoke all on business_links from anon;

grant select (id, name, slug, type, description, services, hours, location, phone, created_at)
  on businesses to anon;

grant select (id, business_id, label, url, purpose, is_active, created_at)
  on business_links to anon;

drop policy if exists "customers_public_insert" on customers;
drop policy if exists "conversations_public_insert" on conversations;
drop policy if exists "messages_public_insert" on messages;
drop policy if exists "appointment_requests_public_insert" on appointment_requests;
drop policy if exists "quotes_public_insert" on quotes;
drop policy if exists "appointment_requests_public_schedule_select" on appointment_requests;
drop policy if exists "business_hours_public_select" on business_hours;
drop policy if exists "availability_slots_public_select" on availability_slots;

create policy "business_hours_authenticated_select"
on business_hours for select to authenticated
using (
  private.current_profile_role() = 'platform_admin'
  or exists (
    select 1
    from businesses
    where businesses.id = business_hours.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_authenticated_select"
on availability_slots for select to authenticated
using (
  private.current_profile_role() = 'platform_admin'
  or exists (
    select 1
    from businesses
    where businesses.id = availability_slots.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create table if not exists private.app_secrets (
  key text primary key,
  value_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.request_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists private.whatsapp_inbound_events (
  event_id text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  status text not null check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_inbound_events_business_id_idx
  on private.whatsapp_inbound_events(business_id);

revoke all on private.app_secrets, private.request_rate_limits, private.whatsapp_inbound_events
  from public, anon, authenticated;

create or replace function private.internal_token_valid(p_token text)
returns boolean
language sql
stable
security definer
set search_path = private, public, extensions
as $$
  select p_token is not null
    and char_length(p_token) >= 24
    and exists (
      select 1
      from private.app_secrets
      where key = 'internal_api_token'
        and value_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    );
$$;

revoke all on function private.internal_token_valid(text) from public, anon, authenticated;

create or replace function public.get_chat_context(
  p_token text,
  p_slug text default null,
  p_phone_number_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_business businesses%rowtype;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  select businesses.*
  into target_business
  from businesses
  where (
    p_phone_number_id is not null
    and businesses.whatsapp_phone_number_id = p_phone_number_id
  ) or (
    p_slug is not null
    and businesses.slug = p_slug
  )
  order by
    case
      when p_phone_number_id is not null
        and businesses.whatsapp_phone_number_id = p_phone_number_id then 0
      else 1
    end
  limit 1;

  if target_business.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'business', jsonb_build_object(
      'id', target_business.id,
      'owner_id', target_business.owner_id,
      'name', target_business.name,
      'slug', target_business.slug,
      'type', target_business.type,
      'description', target_business.description,
      'services', target_business.services,
      'hours', target_business.hours,
      'location', target_business.location,
      'phone', target_business.phone,
      'rules', target_business.rules,
      'whatsapp_phone_number_id', target_business.whatsapp_phone_number_id
    ),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', business_faqs.id,
        'business_id', business_faqs.business_id,
        'question', business_faqs.question,
        'answer', business_faqs.answer,
        'category', business_faqs.category
      ) order by business_faqs.created_at)
      from business_faqs
      where business_faqs.business_id = target_business.id
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', business_links.id,
        'business_id', business_links.business_id,
        'label', business_links.label,
        'url', business_links.url,
        'purpose', business_links.purpose,
        'notes', business_links.notes,
        'is_active', business_links.is_active
      ) order by business_links.created_at)
      from business_links
      where business_links.business_id = target_business.id
        and business_links.is_active = true
    ), '[]'::jsonb),
    'business_hours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', business_hours.id,
        'business_id', business_hours.business_id,
        'day_of_week', business_hours.day_of_week,
        'opens_at', to_char(business_hours.opens_at, 'HH24:MI'),
        'closes_at', to_char(business_hours.closes_at, 'HH24:MI')
      ) order by business_hours.day_of_week)
      from business_hours
      where business_hours.business_id = target_business.id
    ), '[]'::jsonb),
    'availability_slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', availability_slots.id,
        'business_id', availability_slots.business_id,
        'date', availability_slots.date,
        'start_time', to_char(availability_slots.start_time, 'HH24:MI'),
        'end_time', to_char(availability_slots.end_time, 'HH24:MI'),
        'status', availability_slots.status,
        'notes', availability_slots.notes
      ) order by availability_slots.date, availability_slots.start_time)
      from availability_slots
      where availability_slots.business_id = target_business.id
        and availability_slots.date >= current_date
    ), '[]'::jsonb),
    'appointment_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', appointment_requests.id,
        'business_id', appointment_requests.business_id,
        'customer_id', appointment_requests.customer_id,
        'service', appointment_requests.service,
        'preferred_date', appointment_requests.preferred_date,
        'preferred_time', appointment_requests.preferred_time,
        'status', appointment_requests.status
      ))
      from appointment_requests
      where appointment_requests.business_id = target_business.id
        and appointment_requests.preferred_date >= current_date
        and appointment_requests.status in ('pending', 'confirmed')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_or_create_chat_session(
  p_token text,
  p_business_id uuid,
  p_channel message_channel,
  p_customer_name text,
  p_customer_phone text,
  p_customer_id uuid default null,
  p_conversation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_customer_id uuid;
  resolved_conversation_id uuid;
  history_json jsonb;
  has_appointment boolean;
  has_quote boolean;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Business not found' using errcode = '22023';
  end if;

  if p_channel = 'whatsapp' then
    perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_customer_phone, 0));

    select customers.id
    into resolved_customer_id
    from customers
    where customers.business_id = p_business_id
      and customers.phone = p_customer_phone
    order by customers.created_at
    limit 1;

    if resolved_customer_id is null then
      insert into customers (business_id, name, phone, status)
      values (p_business_id, p_customer_name, p_customer_phone, 'new')
      returning id into resolved_customer_id;
    else
      update customers
      set name = case
        when p_customer_name is not null and char_length(trim(p_customer_name)) > 1 then p_customer_name
        else customers.name
      end
      where id = resolved_customer_id;
    end if;

    select conversations.id
    into resolved_conversation_id
    from conversations
    where conversations.business_id = p_business_id
      and conversations.customer_id = resolved_customer_id
      and conversations.channel = 'whatsapp'
    order by conversations.created_at desc
    limit 1;

    if resolved_conversation_id is null then
      insert into conversations (business_id, customer_id, channel, last_intent)
      values (p_business_id, resolved_customer_id, 'whatsapp', 'faq')
      returning id into resolved_conversation_id;
    end if;
  else
    if p_customer_id is null and p_conversation_id is null then
      insert into customers (business_id, name, phone, status)
      values (p_business_id, p_customer_name, p_customer_phone, 'new')
      returning id into resolved_customer_id;

      insert into conversations (business_id, customer_id, channel, last_intent)
      values (p_business_id, resolved_customer_id, 'web', 'faq')
      returning id into resolved_conversation_id;
    elsif p_customer_id is null or p_conversation_id is null then
      raise exception 'Incomplete chat session' using errcode = '22023';
    else
      select customers.id
      into resolved_customer_id
      from customers
      where customers.id = p_customer_id
        and customers.business_id = p_business_id;

      select conversations.id
      into resolved_conversation_id
      from conversations
      where conversations.id = p_conversation_id
        and conversations.business_id = p_business_id
        and conversations.customer_id = p_customer_id
        and conversations.channel = 'web';

      if resolved_customer_id is null or resolved_conversation_id is null then
        raise exception 'Invalid chat session' using errcode = '42501';
      end if;

      update customers
      set
        name = case
          when customers.name = 'Cliente web'
            and p_customer_name is not null
            and char_length(trim(p_customer_name)) > 1 then p_customer_name
          else customers.name
        end,
        phone = case
          when customers.phone like 'web-%'
            and p_customer_phone is not null
            and char_length(trim(p_customer_phone)) > 4 then p_customer_phone
          else customers.phone
        end
      where customers.id = resolved_customer_id;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role', chat_history.role,
    'body', chat_history.body
  ) order by chat_history.created_at), '[]'::jsonb)
  into history_json
  from (
    select messages.role, messages.body, messages.created_at
    from messages
    where messages.conversation_id = resolved_conversation_id
    order by messages.created_at desc
    limit 8
  ) chat_history;

  select exists (
    select 1
    from appointment_requests
    where appointment_requests.conversation_id = resolved_conversation_id
      and appointment_requests.status in ('pending', 'confirmed')
  ) into has_appointment;

  select exists (
    select 1
    from quotes
    where quotes.conversation_id = resolved_conversation_id
  ) into has_quote;

  return jsonb_build_object(
    'customer_id', resolved_customer_id,
    'conversation_id', resolved_conversation_id,
    'history', history_json,
    'has_appointment', has_appointment,
    'has_quote', has_quote
  );
end;
$$;

create or replace function public.create_internal_appointment(
  p_token text,
  p_id uuid,
  p_business_id uuid,
  p_customer_id uuid,
  p_conversation_id uuid,
  p_service text,
  p_preferred_date date,
  p_preferred_time text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  inserted_count integer;
  canonical_time text;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if p_preferred_date < current_date then
    raise exception 'Appointment date cannot be in the past' using errcode = '22023';
  end if;

  canonical_time := to_char(p_preferred_time::time, 'HH24:MI');

  if not exists (
    select 1
    from conversations
    where conversations.id = p_conversation_id
      and conversations.business_id = p_business_id
      and conversations.customer_id = p_customer_id
  ) then
    raise exception 'Invalid chat session' using errcode = '42501';
  end if;

  insert into appointment_requests (
    id,
    business_id,
    customer_id,
    conversation_id,
    service,
    preferred_date,
    preferred_time,
    status
  )
  values (
    p_id,
    p_business_id,
    p_customer_id,
    p_conversation_id,
    p_service,
    p_preferred_date,
    canonical_time,
    'pending'
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.persist_internal_chat_turn(
  p_token text,
  p_business_id uuid,
  p_customer_id uuid,
  p_conversation_id uuid,
  p_intent conversation_intent,
  p_customer_message text,
  p_assistant_message text,
  p_quote jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  quote_created boolean := false;
  quote_inserted integer := 0;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if char_length(p_customer_message) = 0
    or char_length(p_customer_message) > 2000
    or char_length(p_assistant_message) = 0
    or char_length(p_assistant_message) > 4000 then
    raise exception 'Invalid message length' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from conversations
    where conversations.id = p_conversation_id
      and conversations.business_id = p_business_id
      and conversations.customer_id = p_customer_id
  ) then
    raise exception 'Invalid chat session' using errcode = '42501';
  end if;

  update conversations
  set last_intent = p_intent
  where id = p_conversation_id;

  update customers
  set status = case
    when p_intent = 'appointment' then 'appointment'::lead_status
    when p_intent = 'quote' then 'quoted'::lead_status
    when customers.status = 'new' then 'qualified'::lead_status
    else customers.status
  end
  where id = p_customer_id;

  insert into messages (conversation_id, role, body)
  values
    (p_conversation_id, 'customer', p_customer_message),
    (p_conversation_id, 'assistant', p_assistant_message);

  if p_quote is not null then
    insert into quotes (
      id,
      business_id,
      customer_id,
      conversation_id,
      service,
      description,
      min_price,
      max_price,
      notes,
      status
    )
    values (
      (p_quote ->> 'id')::uuid,
      p_business_id,
      p_customer_id,
      p_conversation_id,
      p_quote ->> 'service',
      p_quote ->> 'description',
      (p_quote ->> 'min_price')::integer,
      (p_quote ->> 'max_price')::integer,
      p_quote ->> 'notes',
      'draft'
    )
    on conflict do nothing;

    get diagnostics quote_inserted = row_count;
    quote_created := quote_inserted = 1;
  end if;

  return jsonb_build_object('quote_created', quote_created);
end;
$$;

create or replace function public.consume_internal_rate_limit(
  p_token text,
  p_rate_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  current_count integer;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if p_max_requests < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration' using errcode = '22023';
  end if;

  insert into private.request_rate_limits (rate_key, window_started_at, request_count, updated_at)
  values (p_rate_key, now(), 1, now())
  on conflict (rate_key) do update
  set
    window_started_at = case
      when private.request_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds) then now()
      else private.request_rate_limits.window_started_at
    end,
    request_count = case
      when private.request_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds) then 1
      else private.request_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count into current_count;

  return current_count <= p_max_requests;
end;
$$;

create or replace function public.claim_internal_whatsapp_event(
  p_token text,
  p_event_id text,
  p_business_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  claimed_id text;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  insert into private.whatsapp_inbound_events (
    event_id,
    business_id,
    status,
    attempts,
    updated_at
  )
  values (p_event_id, p_business_id, 'processing', 1, now())
  on conflict (event_id) do update
  set
    status = 'processing',
    attempts = private.whatsapp_inbound_events.attempts + 1,
    updated_at = now()
  where private.whatsapp_inbound_events.status = 'failed'
    or (
      private.whatsapp_inbound_events.status = 'processing'
      and private.whatsapp_inbound_events.updated_at < now() - interval '5 minutes'
    )
  returning event_id into claimed_id;

  return claimed_id is not null;
end;
$$;

create or replace function public.finish_internal_whatsapp_event(
  p_token text,
  p_event_id text,
  p_succeeded boolean
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

  update private.whatsapp_inbound_events
  set
    status = case when p_succeeded then 'completed' else 'failed' end,
    updated_at = now()
  where event_id = p_event_id;
end;
$$;

revoke all on function public.get_chat_context(text, text, text) from public, anon, authenticated;
revoke all on function public.get_or_create_chat_session(text, uuid, message_channel, text, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_internal_appointment(text, uuid, uuid, uuid, uuid, text, date, text)
  from public, anon, authenticated;
revoke all on function public.persist_internal_chat_turn(text, uuid, uuid, uuid, conversation_intent, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.consume_internal_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.claim_internal_whatsapp_event(text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.finish_internal_whatsapp_event(text, text, boolean)
  from public, anon, authenticated;

grant execute on function public.get_chat_context(text, text, text) to anon;
grant execute on function public.get_or_create_chat_session(text, uuid, message_channel, text, text, uuid, uuid) to anon;
grant execute on function public.create_internal_appointment(text, uuid, uuid, uuid, uuid, text, date, text) to anon;
grant execute on function public.persist_internal_chat_turn(text, uuid, uuid, uuid, conversation_intent, text, text, jsonb) to anon;
grant execute on function public.consume_internal_rate_limit(text, text, integer, integer) to anon;
grant execute on function public.claim_internal_whatsapp_event(text, text, uuid) to anon;
grant execute on function public.finish_internal_whatsapp_event(text, text, boolean) to anon;

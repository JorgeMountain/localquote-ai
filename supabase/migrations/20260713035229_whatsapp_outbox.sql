
create table if not exists private.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique references private.whatsapp_inbound_events(event_id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_phone_number_id text not null,
  customer_name text,
  customer_phone text not null,
  incoming_message text not null default '',
  message_type text not null default 'text',
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint whatsapp_outbox_event_id_length check (char_length(event_id) between 1 and 512),
  constraint whatsapp_outbox_source_phone_id_format check (source_phone_number_id ~ '^[0-9]{5,32}$'),
  constraint whatsapp_outbox_customer_name_length check (customer_name is null or char_length(customer_name) <= 120),
  constraint whatsapp_outbox_customer_phone_length check (char_length(customer_phone) between 8 and 32),
  constraint whatsapp_outbox_incoming_message_length check (char_length(incoming_message) <= 2000),
  constraint whatsapp_outbox_message_type_length check (char_length(message_type) between 1 and 40),
  constraint whatsapp_outbox_status_valid check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint whatsapp_outbox_attempts_valid check (attempts >= 0 and attempts <= max_attempts),
  constraint whatsapp_outbox_max_attempts_valid check (max_attempts between 1 and 5),
  constraint whatsapp_outbox_provider_message_id_length check (provider_message_id is null or char_length(provider_message_id) <= 512),
  constraint whatsapp_outbox_error_code_length check (error_code is null or char_length(error_code) <= 120)
);

revoke all on private.whatsapp_outbox from public, anon, authenticated;

create index if not exists whatsapp_outbox_ready_idx
  on private.whatsapp_outbox(status, next_attempt_at, created_at);

create index if not exists whatsapp_outbox_business_idx
  on private.whatsapp_outbox(business_id, created_at desc);

create or replace function public.enqueue_internal_whatsapp_outbox(
  p_token text,
  p_event_id text,
  p_business_id uuid,
  p_source_phone_number_id text,
  p_customer_name text,
  p_customer_phone text,
  p_incoming_message text,
  p_message_type text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  queued_id uuid;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if char_length(trim(p_event_id)) = 0
    or char_length(p_event_id) > 512
    or p_source_phone_number_id !~ '^[0-9]{5,32}$'
    or char_length(trim(p_customer_phone)) < 8
    or char_length(p_customer_phone) > 32
    or char_length(coalesce(p_incoming_message, '')) > 2000
    or char_length(trim(p_message_type)) = 0
    or char_length(p_message_type) > 40 then
    raise exception 'Invalid WhatsApp outbox payload' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from private.whatsapp_inbound_events
    where event_id = p_event_id
      and business_id = p_business_id
      and status = 'processing'
  ) then
    raise exception 'Inbound event is not claimed' using errcode = '42501';
  end if;

  insert into private.whatsapp_outbox (
    event_id,
    business_id,
    source_phone_number_id,
    customer_name,
    customer_phone,
    incoming_message,
    message_type,
    status,
    attempts,
    max_attempts,
    next_attempt_at,
    updated_at
  )
  values (
    trim(p_event_id),
    p_business_id,
    trim(p_source_phone_number_id),
    nullif(left(trim(coalesce(p_customer_name, '')), 120), ''),
    trim(p_customer_phone),
    left(coalesce(p_incoming_message, ''), 2000),
    left(trim(p_message_type), 40),
    'pending',
    0,
    3,
    now(),
    now()
  )
  on conflict (event_id) do update
  set
    status = 'pending',
    attempts = 0,
    next_attempt_at = now(),
    locked_at = null,
    provider_message_id = null,
    error_code = null,
    updated_at = now()
  where private.whatsapp_outbox.status = 'failed'
  returning id into queued_id;

  return queued_id is not null;
end;
$$;

create or replace function public.claim_internal_whatsapp_outbox(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  job private.whatsapp_outbox%rowtype;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  with candidate as (
    select id
    from private.whatsapp_outbox
    where attempts < max_attempts
      and (
        (status = 'pending' and next_attempt_at <= now())
        or (status = 'processing' and locked_at < now() - interval '10 minutes')
      )
    order by next_attempt_at, created_at
    for update skip locked
    limit 1
  )
  update private.whatsapp_outbox
  set
    status = 'processing',
    attempts = attempts + 1,
    locked_at = now(),
    updated_at = now()
  where id in (select id from candidate)
  returning * into job;

  if job.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', job.id,
    'event_id', job.event_id,
    'business_id', job.business_id,
    'source_phone_number_id', job.source_phone_number_id,
    'customer_name', job.customer_name,
    'customer_phone', job.customer_phone,
    'incoming_message', job.incoming_message,
    'message_type', job.message_type,
    'attempts', job.attempts,
    'max_attempts', job.max_attempts
  );
end;
$$;

create or replace function public.finish_internal_whatsapp_outbox(
  p_token text,
  p_outbox_id uuid,
  p_succeeded boolean,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  job private.whatsapp_outbox%rowtype;
  terminal_failure boolean;
  final_status text;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  select *
  into job
  from private.whatsapp_outbox
  where id = p_outbox_id
  for update;

  if job.id is null then
    raise exception 'Outbox job not found' using errcode = '22023';
  end if;

  if job.status <> 'processing' then
    return jsonb_build_object('status', job.status, 'retry_scheduled', job.status = 'pending');
  end if;

  terminal_failure := not p_succeeded and job.attempts >= job.max_attempts;
  final_status := case
    when p_succeeded then 'sent'
    when terminal_failure then 'failed'
    else 'pending'
  end;

  update private.whatsapp_outbox
  set
    status = final_status,
    next_attempt_at = case
      when p_succeeded or terminal_failure then next_attempt_at
      when job.attempts = 1 then now() + interval '15 seconds'
      when job.attempts = 2 then now() + interval '60 seconds'
      else now() + interval '5 minutes'
    end,
    locked_at = null,
    provider_message_id = case
      when p_succeeded then nullif(left(trim(coalesce(p_provider_message_id, '')), 512), '')
      else provider_message_id
    end,
    error_code = case
      when p_succeeded then null
      else nullif(left(trim(coalesce(p_error_code, 'processing_failed')), 120), '')
    end,
    sent_at = case when p_succeeded then now() else sent_at end,
    updated_at = now()
  where id = job.id;

  update private.whatsapp_inbound_events
  set
    status = case
      when p_succeeded then 'completed'
      when terminal_failure then 'failed'
      else 'processing'
    end,
    updated_at = now()
  where event_id = job.event_id;

  return jsonb_build_object(
    'status', final_status,
    'retry_scheduled', final_status = 'pending',
    'attempts', job.attempts,
    'max_attempts', job.max_attempts
  );
end;
$$;

revoke all on function public.enqueue_internal_whatsapp_outbox(
  text, text, uuid, text, text, text, text, text
) from public, anon, authenticated;

revoke all on function public.claim_internal_whatsapp_outbox(text)
  from public, anon, authenticated;

revoke all on function public.finish_internal_whatsapp_outbox(text, uuid, boolean, text, text)
  from public, anon, authenticated;

grant execute on function public.enqueue_internal_whatsapp_outbox(
  text, text, uuid, text, text, text, text, text
) to anon;

grant execute on function public.claim_internal_whatsapp_outbox(text)
  to anon;

grant execute on function public.finish_internal_whatsapp_outbox(text, uuid, boolean, text, text)
  to anon;


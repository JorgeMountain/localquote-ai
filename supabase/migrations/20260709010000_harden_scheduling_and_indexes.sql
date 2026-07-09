create index if not exists appointment_requests_business_customer_idx
  on appointment_requests(business_id, customer_id);

create index if not exists quotes_business_customer_idx
  on quotes(business_id, customer_id);

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
  business_now timestamp;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  canonical_time := to_char(p_preferred_time::time, 'HH24:MI');
  business_now := now() at time zone 'America/Bogota';

  if p_preferred_date < business_now::date
    or (
      p_preferred_date = business_now::date
      and canonical_time::time <= business_now::time
    ) then
    raise exception 'Appointment time must be in the future' using errcode = '22023';
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

revoke all on function public.create_internal_appointment(text, uuid, uuid, uuid, uuid, text, date, text)
  from public, anon, authenticated;
grant execute on function public.create_internal_appointment(text, uuid, uuid, uuid, uuid, text, date, text)
  to anon;

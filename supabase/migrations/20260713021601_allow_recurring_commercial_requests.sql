drop index if exists appointment_requests_conversation_active_idx;

create unique index if not exists appointment_requests_conversation_request_idx
  on appointment_requests(conversation_id, lower(service), preferred_date, preferred_time)
  where conversation_id is not null and status in ('pending', 'confirmed');

drop index if exists quotes_conversation_idx;

create unique index if not exists quotes_conversation_open_idx
  on quotes(conversation_id)
  where conversation_id is not null and status in ('draft', 'sent');

create index if not exists quotes_conversation_history_idx
  on quotes(conversation_id, created_at desc);

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
  business_today date;
begin
  if not private.internal_token_valid(p_token) then
    raise exception 'Invalid internal token' using errcode = '42501';
  end if;

  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Business not found' using errcode = '22023';
  end if;

  business_today := (now() at time zone 'America/Bogota')::date;

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
      and appointment_requests.preferred_date >= business_today
      and appointment_requests.status in ('pending', 'confirmed')
  ) into has_appointment;

  select exists (
    select 1
    from quotes
    where quotes.conversation_id = resolved_conversation_id
      and quotes.status in ('draft', 'sent')
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

revoke all on function public.get_or_create_chat_session(text, uuid, message_channel, text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_or_create_chat_session(text, uuid, message_channel, text, text, uuid, uuid)
  to anon;

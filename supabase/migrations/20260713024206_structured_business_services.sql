create table business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  min_price integer check (min_price is null or min_price >= 0),
  max_price integer check (max_price is null or max_price >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  requires_evaluation boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_services_price_range check (
    min_price is null or max_price is null or max_price >= min_price
  )
);

create unique index business_services_business_name_idx
  on business_services (business_id, lower(name));

create index business_services_business_active_idx
  on business_services (business_id, is_active, created_at);

alter table business_services enable row level security;

grant select on business_services to anon, authenticated;
grant insert, update, delete on business_services to authenticated;

create policy "business_services_public_select"
on business_services for select to anon
using (is_active = true);

create policy "business_services_authorized_select"
on business_services for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_services.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_services_authorized_insert"
on business_services for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_services.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_services_authorized_update"
on business_services for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_services.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_services.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_services_authorized_delete"
on business_services for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_services.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

insert into business_services (
  business_id,
  name,
  description,
  min_price,
  max_price,
  duration_minutes,
  requires_evaluation
)
select
  business.id,
  trim(regexp_replace(service.raw_service, '\s+-\s+(desde\s+)?\$.*$', '', 'i')),
  service.raw_service,
  nullif(regexp_replace(substring(service.raw_service from '\$\s*([0-9][0-9.,]*)'), '[^0-9]', '', 'g'), '')::integer,
  case
    when service.raw_service ~* '\bdesde\b' then null
    else nullif(regexp_replace(substring(service.raw_service from '\$\s*([0-9][0-9.,]*)'), '[^0-9]', '', 'g'), '')::integer
  end,
  nullif(substring(service.raw_service from '(?i)duraci[oó]n\s+([0-9]+)'), '')::integer,
  service.raw_service ~* 'valoraci[oó]n|evaluaci[oó]n'
from businesses business
cross join lateral unnest(business.services) with ordinality as service(raw_service, position)
where trim(service.raw_service) <> ''
on conflict do nothing;

create or replace function get_chat_context(
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
  where (p_phone_number_id is not null and businesses.whatsapp_phone_number_id = p_phone_number_id)
     or (p_slug is not null and businesses.slug = p_slug)
  order by case
    when p_phone_number_id is not null and businesses.whatsapp_phone_number_id = p_phone_number_id then 0
    else 1
  end
  limit 1;

  if target_business.id is null then return null; end if;

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
    'business_services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', business_services.id,
        'business_id', business_services.business_id,
        'name', business_services.name,
        'description', business_services.description,
        'min_price', business_services.min_price,
        'max_price', business_services.max_price,
        'duration_minutes', business_services.duration_minutes,
        'requires_evaluation', business_services.requires_evaluation,
        'is_active', business_services.is_active
      ) order by business_services.created_at)
      from business_services
      where business_services.business_id = target_business.id
        and business_services.is_active = true
    ), '[]'::jsonb),
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

create extension if not exists "pgcrypto";

create type business_type as enum ('dentist', 'repair');
create type lead_status as enum ('new', 'qualified', 'appointment', 'quoted');
create type conversation_intent as enum ('faq', 'quote', 'appointment', 'handoff');
create type message_role as enum ('assistant', 'customer');
create type message_channel as enum ('web', 'whatsapp');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled');
create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  type business_type not null,
  description text not null,
  services text[] not null default '{}',
  hours text not null,
  location text not null,
  phone text not null,
  rules text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table business_faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  category text,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  status lead_status not null default 'new',
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  channel message_channel not null default 'web',
  last_intent conversation_intent not null default 'faq',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role message_role not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table appointment_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service text not null,
  preferred_date date not null,
  preferred_time text not null,
  status appointment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service text not null,
  description text not null,
  min_price integer not null,
  max_price integer not null,
  notes text not null,
  status quote_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index businesses_owner_id_idx on businesses(owner_id);
create index businesses_slug_idx on businesses(slug);
create index business_faqs_business_id_idx on business_faqs(business_id);
create index customers_business_id_idx on customers(business_id);
create index conversations_business_id_idx on conversations(business_id);
create index conversations_customer_id_idx on conversations(customer_id);
create index messages_conversation_id_idx on messages(conversation_id);
create index appointment_requests_business_id_idx on appointment_requests(business_id);
create index appointment_requests_customer_id_idx on appointment_requests(customer_id);
create index quotes_business_id_idx on quotes(business_id);
create index quotes_customer_id_idx on quotes(customer_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_faqs enable row level security;
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointment_requests enable row level security;
alter table quotes enable row level security;

grant usage on schema public to anon, authenticated, service_role;

revoke all on
  profiles,
  businesses,
  business_faqs,
  customers,
  conversations,
  messages,
  appointment_requests,
  quotes
from anon, authenticated;

grant select on businesses, business_faqs to anon;
grant insert on customers, conversations, messages, appointment_requests, quotes to anon;

grant select, insert, update, delete on
  profiles,
  businesses,
  business_faqs,
  customers,
  conversations,
  messages,
  appointment_requests,
  quotes
to authenticated;

grant all on
  profiles,
  businesses,
  business_faqs,
  customers,
  conversations,
  messages,
  appointment_requests,
  quotes
to service_role;

create policy "profiles_select_own"
on profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "businesses_public_select"
on businesses for select to anon, authenticated
using (true);

create policy "businesses_owner_insert"
on businesses for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "businesses_owner_update"
on businesses for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "businesses_owner_delete"
on businesses for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "business_faqs_public_select"
on business_faqs for select to anon, authenticated
using (true);

create policy "business_faqs_owner_insert"
on business_faqs for insert to authenticated
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_faqs_owner_update"
on business_faqs for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_faqs_owner_delete"
on business_faqs for delete to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "customers_public_insert"
on customers for insert to anon, authenticated
with check (
  char_length(name) > 1
  and char_length(phone) > 4
  and business_id is not null
);

create policy "customers_owner_select"
on customers for select to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = customers.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "customers_owner_update"
on customers for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = customers.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = customers.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "conversations_public_insert"
on conversations for insert to anon, authenticated
with check (
  channel = 'web'
  and business_id is not null
  and customer_id is not null
);

create policy "conversations_owner_select"
on conversations for select to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = conversations.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "messages_public_insert"
on messages for insert to anon, authenticated
with check (
  role in ('assistant', 'customer')
  and char_length(body) > 0
  and conversation_id is not null
);

create policy "messages_owner_select"
on messages for select to authenticated
using (
  exists (
    select 1 from conversations
    join businesses on businesses.id = conversations.business_id
    where conversations.id = messages.conversation_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "appointment_requests_public_insert"
on appointment_requests for insert to anon, authenticated
with check (
  char_length(service) > 1
  and preferred_date is not null
  and char_length(preferred_time) > 1
  and business_id is not null
  and customer_id is not null
);

create policy "appointment_requests_owner_select"
on appointment_requests for select to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "appointment_requests_owner_update"
on appointment_requests for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "quotes_public_insert"
on quotes for insert to anon, authenticated
with check (
  min_price >= 0
  and max_price >= min_price
  and char_length(service) > 1
  and char_length(description) > 10
  and business_id is not null
  and customer_id is not null
);

create policy "quotes_owner_select"
on quotes for select to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "quotes_owner_update"
on quotes for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

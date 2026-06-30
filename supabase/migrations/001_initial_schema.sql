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
  created_at timestamptz not null default now(),
  unique (business_id, phone)
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
create index business_faqs_business_id_idx on business_faqs(business_id);
create index customers_business_id_idx on customers(business_id);
create index conversations_business_id_idx on conversations(business_id);
create index messages_conversation_id_idx on messages(conversation_id);
create index appointment_requests_business_id_idx on appointment_requests(business_id);
create index quotes_business_id_idx on quotes(business_id);

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_faqs enable row level security;
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointment_requests enable row level security;
alter table quotes enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "business_owner_all" on businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "business_faq_owner_all" on business_faqs
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = business_faqs.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "customers_owner_all" on customers
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = customers.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "conversations_owner_all" on conversations
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = conversations.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "messages_owner_all" on messages
  for all using (
    exists (
      select 1 from conversations
      join businesses on businesses.id = conversations.business_id
      where conversations.id = messages.conversation_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "appointment_requests_owner_all" on appointment_requests
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = appointment_requests.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "quotes_owner_all" on quotes
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = quotes.business_id
      and businesses.owner_id = auth.uid()
    )
  );

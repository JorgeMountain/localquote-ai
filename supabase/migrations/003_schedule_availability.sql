create type availability_status as enum ('available', 'blocked', 'booked');

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  created_at timestamptz not null default now(),
  constraint business_hours_valid_range check (opens_at < closes_at)
);

create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status availability_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  constraint availability_slots_valid_range check (start_time < end_time)
);

create index business_hours_business_day_idx on business_hours(business_id, day_of_week);
create index availability_slots_business_date_time_idx on availability_slots(business_id, date, start_time);
create unique index availability_slots_business_date_start_idx on availability_slots(business_id, date, start_time);

alter table business_hours enable row level security;
alter table availability_slots enable row level security;

revoke all on business_hours, availability_slots from anon, authenticated;

grant select on business_hours, availability_slots to anon;
grant select, insert, update, delete on business_hours, availability_slots to authenticated;
grant all on business_hours, availability_slots to service_role;

create policy "business_hours_public_select"
on business_hours for select to anon, authenticated
using (true);

create policy "business_hours_owner_insert"
on business_hours for insert to authenticated
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_hours_owner_update"
on business_hours for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_hours_owner_delete"
on business_hours for delete to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_public_select"
on availability_slots for select to anon, authenticated
using (true);

create policy "availability_slots_owner_insert"
on availability_slots for insert to authenticated
with check (
  exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_owner_update"
on availability_slots for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_owner_delete"
on availability_slots for delete to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

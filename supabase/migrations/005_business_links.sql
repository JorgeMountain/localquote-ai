create table business_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  label text not null,
  url text not null check (url ~* '^https?://'),
  purpose text not null default 'general',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index business_links_business_id_idx on business_links(business_id);

alter table business_links enable row level security;

grant select on business_links to anon, authenticated;
grant insert, update, delete on business_links to authenticated;

create policy "business_links_public_select"
on business_links for select to anon, authenticated
using (is_active = true);

create policy "business_links_owner_select"
on business_links for select to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_owner_insert"
on business_links for insert to authenticated
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_owner_update"
on business_links for update to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
    and businesses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_owner_delete"
on business_links for delete to authenticated
using (
  exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
    and businesses.owner_id = (select auth.uid())
  )
);

create type payment_receipt_status as enum ('pending', 'approved', 'rejected');

create table payment_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  reviewed_by uuid references profiles(id) on delete set null,
  object_path text not null unique,
  original_name text not null,
  mime_type text not null,
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  billing_period text,
  notes text not null default '',
  review_notes text not null default '',
  status payment_receipt_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index payment_receipts_business_id_idx on payment_receipts(business_id);
create index payment_receipts_status_idx on payment_receipts(status);
create index payment_receipts_created_at_idx on payment_receipts(created_at desc);

alter table payment_receipts enable row level security;

revoke all on payment_receipts from anon, authenticated;
grant select, insert, delete on payment_receipts to authenticated;
grant update (status, review_notes, reviewed_by, reviewed_at) on payment_receipts to authenticated;
grant all on payment_receipts to service_role;

create policy "payment_receipts_owner_select"
on payment_receipts for select to authenticated
using (
  exists (
    select 1
    from businesses
    where businesses.id = payment_receipts.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "payment_receipts_owner_insert"
on payment_receipts for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1
    from businesses
    where businesses.id = payment_receipts.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "payment_receipts_owner_delete_pending"
on payment_receipts for delete to authenticated
using (
  status = 'pending'
  and uploaded_by = (select auth.uid())
  and exists (
    select 1
    from businesses
    where businesses.id = payment_receipts.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "payment_receipts_admin_select"
on payment_receipts for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "payment_receipts_admin_insert"
on payment_receipts for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and public.current_profile_role() = 'platform_admin'
);

create policy "payment_receipts_admin_update"
on payment_receipts for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "payment_receipts_admin_delete"
on payment_receipts for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "payment_receipts_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    public.current_profile_role() = 'platform_admin'
    or exists (
      select 1
      from businesses
      where businesses.id::text = (storage.foldername(name))[1]
        and businesses.owner_id = (select auth.uid())
    )
  )
);

create policy "payment_receipts_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (
    public.current_profile_role() = 'platform_admin'
    or exists (
      select 1
      from businesses
      where businesses.id::text = (storage.foldername(name))[1]
        and businesses.owner_id = (select auth.uid())
    )
  )
);

create policy "payment_receipts_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    public.current_profile_role() = 'platform_admin'
    or exists (
      select 1
      from businesses
      where businesses.id::text = (storage.foldername(name))[1]
        and businesses.owner_id = (select auth.uid())
    )
  )
);

create index payment_receipts_uploaded_by_idx on payment_receipts(uploaded_by);
create index payment_receipts_reviewed_by_idx on payment_receipts(reviewed_by);

drop policy "payment_receipts_owner_select" on payment_receipts;
drop policy "payment_receipts_admin_select" on payment_receipts;
drop policy "payment_receipts_owner_insert" on payment_receipts;
drop policy "payment_receipts_admin_insert" on payment_receipts;
drop policy "payment_receipts_owner_delete_pending" on payment_receipts;
drop policy "payment_receipts_admin_delete" on payment_receipts;

create policy "payment_receipts_authorized_select"
on payment_receipts for select to authenticated
using (
  private.current_profile_role() = 'platform_admin'
  or exists (
    select 1
    from businesses
    where businesses.id = payment_receipts.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "payment_receipts_authorized_insert"
on payment_receipts for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    private.current_profile_role() = 'platform_admin'
    or exists (
      select 1
      from businesses
      where businesses.id = payment_receipts.business_id
        and businesses.owner_id = (select auth.uid())
    )
  )
);

create policy "payment_receipts_authorized_delete"
on payment_receipts for delete to authenticated
using (
  private.current_profile_role() = 'platform_admin'
  or (
    status = 'pending'
    and uploaded_by = (select auth.uid())
    and exists (
      select 1
      from businesses
      where businesses.id = payment_receipts.business_id
        and businesses.owner_id = (select auth.uid())
    )
  )
);

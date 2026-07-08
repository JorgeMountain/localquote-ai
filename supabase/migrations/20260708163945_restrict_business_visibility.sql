drop policy "businesses_public_select" on businesses;

create policy "businesses_public_select"
on businesses for select to anon
using (true);

create policy "businesses_authenticated_select"
on businesses for select to authenticated
using (
  owner_id = (select auth.uid())
  or private.current_profile_role() = 'platform_admin'
);

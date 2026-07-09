revoke insert, update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

drop policy if exists "profiles_admin_select" on profiles;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_admin_update" on profiles;
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_authorized_select"
on profiles for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or id = (select auth.uid())
);

create policy "profiles_owner_name_update"
on profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "businesses_admin_insert" on businesses;
drop policy if exists "businesses_owner_insert" on businesses;
drop policy if exists "businesses_admin_update" on businesses;
drop policy if exists "businesses_owner_update" on businesses;
drop policy if exists "businesses_admin_delete" on businesses;
drop policy if exists "businesses_owner_delete" on businesses;

create policy "businesses_authorized_insert"
on businesses for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or owner_id = (select auth.uid())
);

create policy "businesses_authorized_update"
on businesses for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or owner_id = (select auth.uid())
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or owner_id = (select auth.uid())
);

create policy "businesses_authorized_delete"
on businesses for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or owner_id = (select auth.uid())
);

drop policy if exists "business_faqs_admin_insert" on business_faqs;
drop policy if exists "business_faqs_owner_insert" on business_faqs;
drop policy if exists "business_faqs_admin_update" on business_faqs;
drop policy if exists "business_faqs_owner_update" on business_faqs;
drop policy if exists "business_faqs_admin_delete" on business_faqs;
drop policy if exists "business_faqs_owner_delete" on business_faqs;

create policy "business_faqs_authorized_insert"
on business_faqs for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_faqs_authorized_update"
on business_faqs for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_faqs_authorized_delete"
on business_faqs for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_faqs.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "business_hours_admin_insert" on business_hours;
drop policy if exists "business_hours_owner_insert" on business_hours;
drop policy if exists "business_hours_admin_update" on business_hours;
drop policy if exists "business_hours_owner_update" on business_hours;
drop policy if exists "business_hours_admin_delete" on business_hours;
drop policy if exists "business_hours_owner_delete" on business_hours;

create policy "business_hours_authorized_insert"
on business_hours for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_hours_authorized_update"
on business_hours for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_hours_authorized_delete"
on business_hours for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_hours.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "availability_slots_admin_insert" on availability_slots;
drop policy if exists "availability_slots_owner_insert" on availability_slots;
drop policy if exists "availability_slots_admin_update" on availability_slots;
drop policy if exists "availability_slots_owner_update" on availability_slots;
drop policy if exists "availability_slots_admin_delete" on availability_slots;
drop policy if exists "availability_slots_owner_delete" on availability_slots;

create policy "availability_slots_authorized_insert"
on availability_slots for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_authorized_update"
on availability_slots for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "availability_slots_authorized_delete"
on availability_slots for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = availability_slots.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "business_links_public_select" on business_links;
drop policy if exists "business_links_admin_select" on business_links;
drop policy if exists "business_links_owner_select" on business_links;
drop policy if exists "business_links_admin_insert" on business_links;
drop policy if exists "business_links_owner_insert" on business_links;
drop policy if exists "business_links_admin_update" on business_links;
drop policy if exists "business_links_owner_update" on business_links;
drop policy if exists "business_links_admin_delete" on business_links;
drop policy if exists "business_links_owner_delete" on business_links;

create policy "business_links_public_select"
on business_links for select to anon
using (is_active = true);

create policy "business_links_authorized_select"
on business_links for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_authorized_insert"
on business_links for insert to authenticated
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_authorized_update"
on business_links for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "business_links_authorized_delete"
on business_links for delete to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = business_links.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "customers_admin_select" on customers;
drop policy if exists "customers_owner_select" on customers;
drop policy if exists "customers_admin_update" on customers;
drop policy if exists "customers_owner_update" on customers;

create policy "customers_authorized_select"
on customers for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = customers.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "customers_authorized_update"
on customers for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = customers.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = customers.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "conversations_admin_select" on conversations;
drop policy if exists "conversations_owner_select" on conversations;

create policy "conversations_authorized_select"
on conversations for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = conversations.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "messages_admin_select" on messages;
drop policy if exists "messages_owner_select" on messages;

create policy "messages_authorized_select"
on messages for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1
    from conversations
    join businesses on businesses.id = conversations.business_id
    where conversations.id = messages.conversation_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "appointment_requests_admin_select" on appointment_requests;
drop policy if exists "appointment_requests_owner_select" on appointment_requests;
drop policy if exists "appointment_requests_admin_update" on appointment_requests;
drop policy if exists "appointment_requests_owner_update" on appointment_requests;

create policy "appointment_requests_authorized_select"
on appointment_requests for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "appointment_requests_authorized_update"
on appointment_requests for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = appointment_requests.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "quotes_admin_select" on quotes;
drop policy if exists "quotes_owner_select" on quotes;
drop policy if exists "quotes_admin_update" on quotes;
drop policy if exists "quotes_owner_update" on quotes;

create policy "quotes_authorized_select"
on quotes for select to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "quotes_authorized_update"
on quotes for update to authenticated
using (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
      and businesses.owner_id = (select auth.uid())
  )
)
with check (
  (select private.current_profile_role()) = 'platform_admin'
  or exists (
    select 1 from businesses
    where businesses.id = quotes.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

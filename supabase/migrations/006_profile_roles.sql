create type profile_role as enum ('platform_admin', 'business_owner');

alter table profiles
  add column if not exists email text,
  add column if not exists role profile_role not null default 'business_owner';

update profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id
and profiles.email is null;

update profiles
set role = 'platform_admin'
where id in (
  select id from auth.users
  where lower(email) = lower('owner@tactio.app')
);

create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_email_idx on profiles(email);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profiles.role::text from public.profiles where profiles.id = (select auth.uid())),
    'business_owner'
  );
$$;

revoke all on function public.current_profile_role() from public, anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

create policy "profiles_admin_select"
on profiles for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "profiles_admin_update"
on profiles for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "businesses_admin_insert"
on businesses for insert to authenticated
with check (public.current_profile_role() = 'platform_admin');

create policy "businesses_admin_update"
on businesses for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "businesses_admin_delete"
on businesses for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "business_faqs_admin_insert"
on business_faqs for insert to authenticated
with check (public.current_profile_role() = 'platform_admin');

create policy "business_faqs_admin_update"
on business_faqs for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "business_faqs_admin_delete"
on business_faqs for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "customers_admin_select"
on customers for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "customers_admin_update"
on customers for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "conversations_admin_select"
on conversations for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "messages_admin_select"
on messages for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "appointment_requests_admin_select"
on appointment_requests for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "appointment_requests_admin_update"
on appointment_requests for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "quotes_admin_select"
on quotes for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "quotes_admin_update"
on quotes for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "business_hours_admin_insert"
on business_hours for insert to authenticated
with check (public.current_profile_role() = 'platform_admin');

create policy "business_hours_admin_update"
on business_hours for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "business_hours_admin_delete"
on business_hours for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "availability_slots_admin_insert"
on availability_slots for insert to authenticated
with check (public.current_profile_role() = 'platform_admin');

create policy "availability_slots_admin_update"
on availability_slots for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "availability_slots_admin_delete"
on availability_slots for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "business_links_admin_select"
on business_links for select to authenticated
using (public.current_profile_role() = 'platform_admin');

create policy "business_links_admin_insert"
on business_links for insert to authenticated
with check (public.current_profile_role() = 'platform_admin');

create policy "business_links_admin_update"
on business_links for update to authenticated
using (public.current_profile_role() = 'platform_admin')
with check (public.current_profile_role() = 'platform_admin');

create policy "business_links_admin_delete"
on business_links for delete to authenticated
using (public.current_profile_role() = 'platform_admin');

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.current_profile_role() set schema private;

revoke all on function private.current_profile_role() from public, anon, authenticated;
grant execute on function private.current_profile_role() to authenticated, service_role;

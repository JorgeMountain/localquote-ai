drop policy if exists "conversations_public_insert" on conversations;

create policy "conversations_public_insert"
on conversations for insert to anon, authenticated
with check (
  channel in ('web', 'whatsapp')
  and business_id is not null
  and customer_id is not null
);

do $$
begin
  create type delivery_status as enum ('pending', 'sent', 'failed');
exception
  when duplicate_object then null;
end $$;

alter table appointment_requests
  add column if not exists delivery_status delivery_status not null default 'pending',
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists provider_message_id text;

alter table quotes
  add column if not exists delivery_status delivery_status not null default 'pending',
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists provider_message_id text;

alter table appointment_requests
  drop constraint if exists appointment_requests_delivery_error_length,
  add constraint appointment_requests_delivery_error_length
    check (error_message is null or char_length(error_message) <= 1500);

alter table quotes
  drop constraint if exists quotes_delivery_error_length,
  add constraint quotes_delivery_error_length
    check (error_message is null or char_length(error_message) <= 1500);

create index if not exists appointment_requests_delivery_status_idx
  on appointment_requests (business_id, delivery_status, created_at desc);

create index if not exists quotes_delivery_status_idx
  on quotes (business_id, delivery_status, created_at desc);

grant select (business_id, preferred_date, preferred_time, status)
on appointment_requests
to anon;

create policy "appointment_requests_public_schedule_select"
on appointment_requests for select to anon
using (true);

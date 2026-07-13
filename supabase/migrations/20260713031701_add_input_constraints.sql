alter table businesses
  add constraint businesses_name_length check (char_length(trim(name)) between 1 and 120),
  add constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 64),
  add constraint businesses_description_length check (char_length(description) <= 2000),
  add constraint businesses_hours_length check (char_length(hours) <= 2000),
  add constraint businesses_location_length check (char_length(location) <= 500),
  add constraint businesses_phone_length check (char_length(phone) <= 32);

alter table business_faqs
  add constraint business_faqs_question_length check (char_length(trim(question)) between 1 and 500),
  add constraint business_faqs_answer_length check (char_length(trim(answer)) between 1 and 3000),
  add constraint business_faqs_category_length check (category is null or char_length(category) <= 80);

alter table business_links
  add constraint business_links_label_length check (char_length(trim(label)) between 1 and 120),
  add constraint business_links_url_length check (char_length(url) <= 2048),
  add constraint business_links_notes_length check (char_length(notes) <= 1000);

alter table messages
  add constraint messages_body_length check (char_length(trim(body)) between 1 and 4000);

alter table appointment_requests
  add constraint appointment_requests_service_length check (char_length(trim(service)) between 1 and 120),
  add constraint appointment_requests_time_format check (preferred_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table quotes
  add constraint quotes_service_length check (char_length(trim(service)) between 1 and 120),
  add constraint quotes_description_length check (char_length(description) <= 3000),
  add constraint quotes_notes_length check (char_length(notes) <= 1500),
  add constraint quotes_price_range check (min_price >= 0 and max_price >= min_price);

alter table payment_receipts
  add constraint payment_receipts_original_name_length check (char_length(original_name) between 1 and 255),
  add constraint payment_receipts_billing_period_length check (billing_period is null or char_length(billing_period) <= 120),
  add constraint payment_receipts_notes_length check (char_length(notes) <= 1000),
  add constraint payment_receipts_review_notes_length check (char_length(review_notes) <= 1000);

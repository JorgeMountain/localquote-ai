update business_services
set max_price = null,
    updated_at = now()
where description ~* '(^|[^[:alnum:]_])desde([^[:alnum:]_]|$)'
  and min_price is not null;

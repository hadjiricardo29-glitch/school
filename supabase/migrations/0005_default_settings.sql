-- Motosu — valeurs par défaut de configuration (modifiables depuis /admin/settings)

insert into public.system_settings (key, value, type) values
  ('platform_name', '"Motosu"', 'string'),
  ('primary_color', '"#820000"', 'string'),
  ('secondary_color', '"#A00000"', 'string'),
  ('currency', '"XOF"', 'string'),
  ('currency_label', '"FCFA"', 'string'),
  ('withdrawal_min_amount', '1000', 'number'),
  ('withdrawal_fee_percentage', '5', 'number'),
  ('withdrawal_fee_fixed', '0', 'number'),
  ('withdrawal_cooldown_hours', '24', 'number'),
  ('withdrawal_max_amount', '500000', 'number'),
  ('maintenance_mode', 'false', 'boolean'),
  ('registration_enabled', 'true', 'boolean')
on conflict (key) do nothing;

insert into public.commission_rules (level, percentage, fixed_amount, active) values
  (1, 10.00, 0, true),
  (2, 5.00, 0, true),
  (3, 2.00, 0, true)
on conflict (level) do nothing;

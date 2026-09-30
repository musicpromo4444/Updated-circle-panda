-- Secret Profile ad inventory slots controlled by Admin.
insert into public.universal_ad_placements
  (placement_key, label, default_format, enabled, frequency_cap_seconds, targeting)
values
  ('secret_profile_slot_1', 'Secret Profile — Slot 1', 'banner', true, 0, '{}'::jsonb),
  ('secret_profile_slot_2', 'Secret Profile — Slot 2', 'banner', true, 0, '{}'::jsonb),
  ('secret_profile_slot_3', 'Secret Profile — Slot 3', 'banner', true, 0, '{}'::jsonb),
  ('secret_profile_slot_4', 'Secret Profile — Slot 4 / Repeat', 'banner', true, 0, '{}'::jsonb)
on conflict (placement_key) do update
set label = excluded.label,
    default_format = excluded.default_format;

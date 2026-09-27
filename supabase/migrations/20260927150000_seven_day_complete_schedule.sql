-- Circle Panda: final 7-Day Activities schedule hardening.
-- Keeps exactly one server-authoritative activity for each of the seven days.
-- Day 1-7 are fully playable; extra catalogue games remain available for Admin reassignment.

insert into public.seven_day_activity_schedule(day_number, activity_slug, enabled)
values
  (1, 'wheel_spin', true),
  (2, 'mystery_box', true),
  (3, 'target', true),
  (4, 'guess_sponsor', true),
  (5, 'puzzle', true),
  (6, 'coin_drop', true),
  (7, 'slots', true)
on conflict (day_number) do update
set activity_slug = excluded.activity_slug,
    enabled = excluded.enabled,
    updated_at = now();

update public.seven_day_activity_configs
set is_enabled = true,
    updated_at = now()
where slug in (
  'wheel_spin',
  'mystery_box',
  'target',
  'guess_sponsor',
  'puzzle',
  'coin_drop',
  'slots'
);

-- Keep the three additional experiences enabled for Admin-controlled reassignment.
update public.seven_day_activity_configs
set is_enabled = true,
    updated_at = now()
where slug in ('pick_prize', 'secret_reveal', 'cup_shuffle', 'playable_ad');

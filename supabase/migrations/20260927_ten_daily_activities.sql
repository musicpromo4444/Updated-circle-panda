-- Circle Panda: ten daily activity library
-- Applied to production Supabase on 2026-09-27.
begin;
update public.seven_day_activity_configs set sort_order=100+sort_order;
delete from public.seven_day_activity_configs where slug in ('pick_prize','cup_shuffle');
insert into public.seven_day_activity_configs (slug,title,description,free_attempts,reward_pool,timer_seconds,is_enabled,sort_order) values
('wheel_spin','Lucky Wheel','Spin the glowing Circle Panda wheel and reveal your reward.',3,'[{"label":"5 BC","amount":5},{"label":"10 BC","amount":10},{"label":"20 BC","amount":20},{"label":"50 BC","amount":50}]',0,true,1),
('mystery_box','Mystery Box','Choose one glowing box and watch it open to reveal your prize.',1,'[{"label":"10 BC","amount":10},{"label":"15 BC","amount":15},{"label":"25 BC","amount":25},{"label":"50 BC","amount":50}]',0,true,2),
('target','Panda Target','Hit Panda''s neon target as accurately as you can.',3,'[{"label":"5 BC","amount":5},{"label":"10 BC","amount":10},{"label":"25 BC","amount":25},{"label":"50 BC","amount":50}]',0,true,3),
('guess_sponsor','Guess the Sponsor','Guess which active sponsor is behind today''s sponsored experience.',1,'[{"label":"5 BC","amount":5},{"label":"10 BC","amount":10}]',0,true,4),
('puzzle','Panda Puzzle','Solve a quick Panda puzzle to unlock your reward.',1,'[{"label":"10 BC","amount":10},{"label":"20 BC","amount":20},{"label":"50 BC","amount":50}]',0,true,5),
('coin_drop','Coin Drop','Catch falling coins for 60 seconds. Stones cost 3 BC each.',3,'[{"label":"Coin Drop","amount":0}]',60,true,6),
('slots','Panda Slots','Play the neon reels for 60 seconds, then watch the calculating reveal.',3,'[{"label":"10 BC","amount":10},{"label":"20 BC","amount":20},{"label":"50 BC","amount":50},{"label":"100 BC","amount":100}]',60,true,7),
('lucky_card','Lucky Card','Choose a glowing card and reveal the hidden reward.',1,'[{"label":"5 BC","amount":5},{"label":"10 BC","amount":10},{"label":"25 BC","amount":25},{"label":"50 BC","amount":50}]',0,true,8),
('cup_shuffle','Panda Cup Shuffle','Pick a prize, then watch Panda flip, mix and shuffle the cups before the reveal.',1,'[{"label":"10 BC","amount":10},{"label":"20 BC","amount":20},{"label":"50 BC","amount":50}]',0,true,4),
('secret_reveal','Secret Reveal','Solve a puzzle made from a real Secret Confession, then choose whether to reveal it.',1,'[{"label":"10 BC","amount":10},{"label":"20 BC","amount":20},{"label":"50 BC","amount":50}]',0,true,9),
('playable_ad','Just Playbo Ads','Sponsored ad experience only. Direct sponsor or native AdMob bridge. No BC reward.',1,'[]',0,true,10)
on conflict (slug) do update set title=excluded.title,description=excluded.description,free_attempts=excluded.free_attempts,reward_pool=excluded.reward_pool,timer_seconds=excluded.timer_seconds,is_enabled=true,sort_order=excluded.sort_order,updated_at=now();
update public.seven_day_activity_schedule set activity_slug=case day_number when 1 then 'wheel_spin' when 2 then 'mystery_box' when 3 then 'target' when 4 then 'cup_shuffle' when 5 then 'puzzle' when 6 then 'coin_drop' when 7 then 'slots' end,enabled=true,updated_at=now();
commit;
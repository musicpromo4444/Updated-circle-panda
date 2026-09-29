-- Premium animated Hot Seat gift ladder: 100 BC through 20,000 BC.
update public.hot_seat_gift_catalog set enabled=false, updated_at=now();

insert into public.hot_seat_gift_catalog (gift_id,name,emoji,cost_bc,effect,enabled)
values
('stylish_hat','Stylish Hat','🎩',100,'A glowing hat spins onto the stage with a sparkling ribbon trail.',true),
('rose_of_love','Rose of Love','🌹',200,'A luminous rose blooms and sends petals across the live stage.',true),
('lovely_panda','Lovely Panda','🐼',350,'A heart-holding panda bounces forward with a pink aura.',true),
('tiger_power','Tiger Power','🐯',700,'A roaring tiger streaks across the screen with fiery energy.',true),
('diamond','Diamond','💎',1000,'A giant diamond rotates through a burst of blue light.',true),
('panda_boss','Panda Boss','🕶️',5000,'A boss panda steps forward with gold energy and a spotlight.',true),
('dragon_panda','Dragon Panda','🐉',12000,'A golden dragon coils around the host with blazing particles.',true),
('mystic_panda','Mystic Panda','🥋',17000,'A mystic warrior panda channels swirling purple chi.',true),
('panda_general','Panda General','🐼',20000,'The ultimate kung-fu panda general unleashes golden chi, moving cheese charms, and a full-stage victory aura.',true)
on conflict (gift_id) do update set
  name=excluded.name, emoji=excluded.emoji, cost_bc=excluded.cost_bc,
  effect=excluded.effect, enabled=true, updated_at=now();
update public.hot_seat_gift_catalog set name='Bamboo Bounce',emoji='🎋',cost_bc=10,effect='A playful bamboo gift pops onto the Hot Seat stage.',enabled=true,updated_at=now() where gift_id='bamboo';
update public.hot_seat_gift_catalog set name='Matcha Splash',emoji='🍵',cost_bc=25,effect='A matcha splash sweeps across the stream.',enabled=true,updated_at=now() where gift_id='matcha';
update public.hot_seat_gift_catalog set name='Heart Burst',emoji='💖',cost_bc=100,effect='A burst of glowing hearts fills the screen.',enabled=true,updated_at=now() where gift_id='torch';
update public.hot_seat_gift_catalog set name='Fire Crown',emoji='👑',cost_bc=250,effect='A fiery crown lands above the host.',enabled=true,updated_at=now() where gift_id='crown';
update public.hot_seat_gift_catalog set name='Thunder Panda',emoji='⚡',cost_bc=500,effect='A thunder panda charges across the stage.',enabled=true,updated_at=now() where gift_id='rocket';
insert into public.hot_seat_gift_catalog(gift_id,name,emoji,cost_bc,effect,enabled) values
('panda_hug','Panda Hug','🐼',50,'A giant Panda hug floats toward the host.',true),
('golden_dragon','Golden Dragon','🐉',1000,'A golden dragon flies across the Hot Seat.',true),
('panda_palace','Panda Palace','🏯',2500,'A glowing Panda Palace rises behind the host.',true),
('royal_parade','Royal Panda Parade','🎉',5000,'A full royal parade crosses the live stage.',true),
('galaxy_panda','Galaxy Panda','🌌',10000,'The stream transforms into a cosmic Panda scene.',true),
('panda_universe','Panda Universe','🌠',20000,'The ultimate Circle Panda gift triggers a full-screen universe celebration.',true)
on conflict(gift_id) do update set name=excluded.name,emoji=excluded.emoji,cost_bc=excluded.cost_bc,effect=excluded.effect,enabled=true,updated_at=now();
update public.hot_seat_gift_catalog set enabled=false where gift_id not in ('bamboo','matcha','panda_hug','torch','crown','rocket','golden_dragon','panda_palace','royal_parade','galaxy_panda','panda_universe');
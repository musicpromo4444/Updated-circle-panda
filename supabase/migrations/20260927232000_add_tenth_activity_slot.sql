alter table public.activity_rewards drop constraint if exists activity_rewards_activity_number_check;
alter table public.activity_rewards add constraint activity_rewards_activity_number_check check (activity_number >= 1 and activity_number <= 10);
insert into public.activity_rewards(activity_number,reward_bc,requires_playable_ad,is_enabled)
values(10,0,true,true)
on conflict(activity_number) do update set reward_bc=0,requires_playable_ad=true,is_enabled=true;
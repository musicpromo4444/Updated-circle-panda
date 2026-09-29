-- Complete page-specific inline ad placement catalog for Circle Panda.
insert into public.universal_ad_placements (placement_key,label,default_format,enabled,frequency_cap_seconds,targeting)
values
('events_inline','Events Inline','native',true,0,'{}'),
('sweepstakes_inline','Sweepstakes Inline','native',true,0,'{}'),
('live_inline','Live Inline','native',true,0,'{}'),
('music_time_inline','Music Time Inline','native',true,0,'{}'),
('profile_inline','Profile Inline','native',true,0,'{}'),
('leaders_inline','Leaders Inline','native',true,0,'{}'),
('notifications_inline','Notifications Inline','native',true,0,'{}'),
('home_inline','Home Inline','native',true,0,'{}')
on conflict (placement_key) do nothing;
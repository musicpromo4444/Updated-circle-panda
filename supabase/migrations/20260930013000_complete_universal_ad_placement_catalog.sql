-- Universal Circle Panda ad placement catalog completion.
insert into public.universal_ad_placements (placement_key,label,default_format,enabled,frequency_cap_seconds,targeting)
values
('login_top','Login Top Banner','banner',true,0,'{}'),
('login_bottom','Login Bottom Banner','banner',true,0,'{}'),
('home','Home Sponsor','native',true,0,'{}'),
('messages','Messages Ad','banner',true,0,'{}'),
('dating','Dating Ad','native',true,0,'{}'),
('confessions','Secret Confessions Ad','native',true,0,'{}'),
('events','Events Ad','native',true,0,'{}'),
('groups','Groups Ad','native',true,0,'{}'),
('activities','Activities Ad','banner',true,0,'{}'),
('hot_seat','Hot Seat Sponsor','sponsor',true,0,'{}'),
('live','Live Sponsor','sponsor',true,0,'{}'),
('music_time','Music Time Sponsor','native',true,0,'{}'),
('sweepstakes','Sweepstakes Sponsor','native',true,0,'{}'),
('store','Store Sponsor','native',true,0,'{}'),
('profile','Profile Sponsor','native',true,0,'{}'),
('leaders','Leaders Sponsor','native',true,0,'{}'),
('vip','VIP Sponsor','native',true,0,'{}'),
('notifications','Notifications Sponsor','native',true,0,'{}'),
('wcw_mcm_native','WCW/MCM Native','native',true,0,'{}'),
('wcw_mcm_interstitial','WCW/MCM Interstitial','interstitial',true,0,'{}'),
('wcw_mcm_popup','WCW/MCM Popup','sponsor',true,0,'{}'),
('wcw_mcm_banner','WCW/MCM Banner','banner',true,0,'{}'),
('wcw_mcm_playable','WCW/MCM Playable','playable',true,0,'{}'),
('settings','Settings Sponsor','native',true,0,'{}')
on conflict (placement_key) do nothing;

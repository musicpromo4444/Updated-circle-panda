insert into public.universal_ad_placements (placement_key,label,default_format,enabled,frequency_cap_seconds,targeting)
values
('confessions_inline','Secret Confessions Inline','native',true,0,'{}'),
('groups_inline','Groups Inline','native',true,0,'{}'),
('messages_inline','Messages Inline','banner',true,0,'{}'),
('dating_inline','Dating Inline','interstitial',true,0,'{}')
on conflict (placement_key) do nothing;
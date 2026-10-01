create or replace function public.enforce_circle_panda_video_ad_placements()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.placement_key in ('video_preroll','video_postroll') then
    new.enabled := true;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_circle_panda_video_ad_placements on public.universal_ad_placements;
create trigger enforce_circle_panda_video_ad_placements
before insert or update on public.universal_ad_placements
for each row execute function public.enforce_circle_panda_video_ad_placements();

update public.universal_ad_placements
set enabled=true
where placement_key in ('video_preroll','video_postroll');
-- Dating completion: real photo upload, blurred preview, secure reveal, and complete profile fields
alter table public.dating_profiles
  add column if not exists relationship_goal text not null default '',
  add column if not exists looking_for text[] not null default '{}',
  add column if not exists lifestyle text[] not null default '{}',
  add column if not exists personality text[] not null default '{}',
  add column if not exists love_language text not null default '',
  add column if not exists smoking text not null default '',
  add column if not exists drinking text not null default '',
  add column if not exists children text not null default '',
  add column if not exists education text not null default '',
  add column if not exists occupation text not null default '',
  add column if not exists sexual_experience text not null default '',
  add column if not exists intimacy_preference text not null default '',
  add column if not exists relationship_status text not null default 'single',
  add column if not exists height_cm integer,
  add column if not exists zodiac text not null default '',
  add column if not exists favorite_date text not null default '',
  add column if not exists photo_path text,
  add column if not exists blurred_photo_path text;

alter table public.dating_profiles drop constraint if exists dating_profiles_age_check;
alter table public.dating_profiles add constraint dating_profiles_age_check check (age between 18 and 120);

alter table public.dating_profiles enable row level security;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('dating-photos','dating-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('dating-photo-blur','dating-photo-blur',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "dating photos own upload" on storage.objects;
create policy "dating photos own upload" on storage.objects for insert to authenticated with check (bucket_id='dating-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "dating photos own update" on storage.objects;
create policy "dating photos own update" on storage.objects for update to authenticated using (bucket_id='dating-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='dating-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "dating photos controlled read" on storage.objects;
create policy "dating photos controlled read" on storage.objects for select to authenticated using (
  bucket_id='dating-photos' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists (
      select 1 from public.dating_profiles dp join public.dating_connections dc on (
        (dc.requester_id=(select auth.uid()) and dc.recipient_id=dp.user_id)
        or (dc.recipient_id=(select auth.uid()) and dc.requester_id=dp.user_id)
      )
      where dp.user_id::text=(storage.foldername(name))[1] and dc.status='matched'
        and dc.requester_confirmed=true and dc.recipient_confirmed=true
    )
  )
);
drop policy if exists "dating photos own delete" on storage.objects;
create policy "dating photos own delete" on storage.objects for delete to authenticated using (bucket_id='dating-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "dating blur upload" on storage.objects;
create policy "dating blur upload" on storage.objects for insert to authenticated with check (bucket_id='dating-photo-blur' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "dating blur update" on storage.objects;
create policy "dating blur update" on storage.objects for update to authenticated using (bucket_id='dating-photo-blur' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='dating-photo-blur' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "dating blur delete" on storage.objects;
create policy "dating blur delete" on storage.objects for delete to authenticated using (bucket_id='dating-photo-blur' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "dating blur public read" on storage.objects;
create policy "dating blur public read" on storage.objects for select to public using (bucket_id='dating-photo-blur');

drop function if exists public.register_dating_profile_secure(integer,text,text,text,text,text[],text,text[],text[],text[],text,text,text,text,text,text,text,text,text,integer,text,text,text);

create or replace function public.register_dating_profile_secure(
  p_age integer, p_gender text, p_country text, p_vibe text, p_bio text, p_interests text[],
  p_relationship_goal text, p_looking_for text[], p_lifestyle text[], p_personality text[],
  p_love_language text, p_smoking text, p_drinking text, p_children text, p_education text,
  p_occupation text, p_sexual_experience text, p_intimacy_preference text, p_relationship_status text,
  p_height_cm integer, p_zodiac text, p_favorite_date text, p_emoji text,
  p_photo_path text default null, p_blurred_photo_path text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); pname text; old public.dating_profiles%rowtype;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_age < 18 or p_age > 120 then raise exception 'Dating is 18+ only'; end if;
  if length(trim(coalesce(p_country,''))) < 2 then raise exception 'Choose your country'; end if;
  if length(trim(coalesce(p_gender,''))) < 1 then raise exception 'Choose your gender'; end if;
  if length(trim(coalesce(p_bio,''))) < 2 then raise exception 'Write a short About'; end if;
  if p_sexual_experience is not null and p_sexual_experience not in ('','Novice','Some experience','Experienced','Good in bed','Prefer not to say') then raise exception 'Invalid sexual experience'; end if;
  select display_name into pname from public.profiles where id=uid;
  pname:=coalesce(nullif(trim(pname),''),'Anonymous Panda');
  select * into old from public.dating_profiles where user_id=uid;
  if old.user_id is not null then pname:=coalesce(nullif(old.panda_name_snapshot,''),old.name); end if;
  insert into public.dating_profiles(user_id,name,age,vibe,emoji,bio,interests,location,relationship_goal,looking_for,lifestyle,personality,love_language,smoking,drinking,children,education,occupation,sexual_experience,intimacy_preference,relationship_status,height_cm,zodiac,favorite_date,country,gender,panda_name_snapshot,location_snapshot,photo_path,blurred_photo_path,enabled,updated_at)
  values(uid,pname,p_age,left(coalesce(p_vibe,''),200),coalesce(nullif(p_emoji,''),'🐼'),left(trim(p_bio),2000),coalesce(p_interests,'{}'),trim(p_country),left(coalesce(p_relationship_goal,''),300),coalesce(p_looking_for,'{}'),coalesce(p_lifestyle,'{}'),coalesce(p_personality,'{}'),left(coalesce(p_love_language,''),100),left(coalesce(p_smoking,''),100),left(coalesce(p_drinking,''),100),left(coalesce(p_children,''),100),left(coalesce(p_education,''),200),left(coalesce(p_occupation,''),200),left(coalesce(p_sexual_experience,''),100),left(coalesce(p_intimacy_preference,''),200),left(coalesce(p_relationship_status,'single'),100),p_height_cm,left(coalesce(p_zodiac,''),50),left(coalesce(p_favorite_date,''),300),trim(p_country),left(trim(p_gender),50),pname,trim(p_country),nullif(trim(p_photo_path),''),nullif(trim(p_blurred_photo_path),''),true,now())
  on conflict(user_id) do update set age=excluded.age,vibe=excluded.vibe,emoji=excluded.emoji,bio=excluded.bio,interests=excluded.interests,location=excluded.location,relationship_goal=excluded.relationship_goal,looking_for=excluded.looking_for,lifestyle=excluded.lifestyle,personality=excluded.personality,love_language=excluded.love_language,smoking=excluded.smoking,drinking=excluded.drinking,children=excluded.children,education=excluded.education,occupation=excluded.occupation,sexual_experience=excluded.sexual_experience,intimacy_preference=excluded.intimacy_preference,relationship_status=excluded.relationship_status,height_cm=excluded.height_cm,zodiac=excluded.zodiac,favorite_date=excluded.favorite_date,country=excluded.country,gender=excluded.gender,panda_name_snapshot=excluded.panda_name_snapshot,location_snapshot=excluded.location_snapshot,photo_path=excluded.photo_path,blurred_photo_path=excluded.blurred_photo_path,updated_at=now();
  return jsonb_build_object('user_id',uid,'name',pname,'country',trim(p_country),'gender',trim(p_gender),'photo_path',nullif(trim(p_photo_path),''),'blurred_photo_path',nullif(trim(p_blurred_photo_path),''));
end $$;

revoke all on function public.register_dating_profile_secure(integer,text,text,text,text,text[],text,text[],text[],text[],text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text) from public;
grant execute on function public.register_dating_profile_secure(integer,text,text,text,text,text[],text,text[],text[],text[],text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text) to authenticated;
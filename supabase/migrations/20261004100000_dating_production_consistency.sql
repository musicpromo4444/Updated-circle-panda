-- Circle Panda production dating consistency hardening.
-- Single account source of truth, stable cross-account discovery, and re-enable on profile update.

do $$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('register_dating_profile_secure','get_dating_discovery_secure')
  loop
    execute format('drop function if exists public.%I(%s)', r.proname, r.args);
  end loop;
end $$;

create or replace function public.register_dating_profile_secure(
  p_age integer,
  p_gender text,
  p_country text,
  p_vibe text,
  p_bio text,
  p_interests text[],
  p_relationship_goal text,
  p_looking_for text[],
  p_lifestyle text[],
  p_personality text[],
  p_love_language text,
  p_smoking text,
  p_drinking text,
  p_children text,
  p_education text,
  p_occupation text,
  p_sexual_experience text,
  p_intimacy_preference text,
  p_relationship_status text,
  p_height_cm integer,
  p_zodiac text,
  p_favorite_date text,
  p_emoji text,
  p_photo_path text default null,
  p_blurred_photo_path text default null,
  p_about_traits text[] default '{}'
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  uid uuid:=auth.uid();
  acct public.profiles%rowtype;
  pname text;
  clean_about text[];
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into acct from public.profiles where id=uid for update;
  if acct.id is null then raise exception 'Complete your Circle Panda profile first'; end if;
  if acct.age is null or acct.age < 18 or acct.age > 120 then raise exception 'Dating is 18+ only'; end if;
  if acct.gender not in ('male','female') then raise exception 'Choose your Circle Panda account gender first'; end if;
  if length(trim(coalesce(acct.country,''))) < 2 then raise exception 'Complete your Circle Panda country first'; end if;

  clean_about := array(
    select distinct trim(x)
    from unnest(coalesce(p_about_traits,'{}')) x
    where trim(x)<>''
  );

  pname := coalesce(nullif(trim(acct.display_name),''),'Anonymous Panda');

  insert into public.dating_profiles(
    user_id,name,age,vibe,emoji,bio,interests,location,relationship_goal,looking_for,
    about_traits,lifestyle,personality,love_language,smoking,drinking,children,education,
    occupation,sexual_experience,intimacy_preference,relationship_status,height_cm,zodiac,
    favorite_date,country,gender,panda_name_snapshot,location_snapshot,photo_path,
    blurred_photo_path,enabled,updated_at
  )
  values(
    uid,pname,acct.age,left(coalesce(p_vibe,''),200),coalesce(nullif(p_emoji,''),'🐼'),
    left(coalesce(nullif(trim(p_bio),''),'Circle Panda Dating profile'),2000),
    coalesce(p_interests,'{}'),
    coalesce(nullif(acct.city,''),nullif(acct.area,''),acct.country),
    left(coalesce(p_relationship_goal,''),300),coalesce(p_looking_for,'{}'),clean_about,
    coalesce(p_lifestyle,'{}'),coalesce(p_personality,'{}'),left(coalesce(p_love_language,''),100),
    left(coalesce(p_smoking,''),100),left(coalesce(p_drinking,''),100),left(coalesce(p_children,''),100),
    left(coalesce(p_education,''),200),left(coalesce(p_occupation,''),200),
    left(coalesce(p_sexual_experience,''),100),left(coalesce(p_intimacy_preference,''),200),
    left(coalesce(p_relationship_status,'single'),100),p_height_cm,left(coalesce(p_zodiac,''),50),
    left(coalesce(p_favorite_date,''),300),trim(acct.country),acct.gender,pname,
    coalesce(nullif(acct.city,''),nullif(acct.area,''),acct.country),
    nullif(trim(p_photo_path),''),nullif(trim(p_blurred_photo_path),''),true,now()
  )
  on conflict(user_id) do update set
    age=excluded.age,
    vibe=excluded.vibe,
    emoji=excluded.emoji,
    bio=excluded.bio,
    interests=excluded.interests,
    location=excluded.location,
    relationship_goal=excluded.relationship_goal,
    looking_for=excluded.looking_for,
    about_traits=excluded.about_traits,
    lifestyle=excluded.lifestyle,
    personality=excluded.personality,
    love_language=excluded.love_language,
    smoking=excluded.smoking,
    drinking=excluded.drinking,
    children=excluded.children,
    education=excluded.education,
    occupation=excluded.occupation,
    sexual_experience=excluded.sexual_experience,
    intimacy_preference=excluded.intimacy_preference,
    relationship_status=excluded.relationship_status,
    height_cm=excluded.height_cm,
    zodiac=excluded.zodiac,
    favorite_date=excluded.favorite_date,
    country=excluded.country,
    gender=excluded.gender,
    panda_name_snapshot=excluded.panda_name_snapshot,
    location_snapshot=excluded.location_snapshot,
    photo_path=excluded.photo_path,
    blurred_photo_path=excluded.blurred_photo_path,
    enabled=true,
    updated_at=now();

  return jsonb_build_object(
    'user_id',uid,'name',pname,'age',acct.age,'country',acct.country,'gender',acct.gender,
    'location',coalesce(nullif(acct.city,''),nullif(acct.area,''),acct.country),
    'photo_path',nullif(trim(p_photo_path),''),
    'blurred_photo_path',nullif(trim(p_blurred_photo_path),'')
  );
end $$;

create or replace function public.get_dating_discovery_secure(
  p_age_min integer default 18,
  p_age_max integer default 120,
  p_country text default '',
  p_location text default '',
  p_gender text default '',
  p_relationship_goal text default '',
  p_looking_for text default '',
  p_lifestyle text default '',
  p_smoking text default '',
  p_drinking text default '',
  p_children text default '',
  p_education text default '',
  p_height_min integer default null,
  p_height_max integer default null,
  p_zodiac text default '',
  p_same_country_only boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  uid uuid:=auth.uid();
  my_country text:='';
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_age_min < 18 or p_age_max < p_age_min then raise exception 'Invalid age range'; end if;

  select coalesce(country,'') into my_country from public.profiles where id=uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',d.user_id,'name',d.name,'age',d.age,'vibe',d.vibe,'emoji',d.emoji,'bio',d.bio,
    'interests',d.interests,'location',d.location,'country',d.country,'gender',d.gender,
    'relationship_goal',d.relationship_goal,'looking_for',d.looking_for,'about_traits',d.about_traits,
    'lifestyle',d.lifestyle,'personality',d.personality,'love_language',d.love_language,
    'smoking',d.smoking,'drinking',d.drinking,'children',d.children,'education',d.education,
    'occupation',d.occupation,'sexual_experience',d.sexual_experience,'intimacy_preference',d.intimacy_preference,
    'relationship_status',d.relationship_status,'height_cm',d.height_cm,'zodiac',d.zodiac,
    'favorite_date',d.favorite_date,'photo_path',d.photo_path,'blurred_photo_path',d.blurred_photo_path,
    'updated_at',d.updated_at
  ) order by d.updated_at desc),'[]'::jsonb)
  into result
  from public.dating_profiles d
  where d.enabled=true
    and d.user_id<>uid
    and d.age between greatest(18,p_age_min) and least(120,p_age_max)
    and (not p_same_country_only or nullif(my_country,'') is null or lower(d.country)=lower(my_country))
    and (nullif(trim(p_country),'') is null or lower(d.country) like '%'||lower(trim(p_country))||'%')
    and (nullif(trim(p_location),'') is null or lower(d.location) like '%'||lower(trim(p_location))||'%')
    and (nullif(trim(p_gender),'') is null or lower(d.gender)=lower(trim(p_gender)))
    and (nullif(trim(p_relationship_goal),'') is null or lower(d.relationship_goal) like '%'||lower(trim(p_relationship_goal))||'%')
    and (nullif(trim(p_looking_for),'') is null or exists(select 1 from unnest(coalesce(d.looking_for,'{}')) v where lower(v) like '%'||lower(trim(p_looking_for))||'%'))
    and (nullif(trim(p_lifestyle),'') is null or exists(select 1 from unnest(coalesce(d.lifestyle,'{}')) v where lower(v) like '%'||lower(trim(p_lifestyle))||'%'))
    and (nullif(trim(p_smoking),'') is null or lower(d.smoking)=lower(trim(p_smoking)))
    and (nullif(trim(p_drinking),'') is null or lower(d.drinking)=lower(trim(p_drinking)))
    and (nullif(trim(p_children),'') is null or lower(d.children)=lower(trim(p_children)))
    and (nullif(trim(p_education),'') is null or lower(d.education) like '%'||lower(trim(p_education))||'%')
    and (p_height_min is null or d.height_cm is null or d.height_cm>=p_height_min)
    and (p_height_max is null or d.height_cm is null or d.height_cm<=p_height_max)
    and (nullif(trim(p_zodiac),'') is null or lower(d.zodiac)=lower(trim(p_zodiac)));

  return result;
end $$;

do $$
declare r record;
begin
  for r in
    select p.proname,pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('register_dating_profile_secure','get_dating_discovery_secure')
  loop
    execute format('revoke all on function public.%I(%s) from public,anon',r.proname,r.args);
    execute format('grant execute on function public.%I(%s) to authenticated',r.proname,r.args);
  end loop;
end $$;

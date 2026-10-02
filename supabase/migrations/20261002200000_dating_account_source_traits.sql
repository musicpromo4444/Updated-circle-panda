-- Circle Panda Dating: account-owned identity, gender-aware traits, modern interests and final-step photo.
alter table public.profiles add column if not exists age integer;
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or age between 18 and 120);
alter table public.dating_profiles add column if not exists about_traits text[] not null default '{}';

drop function if exists public.update_profile_completion_secure(text,text,text,text,text);
drop function if exists public.update_profile_completion_secure(text,text,text,text,text,integer);
create or replace function public.update_profile_completion_secure(
  p_country text default null,p_state_province text default null,p_city text default null,p_area text default null,p_address_line text default null,p_age integer default null
) returns public.profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); result public.profiles; existing_age integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_age is not null and (p_age<18 or p_age>120) then raise exception 'Age must be between 18 and 120'; end if;
  select age into existing_age from public.profiles where id=uid for update;
  if existing_age is not null and p_age is not null and existing_age<>p_age then raise exception 'Account age is locked and cannot be changed'; end if;
  update public.profiles set country=nullif(trim(coalesce(p_country,'')),''),state_province=nullif(trim(coalesce(p_state_province,'')),''),city=nullif(trim(coalesce(p_city,'')),''),area=nullif(trim(coalesce(p_area,'')),''),address_line=nullif(trim(coalesce(p_address_line,'')),''),age=coalesce(age,p_age),updated_at=now() where id=uid returning * into result;
  if result.id is null then raise exception 'Profile not found'; end if;
  return result;
end $$;

drop function if exists public.register_dating_profile_secure(integer,text,text,text,text,text[],text,text[],text[],text[],text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text);
create or replace function public.register_dating_profile_secure(
  p_vibe text,p_about_traits text[],p_interests text[],p_relationship_goal text,p_looking_for text[],p_lifestyle text[],p_personality text[],
  p_smoking text,p_drinking text,p_children text,p_education text,p_occupation text,p_sexual_experience text,p_height_cm integer,p_zodiac text,
  p_favorite_date text,p_emoji text,p_photo_path text default null,p_blurred_photo_path text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); pname text; acct public.profiles%rowtype; old public.dating_profiles%rowtype; own_allowed text[]; target_allowed text[];
clean_about text[]; clean_looking text[]; clean_interests text[]; clean_lifestyle text[];
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into acct from public.profiles where id=uid for update;
  if acct.id is null then raise exception 'Complete your Circle Panda profile first'; end if;
  if acct.age is null or acct.age<18 then raise exception 'Complete your Circle Panda age first'; end if;
  if acct.gender not in ('male','female') then raise exception 'Choose your Circle Panda account gender first'; end if;
  if length(trim(coalesce(acct.country,'')))<2 then raise exception 'Complete your Circle Panda country first'; end if;
  if acct.gender='male' then
    own_allowed:=array['Very fair skin','Fair skin','Light brown skin','Brown skin','Dark brown skin','Deep dark skin','Short','Average height','Tall','Very tall','Slim','Average build','Athletic','Muscular','Broad shoulders','Broad chest','Chubby','Plus-size','Black hair','Brown hair','Blonde hair','Bald','Short hair','Long hair','Dreads','Braids','Curly hair','Brown eyes','Black eyes','Hazel eyes','Blue eyes','Green eyes','Bearded','Clean-shaven','Mustache','Goatee','Casual style','Smart style','Streetwear style','Sexy style','Masculine style'];
    target_allowed:=array['Very fair skin','Fair skin','Light brown skin','Brown skin','Dark brown skin','Deep dark skin','Short','Average height','Tall','Very tall','Slim','Petite','Average build','Athletic','Curvy','Chubby','Plus-size','Figure-eight','Small waist','Average waist','Wide waist','Small hips','Average hips','Wide hips','Small butt','Average butt','Big butt','Small chest','Average chest','Big chest','Black hair','Brown hair','Blonde hair','Short hair','Long hair','Dreads','Braids','Curly hair','Straight hair','Brown eyes','Black eyes','Hazel eyes','Blue eyes','Green eyes','Casual style','Glamorous style','Feminine style','Sexy style'];
  else
    own_allowed:=array['Very fair skin','Fair skin','Light brown skin','Brown skin','Dark brown skin','Deep dark skin','Short','Average height','Tall','Slim','Petite','Average build','Athletic','Curvy','Chubby','Plus-size','Figure-eight','Small waist','Average waist','Wide waist','Small hips','Average hips','Wide hips','Small butt','Average butt','Big butt','Small chest','Average chest','Big chest','Black hair','Brown hair','Blonde hair','Short hair','Long hair','Dreads','Braids','Curly hair','Straight hair','Brown eyes','Black eyes','Hazel eyes','Blue eyes','Green eyes','Casual style','Glamorous style','Feminine style','Sexy style'];
    target_allowed:=array['Very fair skin','Fair skin','Light brown skin','Brown skin','Dark brown skin','Deep dark skin','Short','Average height','Tall','Very tall','Slim','Average build','Athletic','Muscular','Broad shoulders','Broad chest','Chubby','Plus-size','Black hair','Brown hair','Blonde hair','Bald','Short hair','Long hair','Dreads','Braids','Curly hair','Brown eyes','Black eyes','Hazel eyes','Blue eyes','Green eyes','Bearded','Clean-shaven','Mustache','Goatee','Casual style','Smart style','Streetwear style','Sexy style','Masculine style'];
  end if;
  clean_about:=array(select distinct trim(x) from unnest(coalesce(p_about_traits,'{}')) x where trim(x)<>'');
  clean_looking:=array(select distinct trim(x) from unnest(coalesce(p_looking_for,'{}')) x where trim(x)<>'');
  clean_interests:=array(select distinct trim(x) from unnest(coalesce(p_interests,'{}')) x where trim(x)<>'');
  clean_lifestyle:=array(select distinct trim(x) from unnest(coalesce(p_lifestyle,'{}')) x where trim(x)<>'');
  if coalesce(array_length(clean_about,1),0)=0 then raise exception 'Choose at least one About You trait'; end if;
  if exists(select 1 from unnest(clean_about) x where not(x=any(own_allowed))) then raise exception 'Invalid About You trait'; end if;
  if exists(select 1 from unnest(clean_looking) x where not(x=any(target_allowed))) then raise exception 'Invalid What you are looking for trait'; end if;
  if p_relationship_goal not in ('Long-distance relationship','Something casual','Long-term relationship','Something that leads to marriage','Just for fun','Just exploring','Friendship first','Dating / getting to know someone') then raise exception 'Choose a relationship type'; end if;
  if p_favorite_date not in ('My house','Public place','Restaurant / Eatery','Hotel','Beach / Outdoor place','Cafe / Coffee shop') then raise exception 'Choose where you can meet first'; end if;
  if coalesce(p_sexual_experience,'') not in ('','Virgin','Novice','Expert','Good in bed','Pro','Prefer not to say') then raise exception 'Invalid sexual experience'; end if;
  pname:=coalesce(nullif(trim(acct.display_name),''),'Anonymous Panda');
  select * into old from public.dating_profiles where user_id=uid;
  if old.user_id is not null then pname:=coalesce(nullif(old.panda_name_snapshot,''),old.name,pname); end if;
  insert into public.dating_profiles(user_id,name,age,vibe,emoji,bio,interests,location,relationship_goal,looking_for,about_traits,lifestyle,personality,love_language,smoking,drinking,children,education,occupation,sexual_experience,intimacy_preference,relationship_status,height_cm,zodiac,favorite_date,country,gender,panda_name_snapshot,location_snapshot,photo_path,blurred_photo_path,enabled,updated_at)
  values(uid,pname,acct.age,left(coalesce(p_vibe,''),200),coalesce(nullif(p_emoji,''),'🐼'),left('About You: '||array_to_string(clean_about,', '),2000),clean_interests,coalesce(nullif(acct.city,''),nullif(acct.area,''),acct.country),left(trim(p_relationship_goal),100),clean_looking,clean_about,clean_lifestyle,coalesce(p_personality,'{}'),'',
    left(coalesce(p_smoking,''),100),left(coalesce(p_drinking,''),100),left(coalesce(p_children,''),100),left(coalesce(p_education,''),200),left(coalesce(p_occupation,''),200),left(coalesce(p_sexual_experience,''),100),'','single',
    p_height_cm,left(coalesce(p_zodiac,''),50),left(trim(p_favorite_date),100),trim(acct.country),acct.gender,pname,coalesce(nullif(acct.city,''),nullif(acct.area,''),acct.country),nullif(trim(p_photo_path),''),nullif(trim(p_blurred_photo_path),''),true,now())
  on conflict(user_id) do update set age=excluded.age,vibe=excluded.vibe,emoji=excluded.emoji,bio=excluded.bio,interests=excluded.interests,location=excluded.location,relationship_goal=excluded.relationship_goal,looking_for=excluded.looking_for,about_traits=excluded.about_traits,lifestyle=excluded.lifestyle,personality=excluded.personality,love_language='',smoking=excluded.smoking,drinking=excluded.drinking,children=excluded.children,education=excluded.education,occupation=excluded.occupation,sexual_experience=excluded.sexual_experience,intimacy_preference='',relationship_status='single',height_cm=excluded.height_cm,zodiac=excluded.zodiac,favorite_date=excluded.favorite_date,country=excluded.country,gender=excluded.gender,panda_name_snapshot=excluded.panda_name_snapshot,location_snapshot=excluded.location_snapshot,photo_path=excluded.photo_path,blurred_photo_path=excluded.blurred_photo_path,updated_at=now();
  return jsonb_build_object('user_id',uid,'name',pname,'age',acct.age,'country',acct.country,'gender',acct.gender,'city',acct.city,'area',acct.area,'about_traits',clean_about,'looking_for',clean_looking,'photo_path',nullif(trim(p_photo_path),''),'blurred_photo_path',nullif(trim(p_blurred_photo_path),''));
end $$;

create or replace function public.get_dating_discovery_secure(p_age_min integer default 18,p_age_max integer default 120,p_country text default '',p_location text default '',p_gender text default '',p_relationship_goal text default '',p_looking_for text default '',p_lifestyle text default '',p_smoking text default '',p_drinking text default '',p_children text default '',p_education text default '',p_height_min integer default null,p_height_max integer default null,p_zodiac text default '',p_same_country_only boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); my_country text:=''; my_gender text:=''; result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_age_min<18 or p_age_max<p_age_min then raise exception 'Invalid age range'; end if;
  select coalesce(country,''),coalesce(gender,'') into my_country,my_gender from public.profiles where id=uid;
  select coalesce(jsonb_agg(jsonb_build_object('user_id',d.user_id,'name',d.name,'age',d.age,'vibe',d.vibe,'emoji',d.emoji,'bio',d.bio,'interests',d.interests,'country',d.country,'gender',d.gender,'relationship_goal',d.relationship_goal,'looking_for',d.looking_for,'about_traits',d.about_traits,'lifestyle',d.lifestyle,'personality',d.personality,'smoking',d.smoking,'drinking',d.drinking,'children',d.children,'education',d.education,'occupation',d.occupation,'sexual_experience',d.sexual_experience,'height_cm',d.height_cm,'zodiac',d.zodiac,'favorite_date',d.favorite_date,'photo_path',d.photo_path,'blurred_photo_path',d.blurred_photo_path,'updated_at',d.updated_at) order by d.updated_at desc),'[]'::jsonb) into result
  from public.dating_profiles d
  where d.enabled=true and d.user_id<>uid and d.age between greatest(18,p_age_min) and least(120,p_age_max)
    and (my_gender not in ('male','female') or lower(d.gender)=case when my_gender='male' then 'female' else 'male' end)
    and (not p_same_country_only or nullif(my_country,'') is null or lower(d.country)=lower(my_country))
    and (nullif(trim(p_country),'') is null or lower(d.country) like '%'||lower(trim(p_country))||'%')
    and (nullif(trim(p_location),'') is null or lower(d.location) like '%'||lower(trim(p_location))||'%')
    and (nullif(trim(p_gender),'') is null or lower(d.gender)=lower(trim(p_gender)))
    and (nullif(trim(p_relationship_goal),'') is null or lower(d.relationship_goal) like '%'||lower(trim(p_relationship_goal))||'%')
    and (nullif(trim(p_looking_for),'') is null or exists(select 1 from unnest(coalesce(d.looking_for,'{}')) v where lower(v) like '%'||lower(trim(p_looking_for))||'%'))
    and (nullif(trim(p_lifestyle),'') is null or exists(select 1 from unnest(coalesce(d.lifestyle,'{}')) v where lower(v) like '%'||lower(trim(p_lifestyle))||'%'))
    and (nullif(trim(p_smoking),'') is null or lower(d.smoking)=lower(trim(p_smoking))) and (nullif(trim(p_drinking),'') is null or lower(d.drinking)=lower(trim(p_drinking)))
    and (nullif(trim(p_children),'') is null or lower(d.children)=lower(trim(p_children))) and (nullif(trim(p_education),'') is null or lower(d.education) like '%'||lower(trim(p_education))||'%')
    and (p_height_min is null or d.height_cm is null or d.height_cm>=p_height_min) and (p_height_max is null or d.height_cm is null or d.height_cm<=p_height_max)
    and (nullif(trim(p_zodiac),'') is null or lower(d.zodiac)=lower(trim(p_zodiac)));
  return result;
end $$;

do $$ declare r record; begin
  for r in select p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('register_dating_profile_secure','update_profile_completion_secure','get_dating_discovery_secure')
  loop
    execute format('revoke all on function public.%I(%s) from public,anon',r.proname,r.args);
    execute format('grant execute on function public.%I(%s) to authenticated',r.proname,r.args);
  end loop;
end $$;

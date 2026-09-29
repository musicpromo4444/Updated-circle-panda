-- Dating discovery: return only card-safe fields and apply private filters inside the database.

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
set search_path to public, pg_temp
as $function$
declare
  uid uuid:=auth.uid();
  my_country text:='';
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_age_min < 18 or p_age_max < p_age_min then raise exception 'Invalid age range'; end if;

  select coalesce(country,'') into my_country
  from public.dating_profiles where user_id=uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',d.user_id,'name',d.name,'age',d.age,'vibe',d.vibe,'emoji',d.emoji,'bio',d.bio,
    'interests',d.interests,'country',d.country,'gender',d.gender,'relationship_goal',d.relationship_goal,
    'looking_for',d.looking_for,'lifestyle',d.lifestyle,'personality',d.personality,'love_language',d.love_language,
    'smoking',d.smoking,'drinking',d.drinking,'children',d.children,'education',d.education,'occupation',d.occupation,
    'sexual_experience',d.sexual_experience,'intimacy_preference',d.intimacy_preference,
    'relationship_status',d.relationship_status,'height_cm',d.height_cm,'zodiac',d.zodiac,
    'favorite_date',d.favorite_date,'photo_path',d.photo_path,'blurred_photo_path',d.blurred_photo_path,
    'updated_at',d.updated_at
  ) order by d.updated_at desc),'[]'::jsonb)
  into result
  from public.dating_profiles d
  where d.enabled=true and d.user_id<>uid
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
end $function$;

revoke execute on function public.get_dating_discovery_secure(integer,integer,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) from anon, public;
grant execute on function public.get_dating_discovery_secure(integer,integer,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) to authenticated;
-- Circle Panda quick fixes: locked account gender, profile completion fields,
-- profile post counts, and Secret Profile reactions/comments.

alter table public.profiles add column if not exists address_line text;

create or replace function public.set_profile_gender_secure(p_gender text)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); existing text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_gender not in ('male','female') then raise exception 'Choose male or female'; end if;
  select gender into existing from public.profiles where id=uid for update;
  if existing is not null then
    if existing <> p_gender then raise exception 'Account gender is locked and cannot be changed'; end if;
    return existing;
  end if;
  update public.profiles set gender=p_gender,updated_at=now() where id=uid;
  if not found then raise exception 'Profile not found'; end if;
  return p_gender;
end;
$$;
revoke all on function public.set_profile_gender_secure(text) from public,anon;
grant execute on function public.set_profile_gender_secure(text) to authenticated;

create or replace function public.update_profile_completion_secure(
  p_country text default null,
  p_state_province text default null,
  p_city text default null,
  p_area text default null,
  p_address_line text default null
)
returns public.profiles
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); result public.profiles;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  update public.profiles
  set country=nullif(trim(coalesce(p_country,'')), ''),
      state_province=nullif(trim(coalesce(p_state_province,'')), ''),
      city=nullif(trim(coalesce(p_city,'')), ''),
      area=nullif(trim(coalesce(p_area,'')), ''),
      address_line=nullif(trim(coalesce(p_address_line,'')), ''),
      updated_at=now()
  where id=uid
  returning * into result;
  if result.id is null then raise exception 'Profile not found'; end if;
  return result;
end;
$$;
revoke all on function public.update_profile_completion_secure(text,text,text,text,text) from public,anon;
grant execute on function public.update_profile_completion_secure(text,text,text,text,text) to authenticated;

-- Secret Profile interactions.
create table if not exists public.profile_secret_reactions (
  secret_id uuid not null references public.profile_secrets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','laugh','wow','sad','angry','panda')),
  created_at timestamptz not null default now(),
  primary key(secret_id,user_id)
);
alter table public.profile_secret_reactions enable row level security;
drop policy if exists profile_secret_reactions_public_read on public.profile_secret_reactions;
create policy profile_secret_reactions_public_read on public.profile_secret_reactions for select using (true);
revoke all on public.profile_secret_reactions from anon,authenticated;
grant select on public.profile_secret_reactions to anon,authenticated;

create table if not exists public.profile_secret_comments (
  id uuid primary key default gen_random_uuid(),
  secret_id uuid not null references public.profile_secrets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.profile_secret_comments enable row level security;
drop policy if exists profile_secret_comments_public_read on public.profile_secret_comments;
create policy profile_secret_comments_public_read on public.profile_secret_comments for select using (true);
revoke all on public.profile_secret_comments from anon,authenticated;
grant select on public.profile_secret_comments to anon,authenticated;

create or replace function public.get_profile_secret_interactions(p_secret_ids uuid[])
returns table(secret_id uuid,reaction text,reaction_count bigint,comment_count bigint,heart_count bigint,laugh_count bigint,wow_count bigint,sad_count bigint,angry_count bigint,panda_count bigint)
language sql
security definer
set search_path=public,pg_temp
as $$
  select s.id,
    (select r.reaction from public.profile_secret_reactions r where r.secret_id=s.id and r.user_id=auth.uid() limit 1),
    count(r.*),
    (select count(*) from public.profile_secret_comments c where c.secret_id=s.id),
    count(r.*) filter(where r.reaction='heart'),
    count(r.*) filter(where r.reaction='laugh'),
    count(r.*) filter(where r.reaction='wow'),
    count(r.*) filter(where r.reaction='sad'),
    count(r.*) filter(where r.reaction='angry'),
    count(r.*) filter(where r.reaction='panda')
  from unnest(p_secret_ids) s(id)
  left join public.profile_secret_reactions r on r.secret_id=s.id
  group by s.id;
$$;
revoke all on function public.get_profile_secret_interactions(uuid[]) from public;
grant execute on function public.get_profile_secret_interactions(uuid[]) to anon,authenticated;

create or replace function public.react_to_profile_secret_secure(p_secret_id uuid,p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); current text;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
  if p_reaction not in ('heart','laugh','wow','sad','angry','panda') then raise exception 'Invalid reaction'; end if;
  select reaction into current from public.profile_secret_reactions where secret_id=p_secret_id and user_id=uid;
  if current=p_reaction then
    delete from public.profile_secret_reactions where secret_id=p_secret_id and user_id=uid;
    return jsonb_build_object('reaction',null);
  end if;
  insert into public.profile_secret_reactions(secret_id,user_id,reaction)
  values(p_secret_id,uid,p_reaction)
  on conflict(secret_id,user_id) do update set reaction=excluded.reaction,created_at=now();
  return jsonb_build_object('reaction',p_reaction);
end;
$$;
revoke all on function public.react_to_profile_secret_secure(uuid,text) from public,anon;
grant execute on function public.react_to_profile_secret_secure(uuid,text) to authenticated;

create or replace function public.get_profile_secret_comments(p_secret_id uuid)
returns table(id uuid,author_id uuid,body text,created_at timestamptz)
language sql security definer
set search_path=public,pg_temp
as $$
  select id,author_id,body,created_at from public.profile_secret_comments
  where secret_id=p_secret_id order by created_at asc;
$$;
revoke all on function public.get_profile_secret_comments(uuid) from public;
grant execute on function public.get_profile_secret_comments(uuid) to anon,authenticated;

create or replace function public.add_profile_secret_comment_secure(p_secret_id uuid,p_body text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); cid uuid;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profile_secrets where id=p_secret_id and is_published=true) then raise exception 'Secret not found'; end if;
  if char_length(trim(coalesce(p_body,'')))<1 or char_length(trim(p_body))>1000 then raise exception 'Comment must be 1-1000 characters'; end if;
  insert into public.profile_secret_comments(secret_id,author_id,body) values(p_secret_id,uid,trim(p_body)) returning id into cid;
  return cid;
end;
$$;
revoke all on function public.add_profile_secret_comment_secure(uuid,text) from public,anon;
grant execute on function public.add_profile_secret_comment_secure(uuid,text) to authenticated;

-- Make the existing crush submission RPC use the locked profile gender.
create or replace function public.submit_crush_media_secure(p_media_url text,p_media_type text,p_caption text,p_emoji text default '🐼')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); gender text; kind text; nid uuid; wk date:=date_trunc('week',current_date)::date;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select p.gender into gender from public.profiles p where p.id=uid;
 if gender is null then raise exception 'Choose your account gender before posting to MCM/WCW'; end if;
 kind:=case when gender='male' then 'mcm' else 'wcw' end;
 if p_media_type not in ('image','video') then raise exception 'Unsupported media type'; end if;
 if p_media_url is null or trim(p_media_url)='' or p_media_url not like '%'||uid::text||'%' then raise exception 'Invalid Circle Panda media path'; end if;
 insert into public.crush_nominees(user_id,display_name,kind,blurb,emoji,week_start,media_url,media_type)
 values(uid,'Anonymous Panda',kind,trim(coalesce(p_caption,'')),coalesce(p_emoji,'🐼'),wk,trim(p_media_url),p_media_type)
 returning id into nid;
 return jsonb_build_object('id',nid,'kind',kind,'week_start',wk);
end;
$$;
revoke all on function public.submit_crush_media_secure(text,text,text,text) from public,anon;
grant execute on function public.submit_crush_media_secure(text,text,text,text) to authenticated;

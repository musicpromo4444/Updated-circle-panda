-- Canonical MCM/WCW submissions, reactions, comments, reports and creator deletion.
create table if not exists public.crush_nominees (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null, kind text not null check(kind in ('mcm','wcw')), emoji text not null default '🐼',
 blurb text not null default '', media_url text not null, media_type text not null default 'image' check(media_type in ('image','video')),
 week_start date not null, cycle_id uuid references public.crush_cycles(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists crush_nominees_cycle_idx on public.crush_nominees(cycle_id,kind,created_at desc);
create table if not exists public.crush_reactions (
 nominee_id uuid not null references public.crush_nominees(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('🐼','❤️','👍','⚡','🌧️')), created_at timestamptz not null default now(),
 primary key(nominee_id,user_id)
);
create table if not exists public.crush_comments (
 id uuid primary key default gen_random_uuid(), nominee_id uuid not null references public.crush_nominees(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, body text not null check(char_length(trim(body)) between 1 and 1000), created_at timestamptz not null default now()
);
create table if not exists public.crush_reports (
 id uuid primary key default gen_random_uuid(), nominee_id uuid not null references public.crush_nominees(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade, reason text not null check(char_length(trim(reason)) between 1 and 500), created_at timestamptz not null default now()
);
create table if not exists public.crush_vote_ad_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 nominee_id uuid not null references public.crush_nominees(id) on delete cascade,
 status text not null default 'started' check(status in ('started','completed','expired')), started_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.crush_nominees enable row level security;
alter table public.crush_reactions enable row level security;
alter table public.crush_comments enable row level security;
alter table public.crush_reports enable row level security;
alter table public.crush_vote_ad_sessions enable row level security;
do $$ begin
 create policy crush_nominees_public_read on public.crush_nominees for select using(true);
 create policy crush_reactions_public_read on public.crush_reactions for select using(true);
 create policy crush_comments_public_read on public.crush_comments for select using(true);
 create policy crush_reports_owner_read on public.crush_reports for select using(auth.uid()=reporter_id);
 create policy crush_nominees_owner_delete on public.crush_nominees for delete using(auth.uid()=user_id);
 create policy crush_vote_sessions_owner_read on public.crush_vote_ad_sessions for select using(auth.uid()=user_id);
exception when duplicate_object then null; end $$;

create or replace function public.ensure_crush_cycle(p_kind text,p_week_start date)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_start timestamptz; v_end timestamptz;
begin
 if p_kind not in ('mcm','wcw') then raise exception 'INVALID_CRUSH_KIND'; end if;
 v_start:=p_week_start::timestamptz+interval '10 hours'; v_end:=v_start+interval '7 days';
 select id into v_id from public.crush_cycles where kind=p_kind and starts_at=v_start limit 1;
 if v_id is null then insert into public.crush_cycles(kind,starts_at,ends_at,status) values(p_kind,v_start,v_end,'open') returning id into v_id; end if;
 return v_id;
end $$;

create or replace function public.submit_crush_media_secure(p_media_url text,p_media_type text,p_caption text default '',p_emoji text default '🐼')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_gender text; v_kind text; v_week date; v_cycle uuid; v_id uuid; v_name text;
begin
 if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
 if p_media_type not in ('image','video') then raise exception 'INVALID_MEDIA_TYPE'; end if;
 if p_media_url is null or length(trim(p_media_url))<1 then raise exception 'MEDIA_REQUIRED'; end if;
 if p_emoji not in ('🐼','❤️','🔥','✨','😍','🌸') then raise exception 'INVALID_EMOJI'; end if;
 select gender into v_gender from public.profiles where id=v_uid;
 if v_gender not in ('male','female') then raise exception 'PROFILE_GENDER_REQUIRED'; end if;
 v_kind:=case when v_gender='male' then 'mcm' else 'wcw' end; v_week:=date_trunc('week',now())::date; v_cycle:=public.ensure_crush_cycle(v_kind,v_week);
 if not exists(select 1 from public.crush_cycles where id=v_cycle and status='open' and now() between starts_at and ends_at) then raise exception 'CRUSH_SUBMISSION_CLOSED'; end if;
 if exists(select 1 from public.crush_nominees where user_id=v_uid and cycle_id=v_cycle) then raise exception 'ALREADY_SUBMITTED_THIS_ROUND'; end if;
 select coalesce(display_name,username,'Anonymous Panda') into v_name from public.profiles where id=v_uid;
 insert into public.crush_nominees(user_id,display_name,kind,emoji,blurb,media_url,media_type,week_start,cycle_id) values(v_uid,v_name,v_kind,p_emoji,coalesce(trim(p_caption),''),p_media_url,p_media_type,v_week,v_cycle) returning id into v_id;
 return v_id;
end $$;

create or replace function public.get_crush_results(p_week_start date)
returns table(nominee_id uuid,user_id uuid,display_name text,kind text,emoji text,blurb text,media_url text,media_type text,week_start date,vote_count bigint,mine boolean)
language sql security definer set search_path=public,pg_temp as $$
select n.id,n.user_id,n.display_name,n.kind,n.emoji,n.blurb,n.media_url,n.media_type,n.week_start,count(v.nominee_id)::bigint,coalesce(bool_or(v.voter_id=auth.uid()),false)
from public.crush_nominees n left join public.crush_votes v on v.nominee_id=n.id
where n.week_start=p_week_start group by n.id,n.user_id,n.display_name,n.kind,n.emoji,n.blurb,n.media_url,n.media_type,n.week_start,n.created_at order by count(v.nominee_id) desc,n.created_at asc;
$$;

create or replace function public.get_crush_reactions(p_nominee_id uuid)
returns table(reaction text,reaction_count bigint,mine boolean) language sql security definer set search_path=public,pg_temp as $$
select r.reaction,count(*)::bigint,coalesce(bool_or(r.user_id=auth.uid()),false) from public.crush_reactions r where r.nominee_id=p_nominee_id group by r.reaction order by count(*) desc;
$$;

create or replace function public.react_to_crush_secure(p_nominee_id uuid,p_reaction text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if; if p_reaction not in ('🐼','❤️','👍','⚡','🌧️') then raise exception 'INVALID_REACTION'; end if;
if not exists(select 1 from public.crush_nominees where id=p_nominee_id) then raise exception 'NOMINEE_NOT_FOUND'; end if;
insert into public.crush_reactions(nominee_id,user_id,reaction) values(p_nominee_id,auth.uid(),p_reaction) on conflict(nominee_id,user_id) do update set reaction=excluded.reaction; return true; end $$;

create or replace function public.add_crush_comment_secure(p_nominee_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; begin if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if; if not exists(select 1 from public.crush_nominees where id=p_nominee_id) then raise exception 'NOMINEE_NOT_FOUND'; end if;
insert into public.crush_comments(nominee_id,user_id,body) values(p_nominee_id,auth.uid(),trim(p_body)) returning id into v_id; return v_id; end $$;

create or replace function public.report_crush_secure(p_nominee_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; begin if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
insert into public.crush_reports(nominee_id,reporter_id,reason) values(p_nominee_id,auth.uid(),trim(p_reason)) returning id into v_id; return v_id; end $$;

create or replace function public.delete_crush_submission(p_nominee_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_path text; v_user uuid;
begin if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select user_id,media_url into v_user,v_path from public.crush_nominees where id=p_nominee_id; if not found then raise exception 'NOMINEE_NOT_FOUND'; end if;
if v_user<>v_uid then raise exception 'NOT_CRUSH_OWNER'; end if;
delete from public.crush_nominees where id=p_nominee_id; return jsonb_build_object('deleted',true,'nominee_id',p_nominee_id,'media_url',v_path); end $$;

revoke all on function public.ensure_crush_cycle(text,date),public.submit_crush_media_secure(text,text,text,text),public.get_crush_results(date),public.get_crush_reactions(uuid),public.react_to_crush_secure(uuid,text),public.add_crush_comment_secure(uuid,text),public.report_crush_secure(uuid,text),public.delete_crush_submission(uuid) from public,anon;
grant execute on function public.ensure_crush_cycle(text,date),public.submit_crush_media_secure(text,text,text,text),public.get_crush_results(date),public.get_crush_reactions(uuid),public.react_to_crush_secure(uuid,text),public.add_crush_comment_secure(uuid,text),public.report_crush_secure(uuid,text),public.delete_crush_submission(uuid) to authenticated;
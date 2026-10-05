drop function if exists public.add_crush_comment_secure(uuid,text);
drop function if exists public.report_crush_secure(uuid,text);
create or replace function public.get_my_profile_gender() returns text language sql security invoker set search_path=public,pg_temp as $$ select gender from public.profiles where id=auth.uid() $$;
create or replace function public.get_crush_results(p_week_start date)
returns table(nominee_id uuid,user_id uuid,display_name text,kind text,emoji text,blurb text,media_url text,media_type text,week_start date,vote_count bigint,mine boolean)
language sql security invoker set search_path=public,pg_temp as $$
select n.id,n.user_id,n.display_name,n.kind,n.emoji,n.blurb,n.media_url,n.media_type,n.week_start,count(v.nominee_id)::bigint,coalesce(bool_or(v.voter_id=auth.uid()),false)
from public.crush_nominees n left join public.crush_votes v on v.nominee_id=n.id where n.week_start=p_week_start
group by n.id,n.user_id,n.display_name,n.kind,n.emoji,n.blurb,n.media_url,n.media_type,n.week_start,n.created_at order by count(v.nominee_id) desc,n.created_at asc; $$;
create or replace function public.get_crush_reactions(p_nominee_id uuid)
returns table(reaction text,reaction_count bigint,mine boolean) language sql security invoker set search_path=public,pg_temp as $$
select r.reaction,count(*)::bigint,coalesce(bool_or(r.user_id=auth.uid()),false) from public.crush_reactions r where r.nominee_id=p_nominee_id group by r.reaction order by count(*) desc; $$;
revoke all on function public.ensure_crush_cycle(text,date) from public,anon,authenticated;
revoke all on function public.get_crush_results(date),public.get_crush_reactions(uuid) from public,anon;
grant execute on function public.get_crush_results(date),public.get_crush_reactions(uuid) to anon,authenticated;
revoke all on function public.get_my_profile_gender() from public,anon;
grant execute on function public.get_my_profile_gender() to authenticated;
revoke all on function public.add_crush_comment_secure(uuid,text,text,text),public.react_to_crush_secure(uuid,text),public.report_crush_secure(uuid,text,text),public.cast_crush_vote_secure(uuid),public.start_crush_vote_ad_secure(),public.complete_crush_vote_ad_secure(uuid),public.submit_crush_media_secure(text,text,text,text),public.delete_crush_submission(uuid),public.set_profile_gender_secure(text),public.vote_crush(uuid,uuid) from public,anon;
grant execute on function public.add_crush_comment_secure(uuid,text,text,text),public.react_to_crush_secure(uuid,text),public.report_crush_secure(uuid,text,text),public.cast_crush_vote_secure(uuid),public.start_crush_vote_ad_secure(),public.complete_crush_vote_ad_secure(uuid),public.submit_crush_media_secure(text,text,text,text),public.delete_crush_submission(uuid),public.set_profile_gender_secure(text),public.vote_crush(uuid,uuid) to authenticated;
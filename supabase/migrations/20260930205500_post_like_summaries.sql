create or replace function public.get_post_like_summaries(p_post_ids uuid[])
returns table(post_id uuid,like_count bigint,liked boolean)
language sql security definer set search_path=public,pg_temp as $$
  select p.id,count(r.user_id)::bigint,(count(r.user_id) filter(where r.user_id=auth.uid())>0)
  from unnest(p_post_ids) ids(id)
  join public.cp_posts p on p.id=ids.id
  left join public.cp_post_reactions r on r.post_id=p.id
  group by p.id
$$;
revoke all on function public.get_post_like_summaries(uuid[]) from public,anon;
grant execute on function public.get_post_like_summaries(uuid[]) to authenticated;

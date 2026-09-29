create or replace function public.get_hot_seat_question_vote_counts(p_host_id uuid)
returns table(question_id uuid, vote_count bigint)
language sql security definer set search_path=''
as $$
  select q.id, count(v.user_id)::bigint
  from public.hot_seat_questions q
  left join public.hot_seat_question_votes v on v.question_id=q.id
  where q.host_id=p_host_id
    and exists(select 1 from public.hot_seat_hosts h where h.id=p_host_id and h.is_active=true and h.ends_at>now())
  group by q.id
$$;

revoke all on function public.get_hot_seat_question_vote_counts(uuid) from public,anon;
grant execute on function public.get_hot_seat_question_vote_counts(uuid) to authenticated;

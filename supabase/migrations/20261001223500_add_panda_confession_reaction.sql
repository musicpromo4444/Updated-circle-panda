alter table public.confession_reactions drop constraint if exists confession_reactions_reaction_check;
alter table public.confession_reactions add constraint confession_reactions_reaction_check check (reaction in ('heart','laugh','wow','angry','panda'));

create or replace function public.react_to_confession_secure(p_confession_id uuid,p_reaction text)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); current_reaction text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if p_reaction not in ('heart','laugh','wow','angry','panda') then raise exception 'Invalid reaction'; end if;
 select reaction into current_reaction from public.confession_reactions where confession_id=p_confession_id and user_id=uid;
 if current_reaction=p_reaction then
   delete from public.confession_reactions where confession_id=p_confession_id and user_id=uid;
   return jsonb_build_object('reaction',null);
 end if;
 insert into public.confession_reactions(confession_id,user_id,reaction) values(p_confession_id,uid,p_reaction)
 on conflict (confession_id,user_id) do update set reaction=excluded.reaction,created_at=now();
 return jsonb_build_object('reaction',p_reaction);
end;
$function$;

create or replace function public.get_confession_reaction_state(p_confession_ids uuid[])
returns table(confession_id uuid,reaction text,heart_count bigint,laugh_count bigint,wow_count bigint,angry_count bigint,panda_count bigint)
language sql security definer set search_path='public','pg_temp'
as $function$
 select c.id,
   (select cr.reaction from public.confession_reactions cr where cr.confession_id=c.id and cr.user_id=auth.uid() limit 1),
   count(*) filter(where r.reaction='heart'),
   count(*) filter(where r.reaction='laugh'),
   count(*) filter(where r.reaction='wow'),
   count(*) filter(where r.reaction='angry'),
   count(*) filter(where r.reaction='panda')
 from unnest(p_confession_ids) c(id)
 left join public.confession_reactions r on r.confession_id=c.id
 group by c.id;
$function$;
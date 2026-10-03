-- Circle Panda group chat: WhatsApp-style replies and reactions.
alter table public.cp_group_messages
  add column if not exists reply_to_id uuid references public.cp_group_messages(id) on delete set null;

create table if not exists public.cp_group_message_reactions (
  message_id uuid not null references public.cp_group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);

create index if not exists cp_group_message_reactions_message_idx
  on public.cp_group_message_reactions(message_id);

alter table public.cp_group_message_reactions enable row level security;

drop policy if exists "group message reactions members read" on public.cp_group_message_reactions;
create policy "group message reactions members read"
on public.cp_group_message_reactions for select to authenticated
using (
  exists (
    select 1 from public.cp_group_messages m
    join public.group_members gm on gm.group_id=m.group_id
    where m.id=message_id and gm.user_id=auth.uid() and gm.left_at is null
  )
);

drop policy if exists "group message reactions own insert" on public.cp_group_message_reactions;
create policy "group message reactions own insert"
on public.cp_group_message_reactions for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "group message reactions own update" on public.cp_group_message_reactions;
create policy "group message reactions own update"
on public.cp_group_message_reactions for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "group message reactions own delete" on public.cp_group_message_reactions;
create policy "group message reactions own delete"
on public.cp_group_message_reactions for delete to authenticated
using (user_id=auth.uid());

create or replace function public.send_group_message_secure(p_group_id uuid, p_body text, p_reply_to_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); mid uuid; allowed boolean:=true;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 select coalesce(gs.send_messages,true) into allowed from public.group_settings gs where gs.group_id=p_group_id;
 if not allowed and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
 if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id where g.id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null and coalesce(g.expires_at,now()+interval '1 second')>now()) then raise exception 'Group is not active'; end if;
 if length(trim(p_body))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
 if p_reply_to_id is not null and not exists(select 1 from public.cp_group_messages m where m.id=p_reply_to_id and m.group_id=p_group_id) then raise exception 'Invalid reply target'; end if;
 insert into public.cp_group_messages(group_id,user_id,body,reply_to_id) values(p_group_id,uid,trim(p_body),p_reply_to_id) returning id into mid;
 perform public.apply_bc_delta(uid,-1,'Group message','group_message',mid);
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',1,'reply_to_id',p_reply_to_id);
end $function$;

revoke all on function public.send_group_message_secure(uuid,text,uuid) from public;
grant execute on function public.send_group_message_secure(uuid,text,uuid) to authenticated;

create or replace function public.toggle_group_message_reaction(p_message_id uuid,p_reaction text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); current_reaction text;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if p_reaction not in ('❤️','😂','👍','😮','😢','🔥') then raise exception 'Invalid reaction'; end if;
 if not exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id where m.id=p_message_id and gm.user_id=uid and gm.left_at is null) then raise exception 'Not a group member'; end if;
 select reaction into current_reaction from public.cp_group_message_reactions where message_id=p_message_id and user_id=uid;
 if current_reaction=p_reaction then
   delete from public.cp_group_message_reactions where message_id=p_message_id and user_id=uid;
   return jsonb_build_object('reaction',null);
 end if;
 insert into public.cp_group_message_reactions(message_id,user_id,reaction) values(p_message_id,uid,p_reaction)
 on conflict(message_id,user_id) do update set reaction=excluded.reaction,created_at=now();
 return jsonb_build_object('reaction',p_reaction);
end $function$;

revoke all on function public.toggle_group_message_reaction(uuid,text) from public;
grant execute on function public.toggle_group_message_reaction(uuid,text) to authenticated;

-- Scope VIP call availability per VIP room, not across all VIP rooms.
alter table public.cp_vip_group_call_views add column if not exists group_id uuid references public.cp_vip_group_rooms(id) on delete cascade;
update public.cp_vip_group_call_views v set group_id=r.id from public.cp_vip_group_rooms r where v.group_id is null and r.is_worldwide=true;
alter table public.cp_vip_group_call_views drop constraint if exists cp_vip_group_call_views_pkey;
alter table public.cp_vip_group_call_views add primary key(user_id,group_id);
create index if not exists cp_vip_group_call_views_group_idx on public.cp_vip_group_call_views(group_id);

drop function if exists public.get_vip_group_call_runtime();
create or replace function public.get_vip_group_call_runtime(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); cfg record; last_shown timestamptz; room_country text; user_country text;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 select p.country into user_country from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now());
 if not found then return jsonb_build_object('show',false,'reason','vip_required'); end if;
 select r.country into room_country from public.cp_vip_group_rooms r where r.id=p_group_id and r.enabled=true;
 if not found or (room_country is not null and lower(room_country)<>lower(user_country)) then return jsonb_build_object('show',false,'reason','group_access_denied'); end if;
 select c.* into cfg from public.cp_vip_group_call_config c where c.id=1;
 if cfg is null or not cfg.enabled then return jsonb_build_object('show',false,'reason','disabled'); end if;
 select v.last_shown_at into last_shown from public.cp_vip_group_call_views v where v.user_id=uid and v.group_id=p_group_id;
 if last_shown is null then
   if now() < cfg.updated_at + make_interval(hours=>cfg.popup_after_hours) then return jsonb_build_object('show',false,'reason','scheduled'); end if;
 else
   if now() < last_shown + make_interval(hours=>cfg.repeat_every_hours) then return jsonb_build_object('show',false,'reason','cooldown'); end if;
 end if;
 insert into public.cp_vip_group_call_views(user_id,group_id,last_shown_at) values(uid,p_group_id,now())
 on conflict(user_id,group_id) do update set last_shown_at=excluded.last_shown_at;
 return jsonb_build_object('show',true,'voice_enabled',cfg.voice_enabled,'video_enabled',cfg.video_enabled,'repeat_every_hours',cfg.repeat_every_hours);
end; $$;
revoke execute on function public.get_vip_group_call_runtime(uuid) from public,anon;
grant execute on function public.get_vip_group_call_runtime(uuid) to authenticated;
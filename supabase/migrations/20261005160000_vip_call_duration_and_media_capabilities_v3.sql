alter table public.cp_vip_group_call_config add column if not exists initial_call_minutes integer not null default 20;
alter table public.cp_vip_group_call_config add constraint cp_vip_group_call_config_initial_minutes_check check(initial_call_minutes between 1 and 240);

create or replace function public.admin_save_vip_group_call_config_v3(p_enabled boolean,p_voice_enabled boolean,p_video_enabled boolean,p_popup_after_hours integer,p_repeat_every_hours integer,p_local_start_hour smallint,p_local_end_hour smallint,p_country_mode text,p_initial_call_minutes integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_popup_after_hours<0 or p_repeat_every_hours<1 then raise exception 'Invalid popup schedule'; end if;
 if p_local_start_hour is not null and (p_local_start_hour<0 or p_local_start_hour>23) then raise exception 'Invalid start hour'; end if;
 if p_local_end_hour is not null and (p_local_end_hour<0 or p_local_end_hour>23) then raise exception 'Invalid end hour'; end if;
 if p_country_mode not in ('room','user','worldwide') then raise exception 'Invalid country mode'; end if;
 if p_initial_call_minutes<1 or p_initial_call_minutes>240 then raise exception 'Invalid initial call duration'; end if;
 insert into public.cp_vip_group_call_config(id,enabled,voice_enabled,video_enabled,popup_after_hours,repeat_every_hours,local_start_hour,local_end_hour,country_mode,initial_call_minutes,updated_at,updated_by)
 values(1,p_enabled,p_voice_enabled,p_video_enabled,p_popup_after_hours,p_repeat_every_hours,p_local_start_hour,p_local_end_hour,p_country_mode,p_initial_call_minutes,now(),uid)
 on conflict(id) do update set enabled=excluded.enabled,voice_enabled=excluded.voice_enabled,video_enabled=excluded.video_enabled,popup_after_hours=excluded.popup_after_hours,repeat_every_hours=excluded.repeat_every_hours,local_start_hour=excluded.local_start_hour,local_end_hour=excluded.local_end_hour,country_mode=excluded.country_mode,initial_call_minutes=excluded.initial_call_minutes,updated_at=now(),updated_by=uid;
 return jsonb_build_object('saved',true,'initial_call_minutes',p_initial_call_minutes);
end $$;

create or replace function public.start_vip_group_call_secure(p_group_id uuid,p_call_type text,p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); sid uuid; target_country text; caller_country text; cfg record; prompt jsonb; initial_minutes integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_call_type not in ('voice','video') then raise exception 'Invalid call type'; end if;
 select p.country into caller_country from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now());
 if not found then raise exception 'Active VIP required'; end if;
 select p.country into target_country from public.profiles p where p.id=p_target_user_id and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now());
 if not found then raise exception 'Target VIP is not active'; end if;
 if uid=p_target_user_id then raise exception 'You cannot call yourself'; end if;
 if not exists(select 1 from public.cp_vip_group_rooms r where r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(caller_country)) and (r.is_worldwide=true or lower(r.country)=lower(target_country))) then raise exception 'VIP group access denied'; end if;
 select * into cfg from public.cp_vip_group_call_config where id=1;
 if cfg is null or not cfg.enabled then raise exception 'VIP group calls are disabled'; end if;
 if p_call_type='voice' and not cfg.voice_enabled then raise exception 'VIP voice calls are disabled'; end if;
 if p_call_type='video' and not cfg.video_enabled then raise exception 'VIP video calls are disabled'; end if;
 prompt:=public.get_vip_group_call_prompt(p_group_id);
 if coalesce((prompt->>'show')::boolean,false)=false then raise exception 'VIP group call is not available right now'; end if;
 initial_minutes:=greatest(1,coalesce(cfg.initial_call_minutes,20));
 insert into public.cp_vip_group_call_sessions(group_id,call_type,created_by,first_window_ends_at) values(p_group_id,p_call_type,uid,now()+(initial_minutes||' minutes')::interval) returning id into sid;
 insert into public.cp_vip_group_call_participants(session_id,user_id,accepted) values(sid,uid,true),(sid,p_target_user_id,false);
 return jsonb_build_object('session_id',sid,'status','ringing','first_window_minutes',initial_minutes,'ad_after_first_window',true,'unlimited_after_ad',true);
end $$;

create or replace function public.get_vip_group_capabilities()
returns jsonb language sql set search_path=public as $$
select jsonb_build_object('is_vip',coalesce(p.is_vip,false) and (p.vip_expires_at is null or p.vip_expires_at>now()),'media_view_once',true,'giveaways',false,'vip_to_vip_calls',true,'group_call_prompt',true,'continuation_after_initial_window_requires_ad',true)
from public.profiles p where p.id=(select auth.uid());
$$;

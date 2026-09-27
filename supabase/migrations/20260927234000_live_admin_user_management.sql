
create or replace function public.admin_list_users()
returns table(id uuid,username text,avatar text,platform text,coins bigint,streak integer,status text,joined_date date,last_active timestamptz,reputation bigint,email text)
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
 return query
 select u.id,
        coalesce(p.display_name,'Anonymous Panda'),
        coalesce(nullif(p.avatar_url,''),'🐼'),
        case when coalesce((s.state->>'platform'),'') in ('android_webview','web_browser') then s.state->>'platform' else 'web_browser' end,
        coalesce(b.balance,0),
        coalesce(d.streak,0),
        case when coalesce(c.is_banned,false) then 'banned' else 'active' end,
        (u.created_at at time zone 'utc')::date,
        u.last_sign_in_at,
        coalesce(x.xp,0),
        u.email
 from auth.users u
 left join public.profiles p on p.id=u.id
 left join public.bc_accounts b on b.user_id=u.id
 left join public.user_daily_rewards d on d.user_id=u.id
 left join public.user_controls c on c.user_id=u.id
 left join public.user_app_state s on s.user_id=u.id
 left join public.user_xp x on x.user_id=u.id
 order by u.created_at desc;
end $$;

create or replace function public.admin_adjust_user_bc(p_user_id uuid,p_amount bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
 if p_amount=0 then raise exception 'Amount cannot be zero'; end if;
 perform public.apply_bc_delta(p_user_id,p_amount,'Admin: '||coalesce(nullif(trim(p_reason),''),'manual adjustment'),'admin_adjustment');
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(auth.uid(),'ADMIN_ADJUST_BC',p_user_id,jsonb_build_object('amount',p_amount,'reason',p_reason));
 return jsonb_build_object('user_id',p_user_id,'amount',p_amount,'reason',p_reason);
end $$;

create or replace function public.admin_toggle_user_ban(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare next_banned boolean;
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
 select not coalesce(is_banned,false) into next_banned from public.user_controls where user_id=p_user_id;
 insert into public.user_controls(user_id,is_banned,updated_at) values(p_user_id,next_banned,now())
 on conflict(user_id) do update set is_banned=excluded.is_banned,updated_at=now();
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(auth.uid(),case when next_banned then 'BAN_USER' else 'UNBAN_USER' end,p_user_id,jsonb_build_object('is_banned',next_banned));
 return jsonb_build_object('is_banned',next_banned);
end $$;

create or replace function public.admin_reset_user_streak(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
 insert into public.user_daily_rewards(user_id,streak,last_claim_date,claimed_day,updated_at) values(p_user_id,1,null,null,now())
 on conflict(user_id) do update set streak=1,updated_at=now();
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(auth.uid(),'RESET_STREAK',p_user_id,jsonb_build_object('streak',1));
 return jsonb_build_object('streak',1);
end $$;

revoke execute on function public.admin_list_users() from public,anon;
revoke execute on function public.admin_adjust_user_bc(uuid,bigint,text) from public,anon;
revoke execute on function public.admin_toggle_user_ban(uuid) from public,anon;
revoke execute on function public.admin_reset_user_streak(uuid) from public,anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_adjust_user_bc(uuid,bigint,text) to authenticated;
grant execute on function public.admin_toggle_user_ban(uuid) to authenticated;
grant execute on function public.admin_reset_user_streak(uuid) to authenticated;

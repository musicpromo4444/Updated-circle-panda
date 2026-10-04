alter table public.app_settings add column if not exists android_app_url text not null default '', add column if not exists ios_app_url text not null default '';

create table if not exists public.cp_onboarding_rewards (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reward_bc bigint not null default 200,
 claimed_at timestamptz,
 download_prompt_next_at timestamptz,
 download_prompt_last_at timestamptz,
 download_dismissed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.cp_onboarding_rewards enable row level security;
drop policy if exists "onboarding reward own read" on public.cp_onboarding_rewards;
create policy "onboarding reward own read" on public.cp_onboarding_rewards for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.seed_new_user_onboarding_reward() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $function$
begin
 insert into public.cp_onboarding_rewards(user_id,reward_bc) values(new.id,200) on conflict(user_id) do nothing;
 return new;
end;$function$;

drop trigger if exists trg_seed_new_user_onboarding_reward on public.profiles;
create trigger trg_seed_new_user_onboarding_reward after insert on public.profiles for each row execute function public.seed_new_user_onboarding_reward();

insert into public.cp_onboarding_rewards(user_id,reward_bc,claimed_at)
select id,200,now() from auth.users on conflict(user_id) do nothing;

create or replace function public.claim_new_user_bc_reward() returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $function$
declare uid uuid:=auth.uid(); amount bigint; new_balance bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from public.admin_roles where user_id=uid and active=true) then
  update public.cp_onboarding_rewards set claimed_at=coalesce(claimed_at,now()),download_prompt_next_at=null,updated_at=now() where user_id=uid;
  return jsonb_build_object('claimed',true,'amount',0,'balance',0,'admin',true);
 end if;
 select reward_bc into amount from public.cp_onboarding_rewards where user_id=uid and claimed_at is null for update;
 if amount is null then select balance into new_balance from public.bc_accounts where user_id=uid; return jsonb_build_object('claimed',false,'amount',0,'balance',coalesce(new_balance,0),'admin',false); end if;
 new_balance:=public.apply_bc_delta(uid,amount,'New user welcome reward 200 BC','onboarding_reward',null);
 update public.cp_onboarding_rewards set claimed_at=now(),download_prompt_next_at=now()+interval '3 seconds',updated_at=now() where user_id=uid and claimed_at is null;
 return jsonb_build_object('claimed',true,'amount',amount,'balance',new_balance,'admin',false);
end;$function$;
revoke all on function public.claim_new_user_bc_reward() from public,anon;
grant execute on function public.claim_new_user_bc_reward() to authenticated;

create or replace function public.get_onboarding_reward_state() returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $function$
declare uid uuid:=auth.uid(); r public.cp_onboarding_rewards%rowtype; is_admin boolean;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into r from public.cp_onboarding_rewards where user_id=uid;
 select exists(select 1 from public.admin_roles where user_id=uid and active=true) into is_admin;
 return jsonb_build_object('eligible',coalesce(r.claimed_at is null,false) and not is_admin,'claimed',coalesce(r.claimed_at is not null,true),'next_download_prompt_at',r.download_prompt_next_at,'download_prompt_last_at',r.download_prompt_last_at,'download_dismissed',coalesce(r.download_dismissed,false),'admin',is_admin);
end;$function$;
revoke all on function public.get_onboarding_reward_state() from public,anon;
grant execute on function public.get_onboarding_reward_state() to authenticated;

create or replace function public.mark_app_download_prompt_shown() returns void language plpgsql security definer set search_path='public','pg_temp' as $function$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.cp_onboarding_rewards set download_prompt_last_at=now(),download_prompt_next_at=now()+interval '7 days',updated_at=now() where user_id=auth.uid() and claimed_at is not null;
end;$function$;
revoke all on function public.mark_app_download_prompt_shown() from public,anon;
grant execute on function public.mark_app_download_prompt_shown() to authenticated;

create or replace function public.dismiss_app_download_prompt() returns void language plpgsql security definer set search_path='public','pg_temp' as $function$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.cp_onboarding_rewards set download_dismissed=true,download_prompt_next_at=now()+interval '7 days',updated_at=now() where user_id=auth.uid() and claimed_at is not null;
end;$function$;
revoke all on function public.dismiss_app_download_prompt() from public,anon;
grant execute on function public.dismiss_app_download_prompt() to authenticated;

insert into public.admin_roles(user_id,role_kind,active,created_by) values('c987a9d5-86ff-41c1-b96d-f46ea45b92c9','owner',true,'c987a9d5-86ff-41c1-b96d-f46ea45b92c9') on conflict(user_id) do update set role_kind='owner',active=true,updated_at=now();
update public.profiles set is_vip=true,vip_expires_at=null where id='c987a9d5-86ff-41c1-b96d-f46ea45b92c9';
insert into public.bc_accounts(user_id,balance) values('c987a9d5-86ff-41c1-b96d-f46ea45b92c9',0) on conflict(user_id) do update set balance=0,updated_at=now();
update public.cp_onboarding_rewards set claimed_at=coalesce(claimed_at,now()),download_prompt_next_at=null,updated_at=now() where user_id='c987a9d5-86ff-41c1-b96d-f46ea45b92c9';

create or replace function private.apply_bc_delta(p_user_id uuid,p_amount bigint,p_reason text,p_reference_type text default null,p_reference_id uuid default null) returns bigint language plpgsql security definer set search_path='public' as $function$
declare v_balance bigint;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Not authorized'; end if;
 if p_amount=0 then raise exception 'Amount must not be zero'; end if;
 insert into public.bc_accounts(user_id,balance) values(p_user_id,0) on conflict(user_id) do nothing;
 if exists(select 1 from public.admin_roles where user_id=p_user_id and active=true) then select balance into v_balance from public.bc_accounts where user_id=p_user_id; return coalesce(v_balance,0); end if;
 update public.bc_accounts set balance=balance+p_amount,updated_at=now() where user_id=p_user_id and balance+p_amount>=0 returning balance into v_balance;
 if v_balance is null then raise exception 'Insufficient BC balance'; end if;
 insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(p_user_id,p_amount,p_reason,p_reference_type,p_reference_id);
 return v_balance;
end;$function$;
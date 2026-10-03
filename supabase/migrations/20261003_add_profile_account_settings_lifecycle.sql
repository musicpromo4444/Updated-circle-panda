alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','deactivated','pending_deletion')),
  add column if not exists deactivated_until timestamptz,
  add column if not exists deletion_scheduled_for timestamptz;

create index if not exists profiles_deletion_scheduled_for_idx on public.profiles (deletion_scheduled_for) where deletion_scheduled_for is not null;

create or replace function public.get_my_account_settings_secure() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.profiles%rowtype;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 update public.profiles set account_status='active',deactivated_until=null,updated_at=now()
 where id=auth.uid() and account_status='deactivated' and deactivated_until is not null and deactivated_until<=now();
 select * into p from public.profiles where id=auth.uid();
 return jsonb_build_object('status',coalesce(p.account_status,'active'),'deactivated_until',p.deactivated_until,'deletion_scheduled_for',p.deletion_scheduled_for,'is_vip',coalesce(p.is_vip,false),'vip_expires_at',p.vip_expires_at);
end; $$;

create or replace function public.deactivate_my_account_secure(p_resume_at timestamptz) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if p_resume_at is null or p_resume_at<=now() then raise exception 'Choose a future resume date and time'; end if;
 update public.profiles set account_status='deactivated',deactivated_until=p_resume_at,updated_at=now()
 where id=auth.uid() and coalesce(account_status,'active')<>'pending_deletion';
 select jsonb_build_object('status',account_status,'deactivated_until',deactivated_until) into result from public.profiles where id=auth.uid();
 return result;
end; $$;

create or replace function public.resume_my_account_secure() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 update public.profiles set account_status='active',deactivated_until=null,updated_at=now() where id=auth.uid() and account_status='deactivated';
 select jsonb_build_object('status',account_status,'deactivated_until',deactivated_until) into result from public.profiles where id=auth.uid();
 return result;
end; $$;

create or replace function public.request_account_deletion_secure() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 update public.profiles set account_status='pending_deletion',deletion_scheduled_for=now()+interval '30 days',deactivated_until=null,updated_at=now() where id=auth.uid();
 select jsonb_build_object('status',account_status,'deletion_scheduled_for',deletion_scheduled_for) into result from public.profiles where id=auth.uid();
 return result;
end; $$;

create or replace function public.cancel_account_deletion_secure() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 update public.profiles set account_status='active',deletion_scheduled_for=null,deactivated_until=null,updated_at=now() where id=auth.uid() and account_status='pending_deletion';
 select jsonb_build_object('status',account_status,'deletion_scheduled_for',deletion_scheduled_for) into result from public.profiles where id=auth.uid();
 return result;
end; $$;

create schema if not exists private;
create or replace function private.process_due_account_deletions() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid;
begin
 for uid in select id from public.profiles where account_status='pending_deletion' and deletion_scheduled_for is not null and deletion_scheduled_for<=now()
 loop delete from auth.users where id=uid; end loop;
end; $$;

revoke all on function public.get_my_account_settings_secure() from public,anon;
revoke all on function public.deactivate_my_account_secure(timestamptz) from public,anon;
revoke all on function public.resume_my_account_secure() from public,anon;
revoke all on function public.request_account_deletion_secure() from public,anon;
revoke all on function public.cancel_account_deletion_secure() from public,anon;
grant execute on function public.get_my_account_settings_secure() to authenticated;
grant execute on function public.deactivate_my_account_secure(timestamptz) to authenticated;
grant execute on function public.resume_my_account_secure() to authenticated;
grant execute on function public.request_account_deletion_secure() to authenticated;
grant execute on function public.cancel_account_deletion_secure() to authenticated;

select cron.schedule('circle-panda-account-deletion-cleanup','15 * * * *',$$select private.process_due_account_deletions();$$)
where not exists (select 1 from cron.job where jobname='circle-panda-account-deletion-cleanup');
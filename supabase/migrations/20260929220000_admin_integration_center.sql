create table if not exists public.cp_admin_integrations (
  key text primary key,
  label text not null,
  enabled boolean not null default false,
  public_config jsonb not null default '{}'::jsonb,
  secret_names jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.cp_admin_integrations enable row level security;
create or replace function public.cp_admin_is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.app_admins where user_id=auth.uid()); $$;
revoke all on function public.cp_admin_is_admin() from public;
grant execute on function public.cp_admin_is_admin() to authenticated;
create or replace function public.admin_get_integrations() returns jsonb language sql stable security definer set search_path=public as $$ select coalesce(jsonb_agg(jsonb_build_object('key',key,'label',label,'enabled',enabled,'public_config',public_config,'secret_configured',(select coalesce(jsonb_object_agg(k,true),'{}'::jsonb) from jsonb_object_keys(secret_names) as k),'updated_at',updated_at) order by label),'[]'::jsonb) from public.cp_admin_integrations where public.cp_admin_is_admin(); $$;
create or replace function public.admin_upsert_integration(p_key text,p_label text,p_enabled boolean,p_public_config jsonb default '{}'::jsonb,p_secrets jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,vault as $$
declare item record; secret_name text; secret_id uuid; names jsonb:='{}'::jsonb;
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 insert into public.cp_admin_integrations(key,label,enabled,public_config,updated_by) values(p_key,left(trim(p_label),100),coalesce(p_enabled,false),coalesce(p_public_config,'{}'::jsonb),auth.uid()) on conflict(key) do update set label=excluded.label,enabled=excluded.enabled,public_config=excluded.public_config,updated_at=now(),updated_by=auth.uid();
 for item in select key,value from jsonb_each_text(coalesce(p_secrets,'{}'::jsonb)) loop
  if trim(item.value)='' then continue; end if;
  secret_name:='circle_panda_'||p_key||'_'||item.key;
  select id into secret_id from vault.secrets where name=secret_name limit 1;
  if secret_id is null then secret_id:=vault.create_secret(item.value,secret_name,'Circle Panda Admin integration secret'); else perform vault.update_secret(secret_id,item.value,secret_name,'Circle Panda Admin integration secret'); end if;
  names:=names||jsonb_build_object(item.key,secret_name);
 end loop;
 if jsonb_typeof(coalesce(p_secrets,'{}'::jsonb))='object' and jsonb_object_length(coalesce(p_secrets,'{}'::jsonb))>0 then update public.cp_admin_integrations set secret_names=secret_names||names,updated_at=now(),updated_by=auth.uid() where key=p_key; end if;
 return (select jsonb_build_object('key',key,'label',label,'enabled',enabled,'public_config',public_config,'secret_configured',(select coalesce(jsonb_object_agg(k,true),'{}'::jsonb) from jsonb_object_keys(secret_names) as k),'updated_at',updated_at) from public.cp_admin_integrations where key=p_key);
end; $$;
revoke all on function public.admin_get_integrations() from public;
grant execute on function public.admin_get_integrations() to authenticated;
revoke all on function public.admin_upsert_integration(text,text,boolean,jsonb,jsonb) from public;
grant execute on function public.admin_upsert_integration(text,text,boolean,jsonb,jsonb) to authenticated;
insert into public.cp_admin_integrations(key,label,enabled,public_config) values
('youtube','YouTube',false,'{"client_id":"","channel_id":""}'),('spotify','Spotify',false,'{"client_id":"","redirect_uri":""}'),('zego','ZEGOCLOUD',false,'{"app_id":""}'),('aws_live','AWS Live Streaming',false,'{"region":"","distribution_id":""}'),('resend','Resend Email',false,'{"from_email":""}'),('analytics','Analytics',false,'{"measurement_id":"","site_id":""}') on conflict(key) do nothing;

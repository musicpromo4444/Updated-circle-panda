-- Admin RBAC: owner/delegated admins with least-privilege RPC enforcement.
-- Live migration: admin_rbac_and_delegated_permissions_v2
create table if not exists public.admin_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role_kind text not null check (role_kind in ('owner','delegated')),
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_permission_catalog (
 permission_key text primary key,label text not null,category text not null,description text not null default '',sensitive boolean not null default false,sort_order integer not null default 0
);
create table if not exists public.admin_permissions (
 user_id uuid not null references auth.users(id) on delete cascade,
 permission_key text not null references public.admin_permission_catalog(permission_key) on delete cascade,
 granted_by uuid references auth.users(id),created_at timestamptz not null default now(),
 primary key(user_id,permission_key)
);
create table if not exists public.admin_rpc_permission_map (
 function_name text primary key,permission_key text not null references public.admin_permission_catalog(permission_key) on delete restrict
);
alter table public.admin_roles enable row level security;
alter table public.admin_permission_catalog enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_rpc_permission_map enable row level security;
revoke all on public.admin_roles,public.admin_permission_catalog,public.admin_permissions,public.admin_rpc_permission_map from anon,authenticated;
grant select on public.admin_permission_catalog to authenticated;

insert into public.admin_permission_catalog(permission_key,label,category,description,sensitive,sort_order) values
('admin.manage','Manage administrators','Security','Create, remove and control other administrators. Only the owner can grant this.',true,10),
('security.api_keys','Manage API keys & integrations','Security','Configure provider credentials and integration settings. Secret values remain in Vault.',true,20),
('ads.manage','Manage advertising','Monetization','Create/edit ad creatives, placements, providers, links, targeting and schedules.',true,30),
('finance.payments','Manage payment providers','Finance','Configure payment providers and payment verification settings.',true,40),
('finance.billing','Manage billing & BC economy','Finance','Adjust BC, billing rules, store pricing and financial controls.',true,50),
('users.manage','Manage users','Users','Ban/unban users and perform administrative user actions.',false,60),
('content.manage','Manage content','Content','Moderate and manage community content, events and groups.',false,70),
('activities.manage','Manage activities & rewards','Activities','Configure daily activities, rewards, games and winner systems.',true,80),
('hotseat.manage','Manage Hot Seat','Live','Control Hot Seat sessions, hosts, providers and water-break content.',true,90),
('wcw_mcm.manage','Manage WCW & MCM','Community','Manage WCW/MCM schedules, voting and ads.',false,100),
('integrations.view','View integration status','Security','View integration configuration status without receiving secret values.',false,110),
('analytics.view','View analytics','Analytics','View operational and monetization analytics.',false,120)
on conflict(permission_key) do update set label=excluded.label,category=excluded.category,description=excluded.description,sensitive=excluded.sensitive,sort_order=excluded.sort_order;

insert into public.admin_permission_catalog(permission_key,label,category,description,sensitive,sort_order)
select 'rpc.'||p.proname,initcap(replace(regexp_replace(p.proname,'^admin_',''),'_',' ')),
 case when p.proname like '%integration%' or p.proname like '%provider%' then 'Security' when p.proname like '%ad%' then 'Monetization' when p.proname like '%payment%' or p.proname like '%billing%' or p.proname like '%bc%' or p.proname like '%store%' then 'Finance' when p.proname like '%user%' then 'Users' when p.proname like '%activity%' or p.proname like '%winner%' or p.proname like '%sweep%' then 'Activities' when p.proname like '%hot_seat%' or p.proname like '%live_stream%' then 'Live' when p.proname like '%crush%' or p.proname like '%wcw%' or p.proname like '%mcm%' then 'Community' else 'Administration' end,
 'Direct permission for this administrative operation.',case when p.proname like '%integration%' or p.proname like '%provider%' or p.proname like '%payment%' or p.proname like '%billing%' or p.proname like '%bc%' or p.proname like '%secret%' then true else false end,1000
from (select distinct proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'admin_%') p
on conflict(permission_key) do nothing;

insert into public.admin_rpc_permission_map(function_name,permission_key)
select p.proname,case when p.proname in ('admin_create_admin','admin_remove_admin','admin_set_admin_permissions','admin_get_admin_users','admin_get_admin_permissions','admin_get_permission_catalog') then 'admin.manage' when p.proname like '%integration%' or p.proname like '%hot_seat_provider%' then 'security.api_keys' when p.proname like '%payment%' then 'finance.payments' when p.proname like '%bc%' or p.proname like '%billing%' or p.proname like '%store%' then 'finance.billing' when p.proname like '%ad%' then 'ads.manage' when p.proname like '%user%' then 'users.manage' when p.proname like '%activity%' or p.proname like '%winner%' or p.proname like '%sweep%' or p.proname like '%daily_game%' then 'activities.manage' when p.proname like '%hot_seat%' or p.proname like '%live_stream%' then 'hotseat.manage' when p.proname like '%crush%' or p.proname like '%wcw%' or p.proname like '%mcm%' then 'wcw_mcm.manage' when p.proname like '%analytics%' then 'analytics.view' else 'content.manage' end
from (select distinct proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'admin_%') p
on conflict(function_name) do update set permission_key=excluded.permission_key;

create or replace function private.admin_is_owner(p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_roles where user_id=p_user_id and role_kind='owner' and active) or exists(select 1 from public.app_admins where user_id=p_user_id and not exists(select 1 from public.admin_roles where user_id=p_user_id and active));
$$;
create or replace function private.admin_can(p_permission text,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.admin_is_owner(p_user_id) or exists(select 1 from public.admin_permissions ap join public.admin_roles ar on ar.user_id=ap.user_id and ar.active where ap.user_id=p_user_id and ap.permission_key=p_permission);
$$;

create or replace function public.admin_get_permission_catalog() returns jsonb language sql security definer set search_path='' as $$ select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order,c.category,c.label),'[]'::jsonb) from public.admin_permission_catalog c where private.admin_can('admin.manage',auth.uid()); $$;
create or replace function public.admin_get_admin_users() returns jsonb language sql security definer set search_path='' as $$ select coalesce(jsonb_agg(jsonb_build_object('user_id',u.user_id,'role_kind',u.role_kind,'active',u.active,'created_at',u.created_at,'display_name',coalesce(p.display_name,'Anonymous Panda')) order by u.created_at),'[]'::jsonb) from public.admin_roles u left join public.profiles p on p.id=u.user_id where private.admin_can('admin.manage',auth.uid()); $$;
create or replace function public.admin_get_admin_permissions(p_user_id uuid) returns jsonb language sql security definer set search_path='' as $$ select coalesce(jsonb_agg(ap.permission_key order by ap.permission_key),'[]'::jsonb) from public.admin_permissions ap where ap.user_id=p_user_id and private.admin_can('admin.manage',auth.uid()); $$;

create or replace function public.admin_create_admin(p_user_id uuid,p_permissions jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; uid uuid:=auth.uid();
begin
 if not private.admin_can('admin.manage',uid) then raise exception 'Admin management permission required'; end if;
 if p_user_id=uid then raise exception 'You are already an administrator'; end if;
 if exists(select 1 from public.admin_roles where user_id=p_user_id and active) then raise exception 'User is already an active administrator'; end if;
 insert into public.admin_roles(user_id,role_kind,active,created_by) values(p_user_id,'delegated',true,uid) on conflict(user_id) do update set role_kind='delegated',active=true,created_by=uid,updated_at=now();
 for k in select jsonb_array_elements_text(coalesce(p_permissions,'[]'::jsonb)) loop
  if k='admin.manage' and not private.admin_is_owner(uid) then raise exception 'Only the owner can delegate administrator management'; end if;
  if not exists(select 1 from public.admin_permission_catalog where permission_key=k) then raise exception 'Unknown permission: %',k; end if;
  if not private.admin_is_owner(uid) and not private.admin_can(k,uid) then raise exception 'You cannot grant permission: %',k; end if;
  insert into public.admin_permissions(user_id,permission_key,granted_by) values(p_user_id,k,uid) on conflict do nothing;
 end loop;
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(uid,'ADMIN_CREATED',p_user_id,jsonb_build_object('permissions',coalesce(p_permissions,'[]'::jsonb)));
 return jsonb_build_object('user_id',p_user_id,'permissions',coalesce(p_permissions,'[]'::jsonb));
end $$;

create or replace function public.admin_set_admin_permissions(p_user_id uuid,p_permissions jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; uid uuid:=auth.uid();
begin
 if not private.admin_can('admin.manage',uid) then raise exception 'Admin management permission required'; end if;
 if exists(select 1 from public.admin_roles where user_id=p_user_id and role_kind='owner') then raise exception 'Owner permissions cannot be changed'; end if;
 if not private.admin_is_owner(uid) and exists(select 1 from jsonb_array_elements_text(coalesce(p_permissions,'[]'::jsonb)) x where not private.admin_can(x,uid)) then raise exception 'You cannot grant a permission you do not have'; end if;
 delete from public.admin_permissions where user_id=p_user_id;
 for k in select jsonb_array_elements_text(coalesce(p_permissions,'[]'::jsonb)) loop
  if k='admin.manage' and not private.admin_is_owner(uid) then raise exception 'Only the owner can grant administrator management'; end if;
  if not exists(select 1 from public.admin_permission_catalog where permission_key=k) then raise exception 'Unknown permission: %',k; end if;
  insert into public.admin_permissions(user_id,permission_key,granted_by) values(p_user_id,k,uid);
 end loop;
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(uid,'ADMIN_PERMISSIONS_UPDATED',p_user_id,jsonb_build_object('permissions',coalesce(p_permissions,'[]'::jsonb)));
 return public.admin_get_admin_permissions(p_user_id);
end $$;

create or replace function public.admin_remove_admin(p_user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if not private.admin_can('admin.manage',uid) then raise exception 'Admin management permission required'; end if;
 if exists(select 1 from public.admin_roles where user_id=p_user_id and role_kind='owner') then raise exception 'Owner cannot be removed'; end if;
 update public.admin_roles set active=false,updated_at=now() where user_id=p_user_id;
 delete from public.admin_permissions where user_id=p_user_id;
 insert into public.admin_audit_log(admin_user_id,action,target_user_id,metadata) values(uid,'ADMIN_REMOVED',p_user_id,'{}'::jsonb);
 return found;
end $$;

create or replace function public.admin_get_my_permissions() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('owner',private.admin_is_owner(auth.uid()),'admin',private.admin_is_owner(auth.uid()) or exists(select 1 from public.admin_roles where user_id=auth.uid() and active),'permissions',coalesce((select jsonb_agg(permission_key) from public.admin_permissions where user_id=auth.uid()),'[]'::jsonb)); $$;
create or replace function public.check_admin_request() returns void language plpgsql security definer set search_path='' as $$
declare path text:=coalesce(current_setting('request.path',true),''); fn text; perm text; uid uuid:=auth.uid();
begin
 if path like '/rpc/admin_%' then
  fn:=split_part(path,'/',3);
  if private.admin_is_owner(uid) then return; end if;
  select permission_key into perm from public.admin_rpc_permission_map where function_name=fn;
  if perm is null or not private.admin_can(perm,uid) then raise exception 'This administrator is not permitted to perform: %',fn; end if;
 end if;
end $$;

revoke all on function public.admin_get_permission_catalog() from public,anon,authenticated;
revoke all on function public.admin_get_admin_users() from public,anon,authenticated;
revoke all on function public.admin_get_admin_permissions(uuid) from public,anon,authenticated;
revoke all on function public.admin_create_admin(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.admin_set_admin_permissions(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.admin_remove_admin(uuid) from public,anon,authenticated;
revoke all on function public.admin_get_my_permissions() from public,anon,authenticated;
grant execute on function public.admin_get_permission_catalog() to authenticated;
grant execute on function public.admin_get_admin_users() to authenticated;
grant execute on function public.admin_get_admin_permissions(uuid) to authenticated;
grant execute on function public.admin_create_admin(uuid,jsonb) to authenticated;
grant execute on function public.admin_set_admin_permissions(uuid,jsonb) to authenticated;
grant execute on function public.admin_remove_admin(uuid) to authenticated;
grant execute on function public.admin_get_my_permissions() to authenticated;
alter role authenticator set pgrst.db_pre_request = 'public.check_admin_request';
notify pgrst,'reload config';
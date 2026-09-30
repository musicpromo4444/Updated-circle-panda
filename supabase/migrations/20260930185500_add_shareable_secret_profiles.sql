create table if not exists public.profile_secrets (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 3 and 1000),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profile_secrets_target_created_idx on public.profile_secrets(target_user_id, created_at desc);
alter table public.profile_secrets enable row level security;
drop policy if exists profile_secrets_public_read on public.profile_secrets;
create policy profile_secrets_public_read on public.profile_secrets for select to anon, authenticated using (is_published = true);
drop policy if exists profile_secrets_authenticated_insert on public.profile_secrets;
create policy profile_secrets_authenticated_insert on public.profile_secrets for insert to authenticated with check (author_user_id = auth.uid());
drop policy if exists profile_secrets_target_owner_delete on public.profile_secrets;
create policy profile_secrets_target_owner_delete on public.profile_secrets for delete to authenticated using (target_user_id = auth.uid() or author_user_id = auth.uid());

create or replace function public.get_shared_profile_public(p_user_id uuid)
returns table(id uuid, display_name text, avatar_url text, bio text, country text, is_vip boolean)
language sql stable security definer set search_path = public, private
as $$ select p.id,p.display_name,p.avatar_url,p.bio,p.country,p.is_vip from public.profiles p where p.id=p_user_id limit 1; $$;
revoke all on function public.get_shared_profile_public(uuid) from public;
grant execute on function public.get_shared_profile_public(uuid) to anon, authenticated;

create or replace function public.submit_profile_secret(p_target_user_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path = public, private
as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Please sign up or log in to post a secret.'; end if;
 if p_target_user_id is null or not exists(select 1 from public.profiles where id=p_target_user_id) then raise exception 'Profile not found.'; end if;
 if char_length(btrim(coalesce(p_content,''))) < 3 or char_length(btrim(p_content)) > 1000 then raise exception 'Secret must be between 3 and 1000 characters.'; end if;
 insert into public.profile_secrets(target_user_id,author_user_id,content) values(p_target_user_id,auth.uid(),btrim(p_content)) returning id into new_id;
 return new_id;
end;
$$;
revoke all on function public.submit_profile_secret(uuid,text) from public;
grant execute on function public.submit_profile_secret(uuid,text) to authenticated;

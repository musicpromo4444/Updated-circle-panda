-- Circle Panda VIP content identity hardening
-- VIP presentation is captured at publish time so a VIP post remains visibly marked
-- even if the membership later expires. Current membership still comes from profiles.

alter table public.cp_posts add column if not exists author_vip_at timestamptz;
alter table public.cp_post_replies add column if not exists author_vip_at timestamptz;
alter table public.confessions add column if not exists author_vip_at timestamptz;

create or replace function public.capture_vip_content_author()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.author_id is not null then
    select case when p.is_vip and (p.vip_expires_at is null or p.vip_expires_at > now()) then now() else null end
      into new.author_vip_at from public.profiles p where p.id = new.author_id;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_vip_content_author() from public, anon, authenticated;

drop trigger if exists cp_posts_capture_vip_author on public.cp_posts;
create trigger cp_posts_capture_vip_author before insert on public.cp_posts for each row execute function public.capture_vip_content_author();
drop trigger if exists cp_post_replies_capture_vip_author on public.cp_post_replies;
create trigger cp_post_replies_capture_vip_author before insert on public.cp_post_replies for each row execute function public.capture_vip_content_author();
drop trigger if exists confessions_capture_vip_author on public.confessions;
create trigger confessions_capture_vip_author before insert on public.confessions for each row execute function public.capture_vip_content_author();

update public.cp_posts p set author_vip_at = case when pr.is_vip and (pr.vip_expires_at is null or pr.vip_expires_at > now()) then p.created_at else null end from public.profiles pr where pr.id = p.author_id and p.author_vip_at is null;
update public.cp_post_replies r set author_vip_at = case when pr.is_vip and (pr.vip_expires_at is null or pr.vip_expires_at > now()) then r.created_at else null end from public.profiles pr where pr.id = r.author_id and r.author_vip_at is null;
update public.confessions c set author_vip_at = case when pr.is_vip and (pr.vip_expires_at is null or pr.vip_expires_at > now()) then c.created_at else null end from public.profiles pr where pr.id = c.author_id and c.author_vip_at is null;

create index if not exists cp_posts_author_vip_at_idx on public.cp_posts(author_vip_at) where author_vip_at is not null;
create index if not exists confessions_author_vip_at_idx on public.confessions(author_vip_at) where author_vip_at is not null;

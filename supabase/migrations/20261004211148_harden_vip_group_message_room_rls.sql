drop policy if exists "vip group insert" on public.cp_vip_group_messages;
create policy "vip group insert" on public.cp_vip_group_messages
for insert to authenticated
with check (
 user_id=(select auth.uid()) and exists (
   select 1 from public.profiles p join public.cp_vip_group_rooms r
     on r.id=cp_vip_group_messages.group_id and r.enabled=true
    and (r.is_worldwide=true or lower(r.country)=lower(p.country))
   where p.id=(select auth.uid()) and p.is_vip=true
     and (p.vip_expires_at is null or p.vip_expires_at>now())
 )
);

drop policy if exists "vip group read" on public.cp_vip_group_messages;
create policy "vip group read" on public.cp_vip_group_messages
for select to authenticated
using (
 exists (
   select 1 from public.profiles p join public.cp_vip_group_rooms r
     on r.id=cp_vip_group_messages.group_id and r.enabled=true
    and (r.is_worldwide=true or lower(r.country)=lower(p.country))
   where p.id=(select auth.uid()) and p.is_vip=true
     and (p.vip_expires_at is null or p.vip_expires_at>now())
 )
);

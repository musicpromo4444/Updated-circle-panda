drop policy if exists "group media upload" on storage.objects;
create policy "group media upload" on storage.objects
for insert to authenticated
with check (
  bucket_id='group-media'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.group_members gm
    where gm.group_id=(nullif((storage.foldername(name))[2],'')::uuid)
      and gm.user_id=(select auth.uid())
      and gm.left_at is null
  )
);

drop policy if exists "group media read" on storage.objects;
create policy "group media read" on storage.objects
for select to authenticated
using (
  bucket_id='group-media'
  and exists (
    select 1 from public.group_members gm
    where gm.group_id=(nullif((storage.foldername(name))[2],'')::uuid)
      and gm.user_id=(select auth.uid())
      and gm.left_at is null
  )
);
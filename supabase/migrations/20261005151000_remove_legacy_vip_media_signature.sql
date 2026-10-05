drop function if exists public.send_vip_group_media_secure(uuid,text,text,text,integer,text,boolean);
revoke all on function public.send_vip_group_media_secure(uuid,text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.send_vip_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;

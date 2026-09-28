-- Tighten anonymous execution on universal admin RPCs.
revoke execute on function public.admin_upsert_universal_ad_placement(uuid,text,text,text,boolean,integer,jsonb) from anon;
revoke execute on function public.admin_upsert_universal_ad_provider(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,boolean,jsonb,timestamptz,timestamptz,integer) from anon;
revoke execute on function public.admin_delete_universal_ad_provider(uuid) from anon;
grant execute on function public.admin_upsert_universal_ad_placement(uuid,text,text,text,boolean,integer,jsonb) to authenticated;
grant execute on function public.admin_upsert_universal_ad_provider(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,boolean,jsonb,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.admin_delete_universal_ad_provider(uuid) to authenticated;
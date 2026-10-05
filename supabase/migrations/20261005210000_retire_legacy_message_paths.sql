-- Retire obsolete direct-message implementations.
-- Canonical direct messaging is dm_threads -> dm_requests -> dm_messages.
revoke all on function public.send_dating_message(uuid,text,text,text) from public,anon,authenticated;
drop function if exists public.send_dating_message(uuid,text,text,text);
drop table if exists public.dating_messages cascade;
drop table if exists public.direct_messages cascade;
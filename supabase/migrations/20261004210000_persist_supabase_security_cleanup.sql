-- Persist the production security cleanup that was applied to the live database.
-- Group reward-ad views are server/RPC-only; clients do not need table access.
revoke all on table public.cp_group_reward_ad_views from anon, authenticated;

-- Group media sending is authenticated-only and must never be callable anonymously.
revoke all on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) from public, anon;
grant execute on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;

-- These indexes already existed under the shorter names; avoid duplicate indexes.
drop index if exists public.direct_message_requests_sender_status_created_idx;
drop index if exists public.direct_message_requests_recipient_status_created_idx;

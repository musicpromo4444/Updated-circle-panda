-- Circle Panda Hot Seat: internal helper RPC hardening
-- These helpers are called by server-authoritative Hot Seat functions and are not public API endpoints.
revoke execute on function public.hot_seat_is_live_phase(uuid) from public, anon, authenticated;
revoke execute on function public.hot_seat_user_moderated(uuid, uuid, text) from public, anon, authenticated;

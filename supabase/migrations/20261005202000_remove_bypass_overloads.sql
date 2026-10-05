-- Remove legacy overloads that could bypass canonical server-enforced flows.
-- Canonical VIP gate completion requires the ad-completion event.
drop function if exists public.accept_vip_call_gate(uuid);

-- XP amounts are server-owned; the caller must not supply an arbitrary amount.
drop function if exists public.award_xp(text, integer, text);

-- Keep only the authenticated, nominee-aware crush vote ad entry point.
drop function if exists public.start_crush_vote_ad_secure();

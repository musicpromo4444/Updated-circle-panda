-- Harden RLS-only internal tables: they have no policies and therefore must not be directly reachable by API roles.
revoke all on table public.ad_events,public.admin_email_allowlist,public.admin_permission_catalog,public.admin_permissions,public.admin_roles,public.admin_rpc_permission_map,public.circle_partners,public.cp_admin_integrations,public.cp_engagement_config,public.cp_floating_campaign_events,public.cp_floating_campaigns,public.cp_floating_page_catalog,public.cp_post_reactions,public.cp_reward_fulfilments,public.cp_reward_spin_attempts,public.cp_reward_wheel_slots,public.cp_reward_wheel_state,public.cp_xp_awards,public.event_blast_deliveries,public.google_play_rtdn_events,public.hot_seat_break_poll_votes,public.hot_seat_gifts,public.seven_day_activity_configs,public.seven_day_activity_schedule,public.universal_ad_placements,public.universal_ad_provider_configs from anon, authenticated;

-- These three SECURITY DEFINER RPCs are intentionally callable without login:
-- get_shared_profile_public: public profile lookup
-- get_universal_ad_runtime_config: public ad runtime configuration
-- submit_profile_secret: anonymous secret-profile posting is a product requirement.
-- Their bodies validate inputs and do not expose privileged data.

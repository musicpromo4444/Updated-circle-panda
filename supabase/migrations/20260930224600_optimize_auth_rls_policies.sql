-- Performance hardening: evaluate auth context once per policy statement.
-- Authorization semantics are unchanged.

alter policy "Admins can manage ad campaigns" on public.ad_campaigns
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));

alter policy "hotseat earnings admin read" on public.hot_seat_host_earnings
  using ((select private.is_admin((select auth.uid()))));

alter policy "hotseat moderation admin read" on public.hot_seat_moderation
  using ((select private.is_admin((select auth.uid()))));

alter policy "hotseat provider admin read" on public.hot_seat_provider_settings
  using ((select private.is_admin((select auth.uid()))));

alter policy "authenticated can read winner entries" on public.cp_activity_winner_entries
  using (user_id = (select auth.uid()));

alter policy "profile_secrets_authenticated_insert" on public.profile_secrets
  with check (author_user_id = (select auth.uid()));

alter policy "profile_secrets_target_owner_delete" on public.profile_secrets
  using (target_user_id = (select auth.uid()) or author_user_id = (select auth.uid()));

# Circle Panda Clean Rebuild

## Safety rules
- Work on `rebuild/confessions-clean`; do not replace the live/default branch during the rebuild.
- Preserve the existing Circle Panda visual design and product rules.
- Reuse the configured Supabase client and existing production RPCs/tables unless an audit proves a backend change is required.
- Do not create a second Supabase project, duplicate database functions, or destructive migrations as part of UI cleanup.
- Do not merge or deploy a page until its build and behavior checks pass.

## Page-by-page sequence
1. Confessions: map the current UI, data queries, reactions, comments, sharing, and message-request flow; rewrite in smaller typed components; test refresh persistence and signed-in/signed-out behavior.
2. WCW/MCM: upload/gender selection, voting, rewards, and admin-controlled ad placement.
3. Messaging: request cards, accept/decline, sender status, notifications, and self-message prevention.
4. Dating: profile creation/editing, image upload, request flow, and chat handoff.
5. Events: create/publish, RSVP, creator messaging, boosts, and duplicate-submit protection.
6. Groups: membership rules, messages, media/voice, notifications, and VIP group behavior.
7. Shared auth/profile, wallet/rewards, and admin controls.
8. Full regression/build verification, then review and deploy.

## Confession page acceptance checklist
- [ ] Page keeps the current design language and responsive layout.
- [ ] Existing production Supabase client is reused.
- [ ] Loading, empty, error, and retry states are explicit.
- [ ] Creating a confession persists after refresh.
- [ ] Reaction counts and the current user's reaction load consistently.
- [ ] Comment list/count and comment submission work.
- [ ] Share action works and has a graceful fallback.
- [ ] DM request flow rejects self-messaging and reports auth failures clearly.
- [ ] Repeated clicks cannot submit duplicate posts or requests.
- [ ] Typecheck, lint/build, and end-to-end behavior are checked before merge.

## Current verified repository facts
- Frontend uses TanStack Start/Router, React, TypeScript, and Vite.
- The Confessions route is `src/routes/confessions.tsx`.
- The existing Supabase client is `src/integrations/supabase/client.ts`; retain it while auditing.
- The repository's package scripts include `build`, `lint`, and `typecheck`.

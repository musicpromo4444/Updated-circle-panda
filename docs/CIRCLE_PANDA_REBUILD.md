# Circle Panda Clean Rebuild

## Goal
Rebuild the application implementation from a clean foundation while preserving the approved Circle Panda product design and behavior. Do not replace the product requirements with a generic social app. Keep the current production application untouched until the replacement has passed acceptance tests.

## Safety and release strategy
- Work only on `rebuild/circle-panda-clean-foundation` until the user approves promotion.
- Do not drop, rename, or truncate production tables and do not delete user data.
- Reuse the existing Supabase project `Replyer Stage Pro` unless a deliberate migration plan is approved.
- Never put service-role keys or other privileged secrets in client code.
- Keep a rollback path and use a preview deployment for verification.
- A green build is not proof that a user journey works; every critical journey needs an integration test.

## Product requirements to preserve
- App name: Circle Panda.
- Visual direction: matte/dim green and dark navy, restrained neon-green accents, clean straight layouts, no overflowing content, concise cards.
- Core product: anonymous secrets/confessions and social feed, MCM/WCW, events, normal groups, VIP groups, dating, direct messages/message requests, wallet/BC rewards, XP/levels, notifications, and admin controls.
- Signup: password + confirmation and immediate usable session where supported; no unnecessary email-verification wall. Phone is primary with optional email. Google/Apple providers are admin-configured.
- Messaging must enforce self-message prevention and use consistent message-request, accept/decline, notification, and resulting-chat behavior across dating, events, groups, comments, confessions, and MCM/WCW.
- Rewards, VIP rules, schedules, limits, and ad placement must be read from admin-controlled backend configuration rather than duplicated hard-coded values.
- Existing detailed reward and XP rules in project requirements remain authoritative; they must be documented as server-side contracts before implementation.

## Architecture rules
1. Define one typed contract per business operation, including input, authenticated actor, return value, failure codes, and idempotency behavior.
2. Keep database schema/RPC definitions, generated database types, and frontend service wrappers aligned. Generate types from the actual schema rather than manually guessing function signatures.
3. UI components call domain services, not ad-hoc database queries scattered across pages.
4. All writes have explicit loading, success, and failure states. A form closes only after the server confirms success. A failed operation keeps user input and displays a useful error.
5. Media uploads use a single documented storage-path convention and explicit access policy. A record is not considered published until the metadata write succeeds; compensate or clean up orphaned uploads safely.
6. Every creator-owned action checks ownership server-side. Every private row and message path is protected by RLS or a carefully scoped server-side function.
7. Multi-step workflows are modeled explicitly; retries are safe and duplicate submissions are idempotent.
8. Avoid duplicate backend functions and multiple competing implementations of the same operation.

## Build order and acceptance gates
1. Inventory routes, screens, schema, migrations, RPCs, storage buckets/policies, auth flows, and current deployment configuration.
2. Establish the schema/function contract map and identify legacy or conflicting operations before writing replacement UI.
3. Build shared foundation: auth/session, profile identity, typed service layer, error handling, notifications, design tokens, and reusable UI components.
4. Rebuild and test in this order:
   - signup/login/session persistence and first-login onboarding/200 BC claim;
   - confession feed, create/reply/share/react/comment/report;
   - MCM/WCW submission, media display, schedule, voting and rewards;
   - messaging requests, accept/decline, sent-request state, chat, unread badges and self-message prevention;
   - dating profile/media, filters, requests and chat;
   - events, publishing, attendance, creator messaging and boost limits;
   - groups, membership threshold, room messages, media/voice notes, VIP groups and calls;
   - wallet, BC/XP ledger, rewards, admin settings and ad-gated flows.
5. For each feature, pass unit/type checks, database permission tests, and end-to-end tests with two or more test accounts before starting the next feature.
6. Run production build, static checks, security/advisor checks, verify preview against the intended Supabase project, then obtain approval before production promotion.

## Required evidence before release
- Build and typecheck results.
- RLS/function/storage-policy review.
- Automated end-to-end tests for each critical journey.
- Verification that database records and media are actually persisted and visible to the intended users.
- Verification that failed writes show errors and do not falsely report success.
- Preview deployment URL, commit SHA, and explicit comparison against the approved design.

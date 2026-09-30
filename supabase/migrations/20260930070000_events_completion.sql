-- Circle Panda Events completion: cash entry, full venue data, media, targeted Blast.
alter table public.events
 add column if not exists entry_fee_amount numeric(12,2) not null default 0,
 add column if not exists entry_fee_currency text not null default 'NGN',
 add column if not exists venue_name text,
 add column if not exists address_line text,
 add column if not exists country text,
 add column if not exists state_province text,
 add column if not exists city text,
 add column if not exists area text,
 add column if not exists latitude numeric(9,6),
 add column if not exists longitude numeric(9,6);

alter table public.event_blasts
 add column if not exists target_scope text not null default 'worldwide',
 add column if not exists target_country text,
 add column if not exists target_state text,
 add column if not exists target_city text,
 add column if not exists target_area text;

insert into storage.buckets(id,name,public) values('event-media','event-media',true) on conflict(id) do nothing;

-- The authoritative RPCs are maintained in the live Supabase project and mirrored by this migration.
-- Paid event entry is verified through verify-event-entry-payment.
-- Event Blast targeting is persisted on event_blasts and applied by private.dispatch_event_blast_notifications.

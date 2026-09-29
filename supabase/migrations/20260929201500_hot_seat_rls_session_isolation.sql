-- Keep historical Hot Seat questions/chat/answers out of the public Data API.
drop policy if exists "hotseat chat read" on public.hot_seat_chat;
create policy "hotseat chat active session read" on public.hot_seat_chat
for select to anon, authenticated
using (exists (
  select 1 from public.hot_seat_hosts h
  where h.id=hot_seat_chat.host_id and h.is_active=true and h.ends_at>now()
));

drop policy if exists "hotseat questions insert" on public.hot_seat_questions;
drop policy if exists "hotseat questions read" on public.hot_seat_questions;
create policy "hotseat questions active session read" on public.hot_seat_questions
for select to anon, authenticated
using (exists (
  select 1 from public.hot_seat_hosts h
  where h.id=hot_seat_questions.host_id and h.is_active=true and h.ends_at>now()
));

drop policy if exists "hotseat answers read" on public.hot_seat_answers;
create policy "hotseat answers active session read" on public.hot_seat_answers
for select to anon, authenticated
using (exists (
  select 1
  from public.hot_seat_questions q
  join public.hot_seat_hosts h on h.id=q.host_id
  where q.id=hot_seat_answers.question_id and h.is_active=true and h.ends_at>now()
));

drop policy if exists "hotseat queue own insert" on public.hot_seat_queue;
drop policy if exists "hotseat queue own update" on public.hot_seat_queue;

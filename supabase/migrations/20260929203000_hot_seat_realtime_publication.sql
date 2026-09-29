-- Hot Seat uses Supabase Realtime for live session state, chat, questions, likes, follows and gifts.
alter publication supabase_realtime add table public.hot_seat_hosts;
alter publication supabase_realtime add table public.hot_seat_questions;
alter publication supabase_realtime add table public.hot_seat_answers;
alter publication supabase_realtime add table public.hot_seat_chat;
alter publication supabase_realtime add table public.hot_seat_likes;
alter publication supabase_realtime add table public.hot_seat_follows;
alter publication supabase_realtime add table public.hot_seat_gifts;

CREATE TABLE public.hot_seat_hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alias TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🐼',
  media_url TEXT,
  media_kind TEXT NOT NULL DEFAULT 'video',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_seat_hosts TO anon, authenticated;
GRANT ALL ON public.hot_seat_hosts TO service_role;
ALTER TABLE public.hot_seat_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosts readable by everyone" ON public.hot_seat_hosts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "hosts writable by everyone" ON public.hot_seat_hosts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.hot_seat_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES public.hot_seat_hosts(id) ON DELETE CASCADE,
  asker_alias TEXT NOT NULL DEFAULT 'Anonymous Panda',
  body TEXT NOT NULL,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_seat_questions TO anon, authenticated;
GRANT ALL ON public.hot_seat_questions TO service_role;
ALTER TABLE public.hot_seat_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable by everyone" ON public.hot_seat_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "questions writable by everyone" ON public.hot_seat_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.hot_seat_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.hot_seat_questions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_seat_answers TO anon, authenticated;
GRANT ALL ON public.hot_seat_answers TO service_role;
ALTER TABLE public.hot_seat_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers readable by everyone" ON public.hot_seat_answers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "answers writable by everyone" ON public.hot_seat_answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.app_settings (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  hot_seat_mode TEXT NOT NULL DEFAULT 'continuous',
  daily_drops INTEGER NOT NULL DEFAULT 3,
  waiting_media_mode TEXT NOT NULL DEFAULT 'game',
  waiting_media_url TEXT NOT NULL DEFAULT '',
  waiting_cta_label TEXT NOT NULL DEFAULT 'Play Full Game',
  waiting_cta_url TEXT NOT NULL DEFAULT 'https://example.com',
  waiting_sponsor_name TEXT NOT NULL DEFAULT 'Bamboo Arcade',
  feed_ads_enabled BOOLEAN NOT NULL DEFAULT true,
  dating_enabled BOOLEAN NOT NULL DEFAULT true,
  spin_wheel_enabled BOOLEAN NOT NULL DEFAULT true,
  rewarded_ads_enabled BOOLEAN NOT NULL DEFAULT true,
  live_stream_enabled BOOLEAN NOT NULL DEFAULT false,
  apk_url TEXT NOT NULL DEFAULT '',
  show_download_button BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by everyone" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings writable by everyone" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (id, waiting_media_url) VALUES (1, 'https://www.youtube.com/embed/dQw4w9WgXcQ');

INSERT INTO public.hot_seat_hosts (alias, avatar, media_url, media_kind, started_at, ends_at, is_active)
VALUES ('Midnight Bamboo', '🎤', 'https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4', 'video', now() - interval '3 hours', now() + interval '21 hours', true);

INSERT INTO public.hot_seat_questions (host_id, asker_alias, body, is_priority, created_at)
SELECT h.id, 'Silent Cub', 'What made you take the Hot Seat tonight?', true, now() - interval '40 minutes' FROM public.hot_seat_hosts h WHERE h.is_active;
INSERT INTO public.hot_seat_questions (host_id, asker_alias, body, is_priority, created_at)
SELECT h.id, 'Anonymous Panda', 'Biggest secret you have never told anyone?', false, now() - interval '25 minutes' FROM public.hot_seat_hosts h WHERE h.is_active;
INSERT INTO public.hot_seat_questions (host_id, asker_alias, body, is_priority, created_at)
SELECT h.id, 'Neon Paws', 'Show us your view right now 👀', false, now() - interval '10 minutes' FROM public.hot_seat_hosts h WHERE h.is_active;

INSERT INTO public.hot_seat_answers (question_id, kind, body, created_at)
SELECT q.id, 'text', 'Honestly? I was bored and the queue was short. Staying all 24 hours though.', now() - interval '35 minutes'
FROM public.hot_seat_questions q WHERE q.asker_alias = 'Silent Cub';
INSERT INTO public.hot_seat_answers (question_id, kind, media_url, duration_seconds, created_at)
SELECT q.id, 'voice', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', 18, now() - interval '20 minutes'
FROM public.hot_seat_questions q WHERE q.asker_alias = 'Anonymous Panda';
INSERT INTO public.hot_seat_answers (question_id, kind, media_url, created_at)
SELECT q.id, 'video', 'https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4', now() - interval '5 minutes'
FROM public.hot_seat_questions q WHERE q.asker_alias = 'Neon Paws';
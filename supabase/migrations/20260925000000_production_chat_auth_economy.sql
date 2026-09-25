-- ==============================================================================
-- CIRCLE PANDA: PRODUCTION DATABASE, AUTH, REALTIME CHAT, SECURE ECONOMY & RLS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE (Linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  handle TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🐼',
  role TEXT NOT NULL DEFAULT 'user',
  coins INTEGER NOT NULL DEFAULT 100 CHECK (coins >= 0),
  reputation INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  vip_expires_at TIMESTAMPTZ,
  last_spin_at TIMESTAMPTZ,
  last_ad_reward_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);

-- 3. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_handle TEXT;
  v_handles TEXT[] := ARRAY[
    'Bamboo Ghost', 'Midnight Panda', 'Silent Sprout', 'Anon Cub', 
    'Shy Shoot', 'Paper Panda', 'Quiet Leaf', 'Shadow Cub', 'Velvet Panda'
  ];
BEGIN
  -- Pick handle from metadata or choose a random panda handle
  v_handle := COALESCE(
    NEW.raw_user_meta_data->>'handle',
    NEW.raw_user_meta_data->>'name',
    v_handles[floor(random() * array_length(v_handles, 1) + 1)::int] || ' #' || substring(NEW.id::text, 1, 4)
  );

  INSERT INTO public.profiles (
    id,
    email,
    handle,
    avatar,
    coins,
    reputation,
    level,
    xp,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    v_handle,
    COALESCE(NEW.raw_user_meta_data->>'avatar', '🐼'),
    100, -- 100 Welcome BC
    10,
    1,
    0,
    CASE WHEN lower(NEW.email) = 'reply.stagepro@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. COIN TRANSACTIONS AUDIT LOG
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user_id ON public.coin_transactions(user_id, created_at DESC);

-- 5. SPIN HISTORY LOG
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prize_id TEXT NOT NULL,
  prize_title TEXT NOT NULL,
  prize_kind TEXT NOT NULL,
  prize_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spin_history_user ON public.spin_history(user_id, created_at DESC);

-- 6. CHAT CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'dm' CHECK (kind IN ('dm', 'dating')),
  title TEXT NOT NULL DEFAULT 'Anonymous Panda',
  blurb TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);

-- 7. CHAT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_thread_user UNIQUE(thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_participants_thread ON public.chat_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);

-- 8. REAL-TIME CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);

-- 9. CONFESSIONS & REPLIES TABLES
CREATE TABLE IF NOT EXISTS public.confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_handle TEXT NOT NULL DEFAULT 'Anonymous Panda',
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_confessions_created ON public.confessions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.confession_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_handle TEXT NOT NULL DEFAULT 'Anonymous Panda',
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_confession_replies_parent ON public.confession_replies(confession_id, created_at ASC);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_readable_by_everyone"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CHAT CONVERSATIONS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_readable_by_participants"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = chat_conversations.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insertable_by_authenticated"
  ON public.chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- CHAT PARTICIPANTS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_readable_by_fellow_members"
  ON public.chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = chat_participants.thread_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "participants_insertable_by_authenticated"
  ON public.chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- CHAT MESSAGES
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_readable_only_by_thread_participants"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = chat_messages.thread_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insertable_only_by_sender_in_thread"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = chat_messages.thread_id AND cp.user_id = auth.uid()
    )
  );

-- CONFESSIONS
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confessions_readable_by_all"
  ON public.confessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "confessions_creatable_by_authenticated"
  ON public.confessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- CONFESSION REPLIES
ALTER TABLE public.confession_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies_readable_by_all"
  ON public.confession_replies FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "replies_creatable_by_authenticated"
  ON public.confession_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- COIN TRANSACTIONS & SPIN HISTORY
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_viewable_by_owner"
  ON public.coin_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spin_history_viewable_by_owner"
  ON public.spin_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 11. SECURE SERVER-SIDE STORED FUNCTIONS (RPCs)
-- ==============================================================================

-- A) SECURE SEND CHAT MESSAGE WITH SERVER-SIDE COIN DEDUCTION (1 BC)
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_thread_id UUID,
  p_body TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_coins INTEGER;
  v_new_balance INTEGER;
  v_msg RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: You must be logged in to send messages.';
  END IF;

  IF trim(p_body) = '' THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE: Message body cannot be empty.';
  END IF;

  -- Verify user is a member of this chat thread
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE thread_id = p_thread_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: You are not a participant in this conversation.';
  END IF;

  -- Lock user profile row to prevent race conditions
  SELECT coins INTO v_current_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_coins < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS: Each message costs 1 BC. Your balance is % BC.', v_current_coins;
  END IF;

  -- Deduct 1 BC
  UPDATE public.profiles
  SET coins = coins - 1,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.coin_transactions (user_id, amount, balance_after, reason)
  VALUES (v_user_id, -1, v_new_balance, 'Sent anonymous direct message (1 BC)');

  -- Insert the real message
  INSERT INTO public.chat_messages (thread_id, sender_id, body)
  VALUES (p_thread_id, v_user_id, trim(p_body))
  RETURNING id, thread_id, sender_id, body, created_at INTO v_msg;

  -- Touch updated_at on conversation
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = p_thread_id;

  RETURN json_build_object(
    'message_id', v_msg.id,
    'thread_id', v_msg.thread_id,
    'sender_id', v_msg.sender_id,
    'body', v_msg.body,
    'created_at', v_msg.created_at,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) SECURE DAILY SPIN WHEEL FUNCTION WITH 24-HOUR SERVER ENFORCEMENT
CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_spin TIMESTAMPTZ;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
  v_rand NUMERIC;
  v_prize_id TEXT;
  v_prize_title TEXT;
  v_prize_kind TEXT;
  v_prize_value INTEGER;
  v_prize_emoji TEXT;
  v_prize_blurb TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: You must be logged in to spin the wheel.';
  END IF;

  -- Check cooldown
  SELECT last_spin_at, coins INTO v_last_spin, v_current_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_last_spin IS NOT NULL AND v_last_spin > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE: You have already used your free daily spin. Available again in %.',
      age(v_last_spin + interval '24 hours', now());
  END IF;

  -- Server-side secure random generation [0..100)
  v_rand := random() * 100;

  IF v_rand < 0.05 THEN
    v_prize_id := 'iphone16';
    v_prize_title := 'iPhone 16 Pro Max';
    v_prize_kind := 'physical';
    v_prize_value := 1;
    v_prize_emoji := '📱';
    v_prize_blurb := 'Grand prize jackpot! Circle Panda support will reach out.';
  ELSIF v_rand < 0.10 THEN
    v_prize_id := 'ps5';
    v_prize_title := 'PlayStation 5';
    v_prize_kind := 'physical';
    v_prize_value := 1;
    v_prize_emoji := '🎮';
    v_prize_blurb := 'Grand prize jackpot! Circle Panda support will reach out.';
  ELSIF v_rand < 6.10 THEN
    v_prize_id := 'bc1000';
    v_prize_title := '1,000 Black Coins';
    v_prize_kind := 'coins';
    v_prize_value := 1000;
    v_prize_emoji := '💎';
    v_prize_blurb := 'Massive coin drop straight to your balance!';
  ELSIF v_rand < 18.10 THEN
    v_prize_id := 'vip7';
    v_prize_title := '7-Day VIP Pass';
    v_prize_kind := 'vip';
    v_prize_value := 7;
    v_prize_emoji := '👑';
    v_prize_blurb := 'VIP status activated for 7 days with priority perks.';
  ELSIF v_rand < 34.10 THEN
    v_prize_id := 'ticket';
    v_prize_title := 'Sweepstakes Ticket';
    v_prize_kind := 'ticket';
    v_prize_value := 1;
    v_prize_emoji := '🎟️';
    v_prize_blurb := '1 entry added to the upcoming weekly jackpot draw.';
  ELSIF v_rand < 60.10 THEN
    v_prize_id := 'data2gb';
    v_prize_title := '2GB Data Top-up';
    v_prize_kind := 'data';
    v_prize_value := 2;
    v_prize_emoji := '📶';
    v_prize_blurb := 'Instant mobile data package credited.';
  ELSE
    v_prize_id := 'bc100';
    v_prize_title := '100 Black Coins';
    v_prize_kind := 'coins';
    v_prize_value := 100;
    v_prize_emoji := '🪙';
    v_prize_blurb := 'Credited directly to your Panda Coin balance.';
  END IF;

  -- Apply updates to user profile
  UPDATE public.profiles
  SET
    last_spin_at = now(),
    coins = CASE WHEN v_prize_kind = 'coins' THEN coins + v_prize_value ELSE coins END,
    is_vip = CASE WHEN v_prize_kind = 'vip' THEN true ELSE is_vip END,
    vip_expires_at = CASE
      WHEN v_prize_kind = 'vip' THEN GREATEST(now(), COALESCE(vip_expires_at, now())) + interval '7 days'
      ELSE vip_expires_at
    END,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_new_balance;

  -- Audit log spin
  INSERT INTO public.spin_history (user_id, prize_id, prize_title, prize_kind, prize_value)
  VALUES (v_user_id, v_prize_id, v_prize_title, v_prize_kind, v_prize_value);

  IF v_prize_kind = 'coins' THEN
    INSERT INTO public.coin_transactions (user_id, amount, balance_after, reason)
    VALUES (v_user_id, v_prize_value, v_new_balance, 'Daily Spin Wheel Prize (' || v_prize_title || ')');
  END IF;

  RETURN json_build_object(
    'prize_id', v_prize_id,
    'title', v_prize_title,
    'kind', v_prize_kind,
    'value', v_prize_value,
    'emoji', v_prize_emoji,
    'blurb', v_prize_blurb,
    'new_balance', v_new_balance,
    'spun_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C) SECURE CLAIM REWARDED AD COINS (10 BC WITH COOLDOWN)
CREATE OR REPLACE FUNCTION public.claim_rewarded_ad_coins()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_ad TIMESTAMPTZ;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: You must be logged in to claim ad rewards.';
  END IF;

  SELECT last_ad_reward_at INTO v_last_ad
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  -- Anti-exploit cooldown: maximum 1 rewarded ad every 15 seconds
  IF v_last_ad IS NOT NULL AND v_last_ad > now() - interval '15 seconds' THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE: Please wait a few moments before watching another ad.';
  END IF;

  UPDATE public.profiles
  SET coins = coins + 10,
      last_ad_reward_at = now(),
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_new_balance;

  INSERT INTO public.coin_transactions (user_id, amount, balance_after, reason)
  VALUES (v_user_id, 10, v_new_balance, 'Completed rewarded video ad view (+10 BC)');

  RETURN json_build_object(
    'added_coins', 10,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D) SECURE POST CONFESSION (+2 BC, +15 XP)
CREATE OR REPLACE FUNCTION public.submit_confession(p_body TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_handle TEXT := 'Anonymous Panda';
  v_new_balance INTEGER;
  v_confession_id UUID;
BEGIN
  IF trim(p_body) = '' THEN
    RAISE EXCEPTION 'EMPTY_BODY: Confession text cannot be empty.';
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT handle INTO v_handle FROM public.profiles WHERE id = v_user_id;
  END IF;

  INSERT INTO public.confessions (author_id, author_handle, body)
  VALUES (v_user_id, COALESCE(v_handle, 'Anonymous Panda'), trim(p_body))
  RETURNING id INTO v_confession_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET coins = coins + 2,
        xp = xp + 15,
        reputation = reputation + 15,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING coins INTO v_new_balance;

    INSERT INTO public.coin_transactions (user_id, amount, balance_after, reason)
    VALUES (v_user_id, 2, v_new_balance, 'Posted anonymous confession (+2 BC)');
  ELSE
    v_new_balance := 0;
  END IF;

  RETURN json_build_object(
    'confession_id', v_confession_id,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 12. ENABLE REALTIME BROADCASTING
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";
import { getStoredUser } from "./auth";
import { sendRealtimeMessage } from "./realtime-chat";
import { executeServerSpin, submitServerConfession } from "./backend-economy";

export type Reply = { id: string; author: string; body: string; at: number };
export type Post = {
  id: string;
  author: string;
  body: string;
  at: number;
  replies: Reply[];
  likes?: number;
};
export type GroupChatMessage = {
  id: string;
  author: string;
  body: string;
  at: number;
  mine?: boolean;
  /** Sent while the author held the Hot Seat. */
  hotSeat?: boolean;
};

export const ME_ID = "me";
export const HOT_SEAT_DEFAULT_SECONDS = 300;

/** Mirrors a `hot_seat_sessions` row. */
export type HotSeatSession = {
  group_id: string;
  current_user_id: string;
  current_user_name: string;
  started_at: number;
  duration_seconds: number;
  queue: string[];
};
export type GroupChat = {
  id: string;
  name: string;
  topic: string;
  members: number;
  openedAt: number | null;
  messages: GroupChatMessage[];
};
export type ChatMessage = { id: string; body: string; at: number; mine: boolean };
export type Thread = {
  id: string;
  name: string;
  kind: "dm" | "dating";
  blurb: string;
  messages: ChatMessage[];
  /** When a dating match started; dating chats expire 24h after this. */
  startedAt?: number;
};
export type PandaEvent = {
  id: string;
  title: string;
  tag: string;
  date: string;
  time: string;
  place: string;
  cost: number;
  blurb: string;
  details: string;
  rsvp: boolean;
};

export type DatingProfile = {
  name: string;
  age: number;
  vibe: string;
  emoji: string;
  bio: string;
  interests: string[];
  location: string;
  registeredAt: number;
};

const HANDLES = [
  "Bamboo Ghost",
  "Midnight Panda",
  "Silent Sprout",
  "Anon Cub",
  "Shy Shoot",
  "Paper Panda",
  "Quiet Leaf",
];

const rid = () => Math.random().toString(36).slice(2, 10);
const randomHandle = () => HANDLES[Math.floor(Math.random() * HANDLES.length)] ?? "Anon Panda";
export const DAY_MS = 24 * 60 * 60 * 1000;

/** WCW / MCM weekly crush voting. */
export type CrushKind = "wcw" | "mcm";
export type Nominee = {
  id: string;
  name: string;
  kind: CrushKind;
  emoji: string;
  avatarUrl?: string;
  blurb: string;
  votes: number;
  mine?: boolean;
  userId?: string;
  userEmail?: string;
  submittedAt?: number;
  status?: "approved" | "pending";
};
export type Spotlight = { kind: CrushKind; name: string; wonAt: number };

export const NOMINATION_COST = 5;
export const FREE_DAILY_VOTES = 3;
export const EXTRA_VOTE_COST = 1;
export const WINNER_REWARD = 100;
export const WEEK_MS = 7 * DAY_MS;

export const CRUSH_LABEL: Record<CrushKind, string> = {
  wcw: "Woman Crush Wednesday",
  mcm: "Man Crush Monday",
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  posts: number;
  you?: boolean;
};

/** Panda Sweepstakes prize draws + spin-the-wheel minigame. */
export type DrawKind = "weekly" | "monthly";
export type SweepTicket = { id: string; draw: DrawKind; at: number };
export type Rarity = "common" | "uncommon" | "rare" | "ultra-rare";
export type RewardType = "currency" | "ticket" | "data" | "perk" | "physical";
/** One shared reward item, used by both the spin wheel and the daily login modal. */
export type SpinPrize = {
  id: string;
  /** display name */
  title: string;
  label: string;
  type: RewardType;
  /** kept for existing wheel/claim logic */
  kind: "coins" | "ticket" | "data" | "vip" | "physical";
  /** numeric value: coins amount, GB of data, days of VIP, or 1 for physical */
  value: number;
  amount: number;
  /** display icon */
  emoji: string;
  rarity: Rarity;
  blurb: string;
  /** relative rarity weight; higher = more likely */
  weight: number;
};
export type SweepWinner = { draw: DrawKind; name: string; prize: string; wonAt: number };

export const TICKET_COST = 10;
export const SPIN_COOLDOWN_MS = DAY_MS;

export const WEEKLY_DRAW_PRIZES = [
  "iPhone 16 Pro Max (jackpot)",
  "PlayStation 5 (jackpot)",
  "7-Day VIP Pass",
  "1,000 Black Coins",
];

export const MONTHLY_JACKPOT_PRIZE = "iPhone 16 Pro Max Mega Jackpot";

/**
 * Combined reward pool shared by the Spin the Wheel minigame and the
 * Daily Login modal. Physical grand prizes carry ultra-low weights so they
 * behave as special event jackpots.
 */
export const REWARD_POOL: SpinPrize[] = [
  {
    id: "iphone16",
    title: "iPhone 16 Pro Max",
    label: "iPhone 16 Pro Max",
    type: "physical",
    kind: "physical",
    value: 1,
    amount: 1,
    emoji: "📱",
    rarity: "ultra-rare",
    blurb: "Grand prize. Our team contacts winners to arrange delivery.",
    weight: 0.05,
  },
  {
    id: "ps5",
    title: "PlayStation 5",
    label: "PlayStation 5",
    type: "physical",
    kind: "physical",
    value: 1,
    amount: 1,
    emoji: "🎮",
    rarity: "ultra-rare",
    blurb: "Grand prize. Our team contacts winners to arrange delivery.",
    weight: 0.05,
  },
  {
    id: "data2gb",
    title: "2GB Data Top-up",
    label: "2GB Data",
    type: "data",
    kind: "data",
    value: 2,
    amount: 2,
    emoji: "📶",
    rarity: "common",
    blurb: "Instant delivery to your registered number.",
    weight: 26,
  },
  {
    id: "bc1000",
    title: "1,000 Black Coins",
    label: "1,000 BC",
    type: "currency",
    kind: "coins",
    value: 1000,
    amount: 1000,
    emoji: "💎",
    rarity: "uncommon",
    blurb: "A huge drop straight into your balance.",
    weight: 6,
  },
  {
    id: "bc100",
    title: "100 Black Coins",
    label: "100 BC",
    type: "currency",
    kind: "coins",
    value: 100,
    amount: 100,
    emoji: "🪙",
    rarity: "common",
    blurb: "Spend it on DMs, nominations or draw tickets.",
    weight: 40,
  },
  {
    id: "vip7",
    title: "7-Day VIP Pass",
    label: "7-Day VIP",
    type: "perk",
    kind: "vip",
    value: 7,
    amount: 7,
    emoji: "👑",
    rarity: "rare",
    blurb: "A week of VIP perks — skip ads after your messages.",
    weight: 12,
  },
  {
    id: "ticket",
    title: "Sweepstakes Ticket",
    label: "1 Sweepstake Ticket",
    type: "ticket",
    kind: "ticket",
    value: 1,
    amount: 1,
    emoji: "🎟️",
    rarity: "uncommon",
    blurb: "One free entry into the weekly draw.",
    weight: 16,
  },
];

/** Legacy alias — the wheel renders these slices. */
export const SPIN_SLICES: SpinPrize[] = REWARD_POOL;

/** Pick a weighted spin slice. Deterministic-looking but random. */
export function weightedSpin(slices: SpinPrize[]): SpinPrize {
  const total = slices.reduce((n, s) => n + s.weight, 0);
  let r = Math.random() * total;
  for (const s of slices) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return slices[slices.length - 1]!;
}

export const DM_UNLOCK_COST = 1;

/** Panda tiers earned through reputation score. */
export type Tier = { min: number; name: string; emoji: string; blurb: string };

export const TIERS: Tier[] = [
  { min: 0, name: "Cub", emoji: "🐣", blurb: "Just hatched into the circle" },
  { min: 150, name: "Sprout", emoji: "🌱", blurb: "Finding your voice" },
  { min: 400, name: "Bamboo", emoji: "🎋", blurb: "A regular in the groves" },
  { min: 800, name: "Shadow", emoji: "🌑", blurb: "Anonymous and everywhere" },
  { min: 1400, name: "Legend", emoji: "👑", blurb: "Circle Panda royalty" },
];

export function pandaTier(score: number) {
  let tier: Tier = TIERS[0]!;
  for (const t of TIERS) if (score >= t.min) tier = t;
  const next = TIERS.find((t) => t.min > score) ?? null;
  const progress = next ? Math.round(((score - tier.min) / (next.min - tier.min)) * 100) : 100;
  return { ...tier, next, progress };
}

/** 1–5 star rating derived from reputation. */
export function starRating(score: number) {
  return Math.min(5, Math.round((1 + (score / 1400) * 4) * 10) / 10);
}

/** Level-based Panda tier ladder (XP progression). */
export type LevelTier = {
  levelReq: number;
  title: string;
  maxStars: number;
  xpPerLevel: number;
};

export const PANDA_LEVEL_TIERS: LevelTier[] = [
  { levelReq: 1, title: "Panda Cub", maxStars: 5, xpPerLevel: 100 },
  { levelReq: 5, title: "Novice Panda", maxStars: 5, xpPerLevel: 250 },
  { levelReq: 10, title: "Panda Warrior", maxStars: 5, xpPerLevel: 500 },
  { levelReq: 15, title: "Panda Master", maxStars: 5, xpPerLevel: 1000 },
  { levelReq: 25, title: "Panda Legend", maxStars: 5, xpPerLevel: 2500 },
  { levelReq: 50, title: "Panda General", maxStars: 5, xpPerLevel: 5000 },
];

export function levelTier(level: number): LevelTier {
  return [...PANDA_LEVEL_TIERS].reverse().find((t) => level >= t.levelReq) ?? PANDA_LEVEL_TIERS[0]!;
}

export function levelProgress(level: number, xp: number) {
  const tier = levelTier(level);
  const levelsInTier = level - tier.levelReq + 1;
  const starsEarned = Math.min(Math.max(levelsInTier, 1), tier.maxStars);
  const xpForNext = tier.xpPerLevel;
  const xpPct = Math.min((xp / xpForNext) * 100, 100);
  return { tier, starsEarned, xpForNext, xpPct };
}

/** Apply an XP gain, leveling up across the tier ladder as needed. */
export function gainXp(level: number, xp: number, gained: number) {
  let nl = level;
  let nx = xp + gained;
  while (nx >= levelTier(nl).xpPerLevel) {
    nx -= levelTier(nl).xpPerLevel;
    nl += 1;
  }
  return { level: nl, xp: nx };
}

type State = {
  coins: number;
  reputation: number;
  level: number;
  xp: number;
  posts: Post[];
  groups: GroupChat[];
  threads: Thread[];
  events: PandaEvent[];
  leaderboard: LeaderboardEntry[];
  nominees: Nominee[];
  votesUsedToday: number;
  voteDay: string;
  votedIds: string[];
  weekEndsAt: number;
  spotlights: Spotlight[];
  sweepTickets: SweepTicket[];
  weeklyDrawEndsAt: number;
  monthlyDrawEndsAt: number;
  lastSpinAt: number | null;
  sweepWinners: SweepWinner[];
  hotSeats: HotSeatSession[];
  lastAdShownAt: number | null;
  skipPasses: number;
  isVip: boolean;
  vipExpiresAt: number | null;
  datingProfile: DatingProfile | null;
};

const now = Date.now();

const initialState: State = {
  coins: 100,
  reputation: 620,
  level: 12,
  xp: 750,
  isVip: false,
  vipExpiresAt: null,
  datingProfile: null,
  posts: [
    {
      id: "post-1",
      author: "Midnight Panda",
      body: "I told my whole team I love early standups. I have never once been awake for one. 🐼",
      at: now - 1000 * 60 * 14,
      likes: 28,
      replies: [
        {
          id: "reply-1-1",
          author: "Quiet Leaf",
          body: "Confession of the year honestly.",
          at: now - 1000 * 60 * 9,
        },
      ],
    },
    {
      id: "post-2",
      author: "Silent Sprout",
      body: "Moved to a new city three weeks ago and haven't spoken to anyone outside of coffee orders. Anyone else starting over?",
      at: now - 1000 * 60 * 52,
      likes: 19,
      replies: [],
    },
    {
      id: "post-3",
      author: "Paper Panda",
      body: "Unpopular opinion: the group chat that expires in 24 hours is the only honest place on the internet.",
      at: now - 1000 * 60 * 140,
      likes: 34,
      replies: [
        {
          id: "reply-3-1",
          author: "Anon Cub",
          body: "No screenshots, no history, no regrets.",
          at: now - 1000 * 60 * 120,
        },
        {
          id: "reply-3-2",
          author: "Shy Shoot",
          body: "Genuinely agree with this.",
          at: now - 1000 * 60 * 100,
        },
      ],
    },
  ],
  groups: [
    {
      id: "g1",
      name: "Late Night Confessions",
      topic: "Say the thing you can't say anywhere else.",
      members: 42,
      openedAt: null,
      messages: [],
    },
    {
      id: "g2",
      name: "Lagos Bamboo Club",
      topic: "City meetups, food spots, and chaos.",
      members: 128,
      openedAt: now - 1000 * 60 * 60 * 3,
      messages: [
        {
          id: "msg-g2-1",
          author: "Bamboo Ghost",
          body: "Room is open! 21 hours on the clock.",
          at: now - 1000 * 60 * 175,
        },
        {
          id: "msg-g2-2",
          author: "Anon Cub",
          body: "Who's doing the Saturday walk?",
          at: now - 1000 * 60 * 40,
        },
      ],
    },
    {
      id: "g3",
      name: "Job Hunt Support",
      topic: "Anonymous venting + referrals.",
      members: 76,
      openedAt: null,
      messages: [],
    },
    {
      id: "g4",
      name: "Late Night Philosophers",
      topic: "Discussions that only make sense after 1 AM.",
      members: 94,
      openedAt: now - 1000 * 60 * 60 * 1,
      messages: [
        {
          id: "msg-g4-1",
          author: "Night Owl #99",
          body: "Are we living in a simulation or just tired?",
          at: now - 1000 * 60 * 50,
        },
      ],
    },
    {
      id: "g5",
      name: "Street Food Crawl",
      topic: "Suya, shawarma, and hidden roadside gems.",
      members: 142,
      openedAt: null,
      messages: [],
    },
    {
      id: "g6",
      name: "Indie Game Creators",
      topic: "Dev logs, playtests, and design critiques.",
      members: 58,
      openedAt: now - 1000 * 60 * 60 * 5,
      messages: [],
    },
  ],
  threads: [
    {
      id: "t1",
      name: "Anon #4821",
      kind: "dm",
      blurb: "From your post about starting over",
      messages: [
        {
          id: "msg-t1-1",
          body: "Hey, saw your feed post. New city too. Wanna compare notes?",
          at: now - 1000 * 60 * 30,
          mine: false,
        },
        {
          id: "msg-t1-2",
          body: "Definitely! Still trying to figure out which cafe has the best power backup.",
          at: now - 1000 * 60 * 25,
          mine: true,
        },
        {
          id: "msg-t1-3",
          body: "Check out the one in Yaba near the tech hub. Super quiet on weekdays.",
          at: now - 1000 * 60 * 20,
          mine: false,
        },
        {
          id: "msg-t1-4",
          body: "Adding that to my maps right now. Are you going to the karaoke night?",
          at: now - 1000 * 60 * 15,
          mine: true,
        },
        {
          id: "msg-t1-5",
          body: "Yeah, already grabbed a mask! See you there anonymously 🐼",
          at: now - 1000 * 60 * 10,
          mine: false,
        },
        {
          id: "msg-t1-6",
          body: "Awesome, I'll be the one failing the high notes.",
          at: now - 1000 * 60 * 5,
          mine: true,
        },
      ],
    },
    {
      id: "t2",
      name: "Anon #1190",
      kind: "dm",
      blurb: "Bamboo Club regular",
      messages: [
        { id: "msg-t2-1", body: "See you at the walk 🐼", at: now - 1000 * 60 * 300, mine: false },
      ],
    },
    {
      id: "t3",
      name: "Moonlit Panda",
      kind: "dating",
      blurb: "Matched from Dating",
      startedAt: now - 1000 * 60 * 70,
      messages: [
        {
          id: "msg-t3-1",
          body: "Your profile said you'd rather stay in. Same. What's your comfort movie?",
          at: now - 1000 * 60 * 65,
          mine: false,
        },
        {
          id: "msg-t3-2",
          body: "Spirited Away or any Studio Ghibli film with rain. You?",
          at: now - 1000 * 60 * 55,
          mine: true,
        },
        {
          id: "msg-t3-3",
          body: "Great taste! For me it's Before Sunrise. Seen it maybe 10 times.",
          at: now - 1000 * 60 * 45,
          mine: false,
        },
        {
          id: "msg-t3-4",
          body: "A romantic at heart! Didn't see that coming from your bio haha.",
          at: now - 1000 * 60 * 35,
          mine: true,
        },
        {
          id: "msg-t3-5",
          body: "Guilty as charged! Shall we grab tea sometime this week?",
          at: now - 1000 * 60 * 20,
          mine: false,
        },
      ],
    },
    {
      id: "t4",
      name: "Cocoa Cub",
      kind: "dating",
      blurb: "Matched from Dating",
      startedAt: now - 1000 * 60 * 60 * 6,
      messages: [],
    },
  ],
  events: [
    {
      id: "e1",
      title: "Anonymous Karaoke Night",
      tag: "Nightlife",
      date: "Fri, Aug 21",
      time: "8:00 PM",
      place: "The Bamboo Room, Yaba",
      cost: 10,
      blurb: "Masks on, names off. Sing badly with strangers.",
      details:
        "Everyone gets a panda mask at the door and a random handle sticker. No real names, no phones on the floor. Song queue opens at 8, last call at midnight. RSVP holds your slot for 30 minutes past start.",
      rsvp: false,
    },
    {
      id: "e2",
      title: "Sunrise Bamboo Walk",
      tag: "Outdoors",
      date: "Sun, Aug 23",
      time: "6:30 AM",
      place: "Lekki Conservation Trail",
      cost: 0,
      blurb: "5km slow walk. Talk or don't. Both fine.",
      details:
        "A quiet 5km loop for people who like company without small talk. Meet at the trailhead gate, look for the green panda flag. Water provided. Group chat opens 24 hours before start.",
      rsvp: false,
    },
    {
      id: "e3",
      title: "Blind Coffee Roulette",
      tag: "Dating",
      date: "Sat, Aug 29",
      time: "4:00 PM",
      place: "Circle Cafe, Ikoyi",
      cost: 25,
      blurb: "Twelve people, six tables, twenty minute rotations.",
      details:
        "You are seated with a match from your Dating tab, but neither of you knows which one. Twenty minute rotations, six rounds. At the end you pick one handle to keep chatting with. Costs 25 BC to hold a seat.",
      rsvp: false,
    },
    {
      id: "e4",
      title: "Confession Open Mic",
      tag: "Community",
      date: "Wed, Sep 3",
      time: "7:00 PM",
      place: "Panda Loft, Surulere",
      cost: 5,
      blurb: "Read a stranger's confession out loud. Anonymously.",
      details:
        "Submit a confession to the bowl on arrival, draw someone else's, and read it to the room. Nothing is recorded. Fifty seats, first come first served once RSVPs open.",
      rsvp: false,
    },
    {
      id: "e5",
      title: "Midnight Board Game Underground",
      tag: "Social",
      date: "Sat, Sep 6",
      time: "10:00 PM",
      place: "Secret Cellar, Victoria Island",
      cost: 15,
      blurb: "Secret identities, bluffing games, and zero awkwardness.",
      details:
        "Catan, Avalon, and Coup under dim lights. Drinks and snacks on the house. Winner of each table takes home 50 BC.",
      rsvp: false,
    },
    {
      id: "e6",
      title: "Silent Book Club & Tea",
      tag: "Wellness",
      date: "Sun, Sep 7",
      time: "3:00 PM",
      place: "Quiet Garden, Ikeja",
      cost: 0,
      blurb: "An hour of silent reading followed by optional chats.",
      details:
        "Bring whatever you are currently reading. Herbal tea and mats supplied. Perfect for introverts seeking peaceful community.",
      rsvp: false,
    },
  ],
  leaderboard: [
    { id: "l1", name: "Bamboo Ghost", score: 1520, posts: 214 },
    { id: "l2", name: "Midnight Panda", score: 1180, posts: 176 },
    { id: "l3", name: "Quiet Leaf", score: 870, posts: 131 },
    { id: "l5", name: "Paper Panda", score: 540, posts: 88 },
    { id: "l6", name: "Shy Shoot", score: 310, posts: 54 },
    { id: "l7", name: "Anon Cub", score: 140, posts: 22 },
  ],
  nominees: [
    {
      id: "n1",
      name: "Moonlit Panda",
      kind: "wcw",
      emoji: "🌙",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
      blurb: "Reads books at 2am, replies at 2pm.",
      votes: 148,
    },
    {
      id: "n2",
      name: "Cocoa Cub",
      kind: "wcw",
      emoji: "🍫",
      avatarUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
      blurb: "Bakes for strangers. Plant hoarder.",
      votes: 121,
    },
    {
      id: "n3",
      name: "Quiet Storm",
      kind: "wcw",
      emoji: "⛈️",
      avatarUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
      blurb: "Loud in group chats, shy in person.",
      votes: 88,
    },
    {
      id: "n_w4",
      name: "Starlight Panda",
      kind: "wcw",
      emoji: "✨",
      avatarUrl:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80",
      blurb: "Astrophysics nerd with impeccable playlist taste.",
      votes: 79,
    },
    {
      id: "n_w5",
      name: "Honey Amber",
      kind: "wcw",
      emoji: "🍯",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
      blurb: "Always knows where the good matcha is hiding.",
      votes: 72,
    },
    {
      id: "n_w6",
      name: "Velvet Whisper",
      kind: "wcw",
      emoji: "🎨",
      avatarUrl:
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&auto=format&fit=crop&q=80",
      blurb: "Paints city sunsets from rooftops. Secret poet.",
      votes: 65,
    },
    {
      id: "n_w7",
      name: "Emerald Fern",
      kind: "wcw",
      emoji: "🌿",
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
      blurb: "Smiles at every dog on the Lekki trail.",
      votes: 54,
    },
    {
      id: "n4",
      name: "Bamboo Bandit",
      kind: "mcm",
      emoji: "🎋",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
      blurb: "Runs marathons to avoid small talk.",
      votes: 133,
    },
    {
      id: "n5",
      name: "Paper Panda",
      kind: "mcm",
      emoji: "📄",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80",
      blurb: "Writes the confessions everyone quotes.",
      votes: 97,
    },
    {
      id: "n6",
      name: "Silent Sprout",
      kind: "mcm",
      emoji: "🌱",
      avatarUrl:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80",
      blurb: "New in town, already a legend.",
      votes: 61,
    },
    {
      id: "n_m4",
      name: "Midnight Architect",
      kind: "mcm",
      emoji: "📐",
      avatarUrl:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80",
      blurb: "Designs bridges by day, beats by night.",
      votes: 58,
    },
    {
      id: "n_m5",
      name: "Solar Flare",
      kind: "mcm",
      emoji: "☀️",
      avatarUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80",
      blurb: "Brings energy to every silent room.",
      votes: 49,
    },
    {
      id: "n_m6",
      name: "Echo Wave",
      kind: "mcm",
      emoji: "🌊",
      avatarUrl:
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80",
      blurb: "Surfs, makes sourdough, talks to no one before 10 AM.",
      votes: 42,
    },
    {
      id: "n_m7",
      name: "Cedar Wolf",
      kind: "mcm",
      emoji: "🐺",
      avatarUrl:
        "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800&auto=format&fit=crop&q=80",
      blurb: "Campfire storyteller and amateur astronomer.",
      votes: 36,
    },
  ],
  votesUsedToday: 0,
  voteDay: "",
  votedIds: [],
  weekEndsAt: now + 3 * DAY_MS,
  spotlights: [],
  sweepTickets: [],
  weeklyDrawEndsAt: now + 2 * DAY_MS + 7 * 3600 * 1000,
  monthlyDrawEndsAt: now + 12 * DAY_MS,
  lastSpinAt: null,
  sweepWinners: [
    {
      draw: "weekly",
      name: "Paper Panda",
      prize: "50 BC Panda Coin package",
      wonAt: now - 3 * DAY_MS,
    },
    {
      draw: "monthly",
      name: "Bamboo Ghost",
      prize: MONTHLY_JACKPOT_PRIZE,
      wonAt: now - 20 * DAY_MS,
    },
  ],
  hotSeats: [],
  lastAdShownAt: null,
  skipPasses: 0,
};

const HOT_SEAT_ROSTER = ["Bamboo Ghost", "Anon Cub", "Midnight Panda", "Shy Shoot", "Paper Panda"];

type StoreValue = State & {
  addPost: (body: string) => void;
  addReply: (postId: string, body: string) => void;
  openGroup: (id: string) => void;
  sendGroupMessage: (id: string, body: string) => void;
  isGroupExpired: (g: GroupChat) => boolean;
  sendMessage: (threadId: string, body: string) => void;
  startDatingChat: (name: string) => string;
  startDmWithAuthor: (author: string, blurb: string) => string;
  openPaidDm: (author: string, blurb: string) => string | null;
  addCoins: (amount: number, reason?: string) => void;
  spendCoins: (amount: number, reason?: string) => boolean;
  isAdmin: boolean;
  nominate: (
    name: string,
    kind: CrushKind,
    blurb: string,
    emoji: string,
    avatarUrl?: string,
  ) => boolean;
  submitCrushPhoto: (params: {
    name: string;
    kind: CrushKind;
    blurb: string;
    emoji: string;
    avatarUrl: string;
    userId?: string;
    userEmail?: string;
  }) => boolean;
  voteFor: (id: string) => void;
  freeVotesLeft: number;
  mySpotlight: Spotlight | null;
  toggleRsvp: (id: string) => void;
  buyTicket: (draw: DrawKind) => boolean;
  myTicketCount: (draw: DrawKind) => number;
  hotSeatFor: (groupId: string) => HotSeatSession | null;
  startHotSeat: (groupId: string) => void;
  stopHotSeat: (groupId: string) => void;
  rotateHotSeat: (groupId: string) => void;
  joinHotSeatQueue: (groupId: string) => void;
  useSkipPass: (groupId: string) => void;
  extendHotSeat: (groupId: string, seconds: number) => void;
  markAdShown: () => void;
  grantSkipPass: () => void;
  grantFreeSpin: () => void;
  spinWheel: () => SpinPrize | null;
  canSpin: boolean;
  nextSpinAt: number | null;
  activateVip: (days: number) => void;
  createGroup: (name: string, topic: string) => GroupChat;
  createEvent: (event: Omit<PandaEvent, "id" | "rsvp">) => PandaEvent;
  registerDatingProfile: (profile: Omit<DatingProfile, "registeredAt">) => void;
  appendIncomingMessage: (threadId: string, msg: ChatMessage) => void;
  syncCoinsFromBackend: (newCoins: number) => void;
};

const StoreContext = createContext<StoreValue | null>(null);
const KEY = "circle-panda-state-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as Partial<State>) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Sync real profile data from Supabase if authenticated
  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const user = getStoredUser();
    if (!user || user.id.startsWith("usr_")) return;

    void supabase
      .from("profiles")
      .select("coins, reputation, level, xp, is_vip, vip_expires_at, last_spin_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setState((s) => ({
            ...s,
            coins: typeof data.coins === "number" ? data.coins : s.coins,
            reputation: typeof data.reputation === "number" ? data.reputation : s.reputation,
            level: typeof data.level === "number" ? data.level : s.level,
            xp: typeof data.xp === "number" ? data.xp : s.xp,
            isVip: Boolean(data.is_vip),
            vipExpiresAt: data.vip_expires_at
              ? new Date(data.vip_expires_at).getTime()
              : s.vipExpiresAt,
            lastSpinAt: data.last_spin_at ? new Date(data.last_spin_at).getTime() : s.lastSpinAt,
          }));
        }
      });
  }, []);

  const syncCoinsFromBackend = useCallback((newCoins: number) => {
    setState((s) => ({ ...s, coins: newCoins }));
  }, []);

  const appendIncomingMessage = useCallback((threadId: string, msg: ChatMessage) => {
    setState((s) => {
      const thread = s.threads.find((t) => t.id === threadId);
      if (!thread) return s;
      if (thread.messages.some((m) => m.id === msg.id)) return s;
      return {
        ...s,
        threads: s.threads.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t,
        ),
      };
    });
  }, []);

  const addPost = useCallback((body: string) => {
    const user = getStoredUser();
    if (hasSupabaseConfig() && user && !user.id.startsWith("usr_")) {
      void submitServerConfession(body).then((res) => {
        if (res.success && typeof res.newBalance === "number") {
          setState((s) => ({ ...s, coins: res.newBalance! }));
        }
      });
    }

    setState((s) => {
      const { level, xp } = gainXp(s.level, s.xp, 15);
      return {
        ...s,
        coins: s.coins + 2,
        reputation: s.reputation + 15,
        level,
        xp,
        posts: [
          { id: rid(), author: "You (anonymous)", body, at: Date.now(), replies: [] },
          ...s.posts,
        ],
      };
    });
    toast.success("Posted anonymously 🐼", { description: "+2 BC · +15 XP earned." });
  }, []);

  const addReply = useCallback((postId: string, body: string) => {
    setState((s) => {
      const { level, xp } = gainXp(s.level, s.xp, 5);
      return {
        ...s,
        coins: s.coins + 1,
        reputation: s.reputation + 5,
        level,
        xp,
        posts: s.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                replies: [
                  ...p.replies,
                  { id: rid(), author: "You (anonymous)", body, at: Date.now() },
                ],
              }
            : p,
        ),
      };
    });
  }, []);

  const openGroup = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) =>
        g.id === id
          ? {
              ...g,
              openedAt: Date.now(),
              messages: [
                ...g.messages,
                {
                  id: rid(),
                  author: "Circle Panda",
                  body: "Room opened. This chat locks in 24 hours.",
                  at: Date.now(),
                },
              ],
            }
          : g,
      ),
    }));
    toast.success("Group chat opened", {
      description: `All members notified · 24:00:00 countdown started`,
    });
  }, []);

  const isGroupExpired = useCallback(
    (g: GroupChat) => g.openedAt !== null && Date.now() - g.openedAt >= DAY_MS,
    [],
  );

  const sendGroupMessage = useCallback((id: string, body: string) => {
    setState((s) => {
      const seat = s.hotSeats.find((h) => h.group_id === id);
      const hot = seat?.current_user_id === ME_ID;
      return {
        ...s,
        groups: s.groups.map((g) =>
          g.id === id
            ? {
                ...g,
                messages: [
                  ...g.messages,
                  {
                    id: rid(),
                    author: hot ? "You (anonymous)" : randomHandle(),
                    body,
                    at: Date.now(),
                    mine: true,
                    hotSeat: hot,
                  },
                ],
              }
            : g,
        ),
      };
    });
  }, []);

  const hotSeatFor = useCallback(
    (groupId: string) => state.hotSeats.find((h) => h.group_id === groupId) ?? null,
    [state.hotSeats],
  );

  const startHotSeat = useCallback((groupId: string) => {
    setState((s) => {
      if (s.hotSeats.some((h) => h.group_id === groupId)) return s;
      const session: HotSeatSession = {
        group_id: groupId,
        current_user_id: ME_ID,
        current_user_name: "You (anonymous)",
        started_at: Date.now(),
        duration_seconds: HOT_SEAT_DEFAULT_SECONDS,
        queue: HOT_SEAT_ROSTER,
      };
      return {
        ...s,
        hotSeats: [...s.hotSeats, session],
        groups: s.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                messages: [
                  ...g.messages,
                  {
                    id: rid(),
                    author: "Circle Panda",
                    body: "🔥 Hot Seat mode started — you're up first for 5 minutes.",
                    at: Date.now(),
                  },
                ],
              }
            : g,
        ),
      };
    });
    toast.success("Hot Seat mode on 🔥", {
      description: "You're in the seat for 5:00. Next up queued.",
    });
  }, []);

  const stopHotSeat = useCallback((groupId: string) => {
    setState((s) => ({ ...s, hotSeats: s.hotSeats.filter((h) => h.group_id !== groupId) }));
  }, []);

  const rotateHotSeat = useCallback((groupId: string) => {
    setState((s) => ({
      ...s,
      hotSeats: s.hotSeats.map((h) => {
        if (h.group_id !== groupId || h.queue.length === 0) return h;
        const [next, ...rest] = h.queue;
        return {
          ...h,
          current_user_id: next === "You (anonymous)" ? ME_ID : next!,
          current_user_name: next!,
          started_at: Date.now(),
          duration_seconds: HOT_SEAT_DEFAULT_SECONDS,
          queue: [...rest, h.current_user_name],
        };
      }),
    }));
  }, []);

  const joinHotSeatQueue = useCallback((groupId: string) => {
    let joined = false;
    setState((s) => ({
      ...s,
      hotSeats: s.hotSeats.map((h) => {
        if (h.group_id !== groupId) return h;
        if (h.current_user_id === ME_ID || h.queue.includes("You (anonymous)")) return h;
        joined = true;
        return { ...h, queue: [...h.queue, "You (anonymous)"] };
      }),
    }));
    if (joined) toast.success("You joined the Hot Seat queue");
  }, []);

  const useSkipPass = useCallback((groupId: string) => {
    let used = false;
    setState((s) => {
      if (s.skipPasses < 1) return s;
      used = true;
      return {
        ...s,
        skipPasses: s.skipPasses - 1,
        hotSeats: s.hotSeats.map((h) =>
          h.group_id === groupId
            ? {
                ...h,
                current_user_id: ME_ID,
                current_user_name: "You (anonymous)",
                started_at: Date.now(),
                duration_seconds: HOT_SEAT_DEFAULT_SECONDS,
                queue: h.queue.filter((q) => q !== "You (anonymous)"),
              }
            : h,
        ),
      };
    });
    toast[used ? "success" : "error"](used ? "Skip-the-queue pass used 🔥" : "No skip passes left");
  }, []);

  const extendHotSeat = useCallback((groupId: string, seconds: number) => {
    setState((s) => ({
      ...s,
      hotSeats: s.hotSeats.map((h) =>
        h.group_id === groupId ? { ...h, duration_seconds: h.duration_seconds + seconds } : h,
      ),
    }));
  }, []);

  const markAdShown = useCallback(() => {
    setState((s) => ({ ...s, lastAdShownAt: Date.now() }));
  }, []);

  const grantSkipPass = useCallback(() => {
    setState((s) => ({ ...s, skipPasses: s.skipPasses + 1 }));
  }, []);

  const spendCoins = useCallback((amount: number, reason?: string) => {
    let ok = false;
    setState((s) => {
      if (s.coins < amount) return s;
      ok = true;
      return { ...s, coins: s.coins - amount };
    });
    if (ok) {
      toast.success(`-${amount} BC`, reason ? { description: reason } : undefined);
    } else {
      toast.error("Not enough Panda Coins", { description: `You need ${amount} BC for this.` });
    }
    return ok;
  }, []);

  const grantFreeSpin = useCallback(() => {
    setState((s) => ({ ...s, lastSpinAt: null }));
  }, []);

  const sendMessage = useCallback((threadId: string, body: string) => {
    const cleanBody = body.trim();
    if (!cleanBody) return;

    const user = getStoredUser();
    const hasBackend = hasSupabaseConfig();

    if (hasBackend && user && !user.id.startsWith("usr_")) {
      void sendRealtimeMessage(threadId, cleanBody, user.id).then((res) => {
        if (res.success && res.message) {
          setState((s) => ({
            ...s,
            coins: typeof res.newBalance === "number" ? res.newBalance : Math.max(0, s.coins - 1),
            threads: s.threads.map((t) =>
              t.id === threadId ? { ...t, messages: [...t.messages, res.message!] } : t,
            ),
          }));
          toast("−1 BC spent 🪙", { description: "Message delivered anonymously in real-time." });
        } else if (res.error && res.error !== "LOCAL_FALLBACK") {
          if (res.error.includes("INSUFFICIENT_COINS")) {
            toast.error("Not enough Panda Coins", {
              description: "Each message costs 1 BC. Watch an ad to get more free coins!",
            });
          } else {
            toast.error("Failed to deliver message", { description: res.error });
          }
        }
      });
      return;
    }

    let blocked = false;
    setState((s) => {
      if (s.coins < 1) {
        blocked = true;
        return s;
      }
      return {
        ...s,
        coins: s.coins - 1,
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: [
                  ...t.messages,
                  { id: rid(), body: cleanBody, at: Date.now(), mine: true },
                ],
              }
            : t,
        ),
      };
    });
    if (blocked) {
      toast.error("Not enough Panda Coins", { description: "Each message costs 1 BC." });
    } else {
      toast("−1 BC spent 🪙", { description: "Message delivered anonymously." });
    }
  }, []);

  const startDatingChat = useCallback((name: string) => {
    const id = rid();
    setState((s) => {
      const existing = s.threads.find((t) => t.kind === "dating" && t.name === name);
      const opener: ChatMessage = {
        id: rid(),
        body: "I like you, let's have a conversation",
        at: Date.now(),
        mine: true,
      };
      if (existing) {
        if (existing.messages.some((m) => m.body === opener.body)) return s;
        return {
          ...s,
          threads: s.threads.map((t) =>
            t.id === existing.id ? { ...t, messages: [...t.messages, opener] } : t,
          ),
        };
      }
      return {
        ...s,
        threads: [
          {
            id,
            name,
            kind: "dating",
            blurb: "Matched from Dating",
            messages: [opener],
            startedAt: Date.now(),
          },
          ...s.threads,
        ],
      };
    });
    return id;
  }, []);

  const startDmWithAuthor = useCallback((author: string, blurb: string) => {
    const id = rid();
    setState((s) => {
      const existing = s.threads.find((t) => t.kind === "dm" && t.name === author);
      if (existing) return s;
      return {
        ...s,
        threads: [{ id, name: author, kind: "dm", blurb, messages: [] }, ...s.threads],
      };
    });
    return id;
  }, []);

  const openPaidDm = useCallback((author: string, blurb: string) => {
    const id = rid();
    let result: string | null = id;
    setState((s) => {
      const existing = s.threads.find((t) => t.kind === "dm" && t.name === author);
      if (existing) {
        result = existing.id;
        return s;
      }
      if (s.coins < DM_UNLOCK_COST) {
        result = null;
        return s;
      }
      return {
        ...s,
        coins: s.coins - DM_UNLOCK_COST,
        threads: [{ id, name: author, kind: "dm", blurb, messages: [] }, ...s.threads],
      };
    });
    return result;
  }, []);

  const addCoins = useCallback((amount: number, reason?: string) => {
    setState((s) => ({ ...s, coins: s.coins + amount }));
    toast.success(`+${amount} BC added 🪙`, { description: reason ?? "Free coins claimed." });
  }, []);

  const nominate = useCallback(
    (name: string, kind: CrushKind, blurb: string, emoji: string, avatarUrl?: string) => {
      let ok = true;
      setState((s) => {
        if (s.coins < NOMINATION_COST) {
          ok = false;
          return s;
        }
        return {
          ...s,
          coins: s.coins - NOMINATION_COST,
          nominees: [
            {
              id: rid(),
              name,
              kind,
              emoji,
              avatarUrl,
              blurb,
              votes: 1,
              mine: name === "You (anonymous)",
              submittedAt: Date.now(),
              status: "approved",
            },
            ...s.nominees,
          ],
        };
      });
      if (ok) {
        toast.success("Nomination live 💫", {
          description: `−${NOMINATION_COST} BC · added to this week's ${kind.toUpperCase()} tray.`,
        });
      } else {
        toast.error("Not enough Panda Coins", {
          description: `Nominating costs ${NOMINATION_COST} BC.`,
        });
      }
      return ok;
    },
    [],
  );

  const submitCrushPhoto = useCallback(
    ({
      name,
      kind,
      blurb,
      emoji,
      avatarUrl,
      userId,
      userEmail,
    }: {
      name: string;
      kind: CrushKind;
      blurb: string;
      emoji: string;
      avatarUrl: string;
      userId?: string;
      userEmail?: string;
    }) => {
      let isUpdate = false;
      setState((s) => {
        // Prevent duplicate submissions by updating existing entry for this kind
        const existingIndex = s.nominees.findIndex(
          (n) =>
            n.kind === kind &&
            (n.mine ||
              (userEmail && n.userEmail && n.userEmail.toLowerCase() === userEmail.toLowerCase()) ||
              (userId && n.userId && n.userId === userId)),
        );

        if (existingIndex >= 0) {
          isUpdate = true;
          const updated = [...s.nominees];
          const prev = updated[existingIndex];
          updated[existingIndex] = {
            ...prev,
            name: name || prev.name,
            blurb: blurb || prev.blurb,
            emoji: emoji || prev.emoji,
            avatarUrl,
            userId: userId || prev.userId,
            userEmail: userEmail || prev.userEmail,
            submittedAt: Date.now(),
            status: "approved",
            mine: true,
          };
          return {
            ...s,
            nominees: updated,
          };
        }

        const newNominee: Nominee = {
          id: rid(),
          name,
          kind,
          emoji,
          avatarUrl,
          blurb: blurb || "Opted in with photo.",
          votes: 1,
          mine: true,
          userId,
          userEmail,
          submittedAt: Date.now(),
          status: "approved",
        };

        return {
          ...s,
          nominees: [newNominee, ...s.nominees],
        };
      });

      if (isUpdate) {
        toast.success("Photo entry updated! 📸", {
          description: `Your ${kind.toUpperCase()} entry was updated and is live in voting.`,
        });
      } else {
        toast.success("Photo entry live! 🌟", {
          description: `You are now live in this week's ${kind.toUpperCase()} voting feed!`,
        });
      }
      return true;
    },
    [],
  );

  const voteFor = useCallback((id: string) => {
    let outcome: "free" | "paid" | "broke" = "free" as "free" | "paid" | "broke";
    setState((s) => {
      const day = todayKey();
      const used = s.voteDay === day ? s.votesUsedToday : 0;
      const paid = used >= FREE_DAILY_VOTES;
      if (paid && s.coins < EXTRA_VOTE_COST) {
        outcome = "broke";
        return s;
      }
      outcome = paid ? "paid" : "free";
      return {
        ...s,
        coins: paid ? s.coins - EXTRA_VOTE_COST : s.coins,
        voteDay: day,
        votesUsedToday: used + 1,
        votedIds: [...s.votedIds, id],
        nominees: s.nominees.map((n) => (n.id === id ? { ...n, votes: n.votes + 1 } : n)),
      };
    });
    if (outcome === "broke") {
      toast.error("Out of votes and coins", {
        description: `Extra votes cost ${EXTRA_VOTE_COST} BC each.`,
      });
    } else if (outcome === "paid") {
      toast("Vote counted · −1 BC 🪙");
    } else {
      toast.success("Vote counted 💗", { description: "Free daily vote used." });
    }
  }, []);

  /** Close the week: crown top WCW + MCM, pay the winners, reset the clock. */
  useEffect(() => {
    const check = () => {
      setState((s) => {
        if (Date.now() < s.weekEndsAt) return s;
        const winners: Spotlight[] = (["wcw", "mcm"] as CrushKind[])
          .map((kind) => {
            const top = [...s.nominees]
              .filter((n) => n.kind === kind)
              .sort((a, b) => b.votes - a.votes)[0];
            return top ? { kind, name: top.name, wonAt: Date.now() } : null;
          })
          .filter(Boolean) as Spotlight[];
        const iWon = winners.some((w) => w.name === "You (anonymous)");
        if (iWon) {
          toast.success("You're this week's Spotlight 👑", {
            description: `+${WINNER_REWARD} BC awarded.`,
          });
        }
        return {
          ...s,
          coins: iWon ? s.coins + WINNER_REWARD : s.coins,
          spotlights: [...winners, ...s.spotlights].slice(0, 8),
          weekEndsAt: Date.now() + WEEK_MS,
          nominees: s.nominees.map((n) => ({ ...n, votes: Math.round(n.votes / 4) })),
          votedIds: [],
        };
      });
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, []);

  /** Close sweepstakes draws when their countdowns hit zero: crown a winner, reset the clock. */
  useEffect(() => {
    const check = () => {
      setState((s) => {
        const nowT = Date.now();
        let next = s;
        const picks = ["Bamboo Ghost", "Midnight Panda", "Paper Panda", "Quiet Leaf", "Anon Cub"];
        const draw = (kind: DrawKind, endsAt: number, prize: string, resetMs: number) => {
          if (nowT < endsAt) return;
          const myTickets = next.sweepTickets.filter((t) => t.draw === kind).length;
          const iWon = myTickets > 0 && Math.random() < Math.min(0.6, 0.15 + myTickets * 0.08);
          const name = iWon ? "You (anonymous)" : picks[Math.floor(Math.random() * picks.length)]!;
          const winner = { draw: kind, name, prize, wonAt: nowT };
          if (iWon) {
            const reward = kind === "monthly" ? 500 : 50;
            toast.success(`You won the ${kind} draw! 🎉`, {
              description: `+${reward} BC · ${prize}`,
            });
          }
          next = {
            ...next,
            coins: iWon ? next.coins + (kind === "monthly" ? 500 : 50) : next.coins,
            sweepWinners: [winner, ...next.sweepWinners].slice(0, 10),
            sweepTickets: next.sweepTickets.filter((t) => t.draw !== kind),
            [kind === "weekly" ? "weeklyDrawEndsAt" : "monthlyDrawEndsAt"]: nowT + resetMs,
          } as State;
        };
        draw(
          "weekly",
          s.weeklyDrawEndsAt,
          WEEKLY_DRAW_PRIZES[Math.floor(Math.random() * WEEKLY_DRAW_PRIZES.length)]!,
          WEEK_MS,
        );
        draw("monthly", s.monthlyDrawEndsAt, MONTHLY_JACKPOT_PRIZE, 30 * DAY_MS);
        return next === s ? s : next;
      });
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, []);

  const toggleRsvp = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? { ...e, rsvp: !e.rsvp } : e)),
    }));
  }, []);

  const createGroup = useCallback((name: string, topic: string): GroupChat => {
    const newGroup: GroupChat = {
      id: rid(),
      name,
      topic,
      members: 1,
      openedAt: Date.now(),
      messages: [
        {
          id: rid(),
          author: "Circle Panda",
          body: `Welcome to ${name}! This group is now active.`,
          at: Date.now(),
        },
      ],
    };
    setState((s) => ({
      ...s,
      groups: [newGroup, ...s.groups],
    }));
    return newGroup;
  }, []);

  const createEvent = useCallback((eventData: Omit<PandaEvent, "id" | "rsvp">): PandaEvent => {
    const newEvent: PandaEvent = {
      ...eventData,
      id: rid(),
      rsvp: true,
    };
    setState((s) => ({
      ...s,
      events: [newEvent, ...s.events],
    }));
    return newEvent;
  }, []);

  const registerDatingProfile = useCallback((p: Omit<DatingProfile, "registeredAt">) => {
    setState((s) => ({
      ...s,
      datingProfile: {
        ...p,
        registeredAt: Date.now(),
      },
    }));
  }, []);

  const buyTicket = useCallback((draw: DrawKind) => {
    let ok = true;
    setState((s) => {
      if (s.coins < TICKET_COST) {
        ok = false;
        return s;
      }
      return {
        ...s,
        coins: s.coins - TICKET_COST,
        sweepTickets: [...s.sweepTickets, { id: rid(), draw, at: Date.now() }],
      };
    });
    if (ok) {
      toast.success("Ticket secured 🎟️", {
        description: `−${TICKET_COST} BC · you're in the ${draw} draw.`,
      });
    } else {
      toast.error("Not enough Panda Coins", {
        description: `Tickets cost ${TICKET_COST} BC each.`,
      });
    }
    return ok;
  }, []);

  const spinWheel = useCallback(() => {
    // Read current lastSpinAt from state to check cooldown without letting
    // setState's callback narrow a captured variable's type.
    let last: number | null = null;
    setState((s) => {
      last = s.lastSpinAt;
      return s;
    });
    if (last !== null && Date.now() - last < SPIN_COOLDOWN_MS) {
      toast.error("No free spin yet", { description: "Come back in 24 hours for your next spin." });
      return null;
    }

    const user = getStoredUser();
    const hasBackend = hasSupabaseConfig();

    if (hasBackend && user && !user.id.startsWith("usr_")) {
      void executeServerSpin().then((res) => {
        if (res.success && res.prize) {
          setState((s) => ({
            ...s,
            coins: typeof res.newBalance === "number" ? res.newBalance : s.coins,
            lastSpinAt: Date.now(),
          }));
        } else if (res.error && res.error.includes("COOLDOWN")) {
          toast.error("Daily spin cooldown active", { description: res.error });
        }
      });
    }

    const slice = weightedSpin(SPIN_SLICES);
    setState((s) => {
      const tickets =
        slice.kind === "ticket"
          ? [...s.sweepTickets, { id: rid(), draw: "weekly" as DrawKind, at: Date.now() }]
          : s.sweepTickets;
      return {
        ...s,
        coins: slice.kind === "coins" ? s.coins + slice.amount : s.coins,
        sweepTickets: tickets,
        lastSpinAt: Date.now(),
      };
    });
    toast.success(`You won ${slice.title}! ${slice.emoji}`, {
      description:
        slice.kind === "ticket"
          ? "Added to the weekly draw."
          : slice.kind === "coins"
            ? "Coins added to your balance."
            : slice.kind === "data"
              ? "Instant delivery — check your data balance shortly."
              : slice.kind === "vip"
                ? "VIP perks unlocked for 7 days."
                : "Grand prize! We'll reach out to arrange delivery.",
    });

    return slice;
  }, []);

  const canSpin = state.lastSpinAt === null || Date.now() - state.lastSpinAt >= SPIN_COOLDOWN_MS;
  const nextSpinAt = state.lastSpinAt === null ? null : state.lastSpinAt + SPIN_COOLDOWN_MS;

  const activateVip = useCallback((days: number) => {
    setState((s) => {
      const currentTime = Date.now();
      const currentExpiry =
        s.vipExpiresAt && s.vipExpiresAt > currentTime ? s.vipExpiresAt : currentTime;
      return {
        ...s,
        isVip: true,
        vipExpiresAt: currentExpiry + days * DAY_MS,
      };
    });
  }, []);

  const myTicketCount = useCallback(
    (draw: DrawKind) => state.sweepTickets.filter((t) => t.draw === draw).length,
    [state.sweepTickets],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      isVip: Boolean(state.isVip && (!state.vipExpiresAt || state.vipExpiresAt > Date.now())),
      addPost,
      addReply,
      openGroup,
      sendGroupMessage,
      isGroupExpired,
      sendMessage,
      startDatingChat,
      startDmWithAuthor,
      openPaidDm,
      addCoins,
      nominate,
      submitCrushPhoto,
      voteFor,
      freeVotesLeft: Math.max(
        0,
        FREE_DAILY_VOTES - (state.voteDay === todayKey() ? state.votesUsedToday : 0),
      ),
      mySpotlight: state.spotlights.find((w) => w.name === "You (anonymous)") ?? null,
      toggleRsvp,
      buyTicket,
      myTicketCount,
      spinWheel,
      canSpin,
      nextSpinAt,
      activateVip,
      hotSeatFor,
      startHotSeat,
      stopHotSeat,
      rotateHotSeat,
      joinHotSeatQueue,
      useSkipPass,
      extendHotSeat,
      markAdShown,
      grantSkipPass,
      grantFreeSpin,
      spendCoins,
      isAdmin: true,
      createGroup,
      createEvent,
      registerDatingProfile,
      appendIncomingMessage,
      syncCoinsFromBackend,
    }),
    [
      state,
      addPost,
      addReply,
      openGroup,
      sendGroupMessage,
      isGroupExpired,
      sendMessage,
      startDatingChat,
      startDmWithAuthor,
      openPaidDm,
      addCoins,
      nominate,
      submitCrushPhoto,
      voteFor,
      toggleRsvp,
      buyTicket,
      myTicketCount,
      spinWheel,
      canSpin,
      nextSpinAt,
      activateVip,
      hotSeatFor,
      startHotSeat,
      stopHotSeat,
      rotateHotSeat,
      joinHotSeatQueue,
      useSkipPass,
      extendHotSeat,
      markAdShown,
      grantSkipPass,
      grantFreeSpin,
      spendCoins,
      createGroup,
      createEvent,
      registerDatingProfile,
      appendIncomingMessage,
      syncCoinsFromBackend,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function timeAgo(at: number) {
  const diff = Math.max(0, Date.now() - at);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

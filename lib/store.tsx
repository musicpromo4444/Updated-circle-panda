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
import { supabase } from "@/integrations/supabase/client";

export type Reply = { id: string; author: string; body: string; at: number };
export type Post = {
  id: string;
  author: string;
  authorId?: string;
  body: string;
  at: number;
  replies: Reply[];
  likes?: number;
  authorVip?: boolean;
  liked?: boolean;
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
  ownerId?: string;
  memberRole?: "owner" | "admin" | "member";
  editGroupInfo?: "admins" | "admins_members";
  sendMessages?: boolean;
  approveNewMembers?: boolean;
  joinPending?: boolean;
  openedAt: number | null;
  messages: GroupChatMessage[];
  latitude?: number | null;
  longitude?: number | null;
};
export type ChatMessage = { id: string; body: string; at: number; mine: boolean; messageType?: "text" | "dating_photo"; mediaPath?: string };
export type Thread = {
  id: string;
  name: string;
  kind: "dm" | "dating";
  blurb: string;
  messages: ChatMessage[];
  /** When a dating match started; billing is free for the first 72h after the mutual match. */
  startedAt?: number;
};
export type PandaEvent = {
  id: string; title: string; tag: string; date: string; time: string; place: string;
  cost: number; currency?: string; blurb: string; details: string; rsvp: boolean;
  coverUrl?: string; venueName?: string; addressLine?: string; country?: string;
  stateProvince?: string; city?: string; area?: string; latitude?: number | null; longitude?: number | null;
  reachScope?: "worldwide" | "country" | "state" | "city" | "area"; reachCountry?: string; reachState?: string; reachCity?: string; reachArea?: string; durationMinutes?: number;
};

export type DatingProfile = {
  userId?: string;
  name: string;
  age: number;
  vibe: string;
  emoji: string;
  bio: string;
  interests: string[];
  location: string;
  country: string;
  gender: string;
  relationshipGoal: string;
  lookingFor: string[];
  lifestyle: string[];
  personality: string[];
  loveLanguage: string;
  smoking: string;
  drinking: string;
  children: string;
  education: string;
  occupation: string;
  sexualExperience: string;
  intimacyPreference: string;
  relationshipStatus: string;
  heightCm?: number | null;
  zodiac: string;
  favoriteDate: string;
  photoPath: string;
  blurredPhotoPath: string;
  registeredAt: number;
};

const rid = () => Math.random().toString(36).slice(2, 10);
export const DAY_MS = 24 * 60 * 60 * 1000;

/** WCW / MCM weekly crush voting. */
export type CrushKind = "wcw" | "mcm";
export type Nominee = {
  id: string;
  name: string;
  kind: CrushKind;
  emoji: string;
  avatarUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  blurb: string;
  votes: number;
  mine?: boolean;
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
  qualificationId?: string;
  qualificationStageId?: string;
  qualificationForm?: Record<string, unknown>;
  requiresQualification?: boolean;
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

/** Production Panda XP ladder. XP is cumulative and is used only for Panda rank. */
export type PandaRank = { minXp: number; name: string; star: number };

export const PANDA_RANKS: PandaRank[] = [
  { minXp: 0, name: "Novice", star: 1 },
  { minXp: 8000, name: "Growing", star: 2 },
  { minXp: 27000, name: "Kung Fu", star: 3 },
  { minXp: 60000, name: "Panda General", star: 4 },
  { minXp: 110000, name: "Shadow", star: 5 },
  { minXp: 250000, name: "Mysterious", star: 6 },
  { minXp: 550000, name: "Legendary", star: 7 },
];

export function pandaProgress(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp));
  let index = 0;
  for (let i = 0; i < PANDA_RANKS.length; i++) {
    if (xp >= PANDA_RANKS[i]!.minXp) index = i;
  }
  const current = PANDA_RANKS[index]!;
  const next = PANDA_RANKS[index + 1] ?? null;
  const progress = next
    ? Math.max(0, Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)))
    : 100;
  return { current, next, index, stars: current.star, totalStars: 7, progress };
}

export function levelProgress(_level: number, totalXp: number) {
  const p = pandaProgress(totalXp);
  return {
    tier: { title: p.current.name, maxStars: 7 },
    starsEarned: p.stars,
    xpForNext: p.next ? p.next.minXp : p.current.minXp,
    xpPct: p.progress,
  };
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
  datingMatches: DatingProfile[];
};

const initialState: State = {
  coins: 0,
  reputation: 0,
  level: 1,
  xp: 0,
  isVip: false,
  vipExpiresAt: null,
  datingProfile: null,
  datingMatches: [],
  posts: [],
  groups: [],
  threads: [],
  events: [],
  leaderboard: [],
  nominees: [],
  votesUsedToday: 0,
  voteDay: "",
  votedIds: [],
  weekEndsAt: 0,
  spotlights: [],
  sweepTickets: [],
  weeklyDrawEndsAt: 0,
  monthlyDrawEndsAt: 0,
  lastSpinAt: null,
  sweepWinners: [],
  hotSeats: [],
  lastAdShownAt: null,
  skipPasses: 0,
};


type StoreValue = State & {
  addPost: (body: string) => void;
  addReply: (postId: string, body: string) => void;
  openGroup: (id: string) => void;
  sendGroupMessage: (id: string, body: string) => void;
  joinGroup: (id: string) => void;
  leaveGroup: (id: string) => void;
  updateGroupInfo: (id: string, name: string, topic: string) => void;
  updateGroupSettings: (id: string, editGroupInfo: "admins" | "admins_members", sendMessages: boolean, approveNewMembers: boolean) => void;
  isGroupExpired: (g: GroupChat) => boolean;
  sendMessage: (threadId: string, body: string) => void;
  startDatingChat: (userId: string, name: string) => Promise<string | null>;
  startDmWithAuthor: (userId: string, author: string, blurb: string) => Promise<string | null>;
  openPaidDm: (userId: string, author: string, blurb: string) => Promise<string | null>;
  refreshCoins: () => Promise<void>;
  syncAccountEntitlements: () => Promise<void>;
  spendCoins: (amount: number, reason?: string) => boolean;
  isAdmin: boolean;
  nominate: (name: string, kind: CrushKind, blurb: string, emoji: string) => boolean;
  voteFor: (id: string) => void;
  freeVotesLeft: number;
  mySpotlight: Spotlight | null;
  toggleRsvp: (id: string) => void;
  startEventBlast: (eventId: string, planId?: string, paymentMethod?: "bc" | "cash") => Promise<boolean>;
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
  spinWheel: () => Promise<SpinPrize | null>;
  canSpin: boolean;
  nextSpinAt: number | null;
  activateVip: (days: number) => void;
  createGroup: (name: string, topic: string, country?: string, stateProvince?: string, city?: string, area?: string) => Promise<GroupChat | null>;
  createEvent: (event: Omit<PandaEvent, "id" | "rsvp">) => PandaEvent;
  requestDatingMatch: (userId: string) => Promise<string | null>;
  searchDatingProfiles: (filters: { ageMin?: number; ageMax?: number; country?: string; location?: string; gender?: string; relationshipGoal?: string; lookingFor?: string; lifestyle?: string; smoking?: string; drinking?: string; children?: string; education?: string; heightMin?: number; heightMax?: number; zodiac?: string; sameCountryOnly?: boolean }) => Promise<boolean>;
  registerDatingProfile: (profile: Omit<DatingProfile, "registeredAt" | "userId">) => void;
};

const StoreContext = createContext<StoreValue | null>(null);
const KEY = "circle-panda-state-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    ...initialState, coins: 0, reputation: 0, level: 1, xp: 0,
    posts: [], groups: [], threads: [], events: [], nominees: [], sweepWinners: [], leaderboard: [],
    datingProfile: null, datingMatches: [], spotlights: [], sweepTickets: [], hotSeats: [],
  });
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [dbIsAdmin, setDbIsAdmin] = useState(false);

  const refreshCoins = useCallback(async () => {
    if (!dbUserId) return;
    const [bcRes, xpRes] = await Promise.all([
      (supabase as any).from("bc_accounts").select("balance").eq("user_id", dbUserId).maybeSingle(),
      (supabase as any).from("user_xp").select("xp").eq("user_id", dbUserId).maybeSingle(),
    ]);
    setState((s) => {
      const totalXp = Number(xpRes.data?.xp ?? s.xp);
      return { ...s, coins: Number(bcRes.data?.balance ?? s.coins), xp: totalXp, level: pandaProgress(totalXp).index + 1 };
    });
  }, [dbUserId]);


  const persistUserState = useCallback((next: State) => {
    if (!dbUserId) return;
    void (supabase as any).from("user_app_state").upsert({
      user_id: dbUserId, state: { reputation: next.reputation,
        datingProfile: next.datingProfile, isVip: next.isVip, vipExpiresAt: next.vipExpiresAt,
        lastSpinAt: next.lastSpinAt, skipPasses: next.skipPasses, lastAdShownAt: next.lastAdShownAt },
      updated_at: new Date().toISOString(),
    });
  }, [dbUserId]);

  useEffect(() => {
    if (!dbUserId) return;
    const timer = window.setTimeout(() => persistUserState(state), 150);
    return () => window.clearTimeout(timer);
  }, [state, dbUserId, persistUserState]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) session = (await supabase.auth.signInAnonymously()).data.session ?? null;
      if (!session?.user || cancelled) return;
      setDbUserId(session.user.id);
      await (supabase as any).rpc("award_xp_secure", { p_action:"daily_login" });
      if (!session.user.is_anonymous) {
        void (supabase as any).rpc("ensure_my_circle_panda_profile").catch(() => {});
      }
    void (supabase as any).rpc("get_my_admin_status").then(({data}: any) => setDbIsAdmin(data === true));
      const uid = session.user.id;
      const viewerCoords = await new Promise<{latitude:number;longitude:number}|null>((resolve) => { if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null); navigator.geolocation.getCurrentPosition((pos) => resolve({ latitude:pos.coords.latitude, longitude:pos.coords.longitude }), () => resolve(null), { enableHighAccuracy:false, maximumAge:300000, timeout:5000 }); });
      const [st, postsRes, repliesRes, groupsRes, groupMessagesRes, threadsRes, threadMessagesRes, groupSettingsRes, eventsRes, attendeesRes, datingRes, datingOwnRes, coinsRes, xpRes, nomineesRes, crushResultsRes, winnersRes, ticketsRes, crushWinnersRes] = await Promise.all([
        (supabase as any).from("user_app_state").select("state").eq("user_id", uid).maybeSingle(),
        (supabase as any).from("cp_posts").select("id,body,created_at,author_id,author_vip_at").order("created_at", {ascending:false}).limit(100),
        (supabase as any).from("cp_post_replies").select("id,post_id,body,created_at,author_id,author_vip_at").order("created_at", {ascending:true}).limit(500),
        (supabase as any).rpc("get_group_summaries_nearby", { p_latitude:viewerCoords?.latitude ?? null, p_longitude:viewerCoords?.longitude ?? null }),
        
        (supabase as any).from("cp_group_messages").select("id,group_id,body,created_at,author_id").order("created_at", {ascending:true}).limit(1000),
        (supabase as any).from("cp_threads").select("id,owner_id,participant_id,other_alias,kind,blurb,created_at").order("created_at", {ascending:false}).limit(100),
        (supabase as any).from("cp_thread_messages").select("id,thread_id,user_id,body,created_at,message_type,media_path").order("created_at", {ascending:true}).limit(2000),
        (supabase as any).from("group_settings").select("group_id,edit_group_info,send_messages,approve_new_members"),
        (supabase as any).from("events").select("id,title,description,location,starts_at,ends_at,category,entry_fee_bc,entry_fee_amount,entry_fee_currency,duration_minutes,reach_scope,reach_country,reach_state,reach_city,reach_area,cover_url,venue_name,address_line,country,state_province,city,area,latitude,longitude,is_published,owner_id").eq("is_published",true).order("starts_at", {ascending:true}),
        (supabase as any).from("event_attendees").select("event_id,user_id"),
        (supabase as any).rpc("get_dating_discovery_secure", { p_age_min:18,p_age_max:99,p_same_country_only:true }),
        (supabase as any).from("dating_profiles").select("user_id,name,age,vibe,emoji,bio,interests,location,country,gender,relationship_goal,looking_for,lifestyle,personality,love_language,smoking,drinking,children,education,occupation,sexual_experience,intimacy_preference,relationship_status,height_cm,zodiac,favorite_date,photo_path,blurred_photo_path,updated_at").eq("user_id",uid).maybeSingle(),
        (supabase as any).from("bc_accounts").select("balance").eq("user_id",uid).maybeSingle(),
        (supabase as any).from("user_xp").select("xp").eq("user_id",uid).maybeSingle(),
        Promise.resolve({ data: [] as any[] }),
        (supabase as any).rpc("get_crush_results", { p_week_start: new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000).toISOString().slice(0,10) }),
        (supabase as any).from("sweep_winners").select("draw,name,prize,won_at").order("won_at", {ascending:false}).limit(20),
        (supabase as any).from("sweep_tickets").select("id,draw,created_at").eq("user_id",uid),
        (supabase as any).from("crush_winners").select("kind,display_name,created_at").order("created_at", {ascending:false}).limit(16),
      ]);
      if (cancelled) return;
      const stData = st.data?.state ?? {};
      const replies = repliesRes.data ?? [];
      const rawPosts = postsRes.data ?? [];
      const likeSummaryRes = rawPosts.length ? await (supabase as any).rpc("get_post_like_summaries", { p_post_ids: rawPosts.map((p:any)=>p.id) }) : { data: [] };
      const likeSummary = new Map((likeSummaryRes.data ?? []).map((x:any)=>[x.post_id,x]));
      const posts = rawPosts.map((p:any) => { const likes = likeSummary.get(p.id); return { id:p.id, author:p.author_id===uid?"You (anonymous)":"Anonymous Panda", authorId:p.author_id, authorVip:Boolean(p.author_vip_at), likes:Number(likes?.like_count ?? 0), liked:Boolean(likes?.liked), body:p.body, at:new Date(p.created_at).getTime(), replies:replies.filter((r:any)=>r.post_id===p.id).map((r:any)=>({id:r.id,author:r.author_id===uid?"You (anonymous)":"Anonymous Panda",body:r.body,at:new Date(r.created_at).getTime()})) }; });
      
      const groupMessages = groupMessagesRes.data ?? [];
      const groupSettings = groupSettingsRes.data ?? [];
      const groups = (groupsRes.data ?? []).map((g:any)=>{
        const settings = groupSettings.find((x:any)=>x.group_id===g.id);
        return {id:g.id,name:g.name,topic:g.topic,ownerId:g.owner_id,memberRole:g.member_role,editGroupInfo:settings?.edit_group_info ?? "admins",sendMessages:settings?.send_messages ?? true,approveNewMembers:settings?.approve_new_members ?? false,joinPending:Boolean(g.join_pending),members:Number(g.member_count ?? 0),openedAt:g.activated_at?new Date(g.activated_at).getTime():null,country:g.country??"",stateProvince:g.state_province??"",city:g.city??"",area:g.area??"",messages:groupMessages.filter((m:any)=>m.group_id===g.id).map((m:any)=>({id:m.id,author:m.user_id===uid?"You (anonymous)":"Anonymous Panda",body:m.body,at:new Date(m.created_at).getTime(),mine:m.user_id===uid,messageType:m.message_type ?? "text",mediaPath:m.media_path ?? undefined,mimeType:m.mime_type ?? undefined,durationSeconds:m.duration_seconds ?? null}))};
      });
      const attendees = attendeesRes.data ?? [];
      const events = (eventsRes.data ?? []).map((e:any)=>({id:e.id,title:e.title,tag:e.category ?? "Meetup",date:e.starts_at?new Date(e.starts_at).toLocaleDateString():"",time:e.starts_at?`${new Date(e.starts_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}${e.ends_at ? ` · ${Math.max(1,Math.round((new Date(e.ends_at).getTime()-new Date(e.starts_at).getTime())/60000))} min` : ""}`:"",place:e.location??"",cost:Number(e.entry_fee_amount ?? 0),currency:e.entry_fee_currency ?? "NGN",blurb:e.description,details:e.description,rsvp:attendees.some((a:any)=>a.event_id===e.id&&a.user_id===uid),reachScope:e.reach_scope ?? "worldwide",reachCountry:e.reach_country ?? "",reachState:e.reach_state ?? "",reachCity:e.reach_city ?? "",reachArea:e.reach_area ?? "",durationMinutes:Number(e.duration_minutes ?? 120),coverUrl:e.cover_url ?? "",venueName:e.venue_name ?? "",addressLine:e.address_line ?? "",country:e.country ?? "",stateProvince:e.state_province ?? "",city:e.city ?? "",area:e.area ?? "",latitude:e.latitude ?? null,longitude:e.longitude ?? null}));
      const dating = datingOwnRes.data;
      const crushCounts = new Map<string, number>((crushResultsRes.data ?? []).map((r:any)=>[r.nominee_id, Number(r.vote_count ?? r.votes ?? 0)]));
      const nominees = (crushResultsRes.data ?? []).map((n:any)=>({id:n.nominee_id,name:n.display_name,kind:n.kind,emoji:n.emoji,blurb:n.blurb,votes:Number(n.vote_count ?? 0),avatarUrl:n.media_url,mediaUrl:n.media_url,mediaType:n.media_type,mine:Boolean(n.mine)}));
      const rawThreads = threadsRes.data ?? [];
      const rawThreadMessages = threadMessagesRes.data ?? [];
      const otherIds = Array.from(new Set(rawThreads.map((t:any)=>t.owner_id===uid?t.participant_id:t.owner_id).filter(Boolean)));
      const otherProfileRows = otherIds.length
        ? (await Promise.all(otherIds.map(async (id:string) => {
            const { data } = await (supabase as any).rpc("get_shared_profile_public", { p_user_id: id });
            return Array.isArray(data) ? data[0] : data;
          }))).filter(Boolean)
        : [];
      const profileNames = new Map(otherProfileRows.map((p:any)=>[p.id,p.display_name || "Anonymous Panda"]));
      const threads = rawThreads.filter((t:any)=>t.participant_id).map((t:any)=>({
        id:t.id, name:profileNames.get(t.owner_id===uid?t.participant_id:t.owner_id) ?? "Anonymous Panda", kind:t.kind === "dating" ? "dating" : "dm", blurb:t.blurb ?? "",
        messages:rawThreadMessages.filter((m:any)=>m.thread_id===t.id && !(m.message_type==="dating_photo" && m.user_id===uid)).map((m:any)=>({id:m.id,body:m.body,at:new Date(m.created_at).getTime(),mine:m.user_id===uid,messageType:m.message_type==="dating_photo"?"dating_photo":"text",mediaPath:m.media_path ?? undefined})), startedAt:t.kind === "dating" ? new Date(t.created_at).getTime() : undefined
      }));
      const totalXp = Number(xpRes.data?.xp ?? 0);
      setState((prev)=>({...prev,...stData,coins:Number(coinsRes.data?.balance ?? prev.coins),reputation:stData.reputation??0,level:pandaProgress(totalXp).index+1,xp:totalXp,posts,groups,threads,events,nominees,sweepWinners:(winnersRes.data??[]).map((w:any)=>({draw:w.draw,name:w.name,prize:w.prize,wonAt:new Date(w.won_at).getTime()})),sweepTickets:(ticketsRes.data??[]).map((t:any)=>({id:t.id,draw:t.draw,at:new Date(t.created_at).getTime()})),spotlights:(crushWinnersRes.data??[]).map((w:any)=>({kind:w.kind,name:w.display_name,wonAt:new Date(w.created_at).getTime()})),datingProfile:dating?{userId:dating.user_id,name:dating.name,age:dating.age,vibe:dating.vibe,emoji:dating.emoji,bio:dating.bio,interests:dating.interests??[],location:dating.location,country:dating.country??dating.location??"",gender:dating.gender??"",relationshipGoal:dating.relationship_goal??"",lookingFor:dating.looking_for??[],lifestyle:dating.lifestyle??[],personality:dating.personality??[],loveLanguage:dating.love_language??"",smoking:dating.smoking??"",drinking:dating.drinking??"",children:dating.children??"",education:dating.education??"",occupation:dating.occupation??"",sexualExperience:dating.sexual_experience??"",intimacyPreference:dating.intimacy_preference??"",relationshipStatus:dating.relationship_status??"single",heightCm:dating.height_cm??null,zodiac:dating.zodiac??"",favoriteDate:dating.favorite_date??"",photoPath:dating.photo_path??"",blurredPhotoPath:dating.blurred_photo_path??"",registeredAt:new Date(dating.updated_at).getTime()}:null,datingMatches:(datingRes.data??[]).filter((d:any)=>d.user_id!==uid).map((d:any)=>({userId:d.user_id,name:d.name,age:d.age,vibe:d.vibe,emoji:d.emoji,bio:d.bio,interests:d.interests??[],location:d.location,country:d.country??d.location??"",gender:d.gender??"",relationshipGoal:d.relationship_goal??"",lookingFor:d.looking_for??[],lifestyle:d.lifestyle??[],personality:d.personality??[],loveLanguage:d.love_language??"",smoking:d.smoking??"",drinking:d.drinking??"",children:d.children??"",education:d.education??"",occupation:d.occupation??"",sexualExperience:d.sexual_experience??"",intimacyPreference:d.intimacy_preference??"",relationshipStatus:d.relationship_status??"single",heightCm:d.height_cm??null,zodiac:d.zodiac??"",favoriteDate:d.favorite_date??"",photoPath:d.photo_path??"",blurredPhotoPath:d.blurred_photo_path??"",registeredAt:new Date(d.updated_at).getTime()}))}));
    })().catch(()=>{});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dbUserId) return;
    const groupChannel = (supabase as any).channel(`circle-panda-groups-${dbUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_group_messages" }, (payload:any) => {
        const m = payload.new;
        setState((current) => current.groups.some(g => g.messages.some(x => x.id === m.id)) ? current : ({
          ...current, groups: current.groups.map(g => g.id === m.group_id ? { ...g, messages: [...g.messages, { id:m.id, author:m.author_id===dbUserId?"You (anonymous)":"Anonymous Panda", body:m.body, at:new Date(m.created_at).getTime(), mine:m.author_id===dbUserId }] } : g)
        }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "groups" }, (payload:any) => {
        const g = payload.new;
        setState(current => ({ ...current, groups: current.groups.map(x => x.id===g.id ? { ...x, openedAt:g.activated_at?new Date(g.activated_at).getTime():null, members:x.members } : x) }));
      })
      .subscribe();
    const directMessageChannel = (supabase as any).channel(`circle-panda-dm-${dbUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_threads" }, (payload:any) => {
        const t = payload.new;
        if (!t?.id || (t.owner_id !== dbUserId && t.participant_id !== dbUserId)) return;
        setState(current => current.threads.some(x => x.id === t.id) ? current : {
          ...current,
          threads: [{ id:t.id, name:t.owner_id===dbUserId ? (t.other_alias ?? "Anonymous Panda") : "Anonymous Panda", kind:t.kind==="dating" ? "dating" : "dm", blurb:t.blurb ?? "", messages:[], startedAt:t.kind==="dating" ? new Date(t.created_at).getTime() : undefined }, ...current.threads]
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_thread_messages" }, (payload:any) => {
        const m = payload.new;
        setState(current => current.threads.some(t=>t.messages.some(x=>x.id===m.id)) || (m.message_type==="dating_photo" && m.user_id===dbUserId) ? current : ({...current,threads:current.threads.map(t=>t.id===m.thread_id?{...t,messages:[...t.messages,{id:m.id,body:m.body,at:new Date(m.created_at).getTime(),mine:m.user_id===dbUserId,messageType:m.message_type==="dating_photo"?"dating_photo":"text",mediaPath:m.media_path ?? undefined}]}:t)}));
      }).subscribe();
    const crushChannel = (supabase as any).channel(`circle-panda-crush-${dbUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crush_votes" }, async () => {
        const periodStart = new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000)
          .toISOString().slice(0, 10);
        const { data: results } = await (supabase as any).rpc("get_crush_results", { p_week_start: periodStart });
        if (!Array.isArray(results)) return;
        const counts = new Map<string, number>(
          results.map((row:any) => [row.nominee_id, Number(row.vote_count ?? row.votes ?? 0)]),
        );
        setState(current => ({
          ...current,
          nominees: current.nominees.map(n => ({ ...n, votes: counts.get(n.id) ?? n.votes })),
        }));
      }).subscribe();
    const notificationChannel = (supabase as any).channel(`circle-panda-notifications-${dbUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_notifications", filter:`user_id=eq.${dbUserId}` }, async (payload:any) => {
        const kind = payload.new?.kind;
        toast.success("New Panda notification 🔔");
        if (["group_activation","group_join_request"].includes(kind)) {
          const { data } = await (supabase as any).rpc("get_group_summaries");
          if (data) setState(current => ({ ...current, groups: data.map((g:any) => {
            const settings = current.groups.find(x => x.id===g.id);
            return { ...settings, id:g.id,name:g.name,topic:g.topic,ownerId:g.owner_id,memberRole:g.member_role,joinPending:Boolean(g.join_pending),members:Number(g.member_count ?? 0),openedAt:g.activated_at?new Date(g.activated_at).getTime():null };
          }).map((g:any)=>g && g.id ? g : null).filter(Boolean) }));
        }
      }).subscribe();
    return () => { void (supabase as any).removeChannel(groupChannel); void (supabase as any).removeChannel(directMessageChannel); void (supabase as any).removeChannel(crushChannel); void (supabase as any).removeChannel(notificationChannel); };
  }, [dbUserId]);

  const addPost = useCallback((body: string) => {
    if (!dbUserId) { toast.error("Sign in to post"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("create_post_secure", { p_body: body });
      if (error) { toast.error(error.message ?? "Post could not be created"); return; }
      const id = data.id;
      setState((s) => {
        const { level, xp } = gainXp(s.level, s.xp, Number(data.xp ?? 7));
        return { ...s, coins: s.coins + Number(data.reward_bc ?? 2), reputation: s.reputation + Number(data.xp ?? 15), level, xp, posts: [{ id, author:"You (anonymous)", authorId:dbUserId, authorVip:Boolean(data.author_vip_at ?? s.isVip), body, at:data.created_at ? new Date(data.created_at).getTime() : Date.now(), replies:[] }, ...s.posts] };
      });
      toast.success("Posted anonymously 🐼", { description: `+${Number(data.reward_bc ?? 0)} BC · +${Number(data.xp ?? 0)} XP earned.` });
    })();
  }, [dbUserId]);

  const addReply = useCallback((postId: string, body: string) => {
    if (!dbUserId) { toast.error("Sign in to reply"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("create_post_reply_secure", { p_post_id: postId, p_body: body });
      if (error) { toast.error(error.message ?? "Reply could not be created"); return; }
      const id = data.id;
      setState((s) => {
        const { level, xp } = gainXp(s.level, s.xp, Number(data.xp ?? 5));
        return { ...s, coins: s.coins + Number(data.reward_bc ?? 1), reputation: s.reputation + Number(data.xp ?? 5), level, xp, posts:s.posts.map((p)=>p.id===postId?{...p,replies:[...p.replies,{id,author:"You (anonymous)",body,at:Date.now()}]}:p) };
      });
    })();
  }, [dbUserId]);

  const openGroup = useCallback((id: string) => {
    if (!dbUserId) { toast.error("Sign in to open this group"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("open_group_secure", { p_group_id: id });
      if (error) { toast.error(error.message ?? "Group could not be opened"); return; }
      const openedAt = data?.opened_at ? new Date(data.opened_at).getTime() : Date.now();
      setState((s) => ({
        ...s,
        groups: s.groups.map((g) => g.id === id ? { ...g, openedAt, members: Number(data?.member_count ?? g.members) } : g),
      }));
      toast.success("Group chat activated 🐼", { description: "Members notified · 24:00:00 countdown started" });
    })();
  }, [dbUserId]);

  const isGroupExpired = useCallback(
    (g: GroupChat) => g.openedAt !== null && Date.now() - g.openedAt >= DAY_MS,
    [],
  );

  const sendGroupMessage = useCallback((id: string, body: string) => {
    if (!dbUserId) { toast.error("Sign in to message this group"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("send_group_message_secure", { p_group_id: id, p_body: body });
      if (error) { toast.error(error.message ?? "Message could not be sent"); return; }
      setState((s) => ({ ...s, groups: s.groups.map((g) => g.id === id ? { ...g, messages: [...g.messages, { id: data.id, author: "You (anonymous)", body, at: new Date(data.created_at).getTime(), mine: true }] } : g) }));
      void refreshCoins();
    })();
  }, [dbUserId, refreshCoins]);

  const joinGroup = useCallback((id: string) => {
    if (!dbUserId) { toast.error("Sign in to join this group"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("join_group_secure", { p_group_id: id });
      if (error) { toast.error(error.message ?? "Could not join group"); return; }
      setState((s) => ({ ...s, groups: s.groups.map((g) => g.id === id ? { ...g, members: Number(data?.member_count ?? g.members), joinPending: data?.status === "pending", openedAt: data?.activated_at ? new Date(data.activated_at).getTime() : g.openedAt } : g) }));
      if (data?.status === "active" || data?.status === "joined") void refreshCoins();
      toast.success(data?.status === "pending" ? "Join request sent" : data?.status === "active" ? "Group activated 🐼" : "Joined group", { description: data?.status === "pending" ? "An admin must approve your request." : data?.status === "active" ? "3 members reached · 24-hour chat started." : "You're now an anonymous member." });
    })();
  }, [dbUserId, refreshCoins]);

  const leaveGroup = useCallback((id: string) => {
    if (!dbUserId) { toast.error("Sign in to leave this group"); return; }
    void (async () => {
      const { error } = await (supabase as any).rpc("leave_group_secure", { p_group_id: id });
      if (error) { toast.error(error.message ?? "Could not leave group"); return; }
      setState((s) => ({ ...s, groups: s.groups.map((g) => g.id === id ? { ...g, members: Math.max(0, g.members - 1), memberRole: undefined } : g) }));
      toast.success("You left the group");
    })();
  }, [dbUserId]);

  const updateGroupInfo = useCallback((id: string, name: string, topic: string) => {
    if (!dbUserId) { toast.error("Sign in to edit group information"); return; }
    void (async () => {
      const { error } = await (supabase as any).rpc("update_group_info_secure", { p_group_id: id, p_name: name, p_topic: topic });
      if (error) { toast.error(error.message ?? "Could not update group information"); return; }
      setState((s) => ({ ...s, groups: s.groups.map((g) => g.id === id ? { ...g, name, topic } : g) }));
      toast.success("Group information updated");
    })();
  }, [dbUserId]);

  const updateGroupSettings = useCallback((id: string, editGroupInfo: "admins" | "admins_members", sendMessages: boolean, approveNewMembers: boolean) => {
    if (!dbUserId) { toast.error("Sign in to change group settings"); return; }
    void (async () => {
      const { error } = await (supabase as any).rpc("update_group_settings_secure", { p_group_id:id, p_edit_group_info:editGroupInfo, p_send_messages:sendMessages, p_approve_new_members:approveNewMembers });
      if (error) { toast.error(error.message ?? "Could not update group settings"); return; }
      setState((s) => ({ ...s, groups: s.groups.map((g) => g.id === id ? { ...g, editGroupInfo, sendMessages, approveNewMembers } : g) }));
      toast.success("Group settings saved");
    })();
  }, [dbUserId]);

  const hotSeatFor = useCallback(
    (groupId: string) => state.hotSeats.find((h) => h.group_id === groupId) ?? null,
    [state.hotSeats],
  );

  // Hot Seat is server-owned. The client never fabricates hosts, queues, timers, or balances.
  const startHotSeat = useCallback((groupId: string) => {
    if (!dbUserId) { toast.error("Sign in to use Hot Seat"); return; }
    if (!dbIsAdmin) { toast.error("Hot Seat sessions are started by the host/admin"); return; }
    toast.error("Use the Hot Seat Admin controls to start a live session");
  }, [dbUserId, dbIsAdmin]);

  const stopHotSeat = useCallback((_groupId: string) => {
    toast.error("Live Hot Seat sessions are ended from the host/admin controls");
  }, []);

  const rotateHotSeat = useCallback((_groupId: string) => {
    toast.error("Hot Seat rotation is controlled by the live server session");
  }, []);

  const joinHotSeatQueue = useCallback(async (_groupId: string) => {
    if (!dbUserId) { toast.error("Sign in to join the Hot Seat queue"); return; }
    const { data, error } = await (supabase as any).rpc("join_hot_seat_queue_secure", { p_bid_bc: 5 });
    if (error) { toast.error(error.message ?? "Could not join the Hot Seat queue"); return; }
    await refreshCoins();
    const position = data?.position ? " Queue position " + Number(data.position) + "." : "";
    toast.success("You joined the Hot Seat queue 🔥", { description: "Your place is secured server-side." + position });
  }, [dbUserId, refreshCoins]);

  const useSkipPass = useCallback((_groupId: string) => {
    toast.error("Skip-the-queue passes are only granted and consumed by verified server-side rewards.");
  }, []);

  const extendHotSeat = useCallback((_groupId: string, _seconds: number) => {
    toast.error("Hot Seat duration is controlled by the live server session");
  }, []);

  const markAdShown = useCallback(() => {
    setState((s) => ({ ...s, lastAdShownAt: Date.now() }));
  }, []);

  const grantSkipPass = useCallback(() => {
    toast.error("Skip passes can only be granted by a verified reward/admin flow.");
  }, []);
  const syncAccountEntitlements = useCallback(async () => {
    if (!dbUserId) return;
    const { data, error } = await (supabase as any).from("profiles").select("is_vip,vip_expires_at").eq("id", dbUserId).maybeSingle();
    if (!error && data) setState((s) => ({ ...s, isVip: Boolean(data.is_vip && (!data.vip_expires_at || new Date(data.vip_expires_at).getTime() > Date.now())), vipExpiresAt: data.vip_expires_at ? new Date(data.vip_expires_at).getTime() : null }));
  }, [dbUserId]);

  const spendCoins = useCallback((_amount: number, _reason?: string) => {
    toast.error("This action must use a server-authorized Panda Coin transaction.");
    return false;
  }, []);

  const grantFreeSpin = useCallback(() => {
    toast.error("Free spins are issued by the server reward engine.");
  }, []);

  const sendMessage = useCallback((threadId: string, body: string) => {
    if (!dbUserId) { toast.error("Sign in to send messages"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("send_direct_message", { p_thread_id: threadId, p_body: body });
      if (error) { toast.error(error.message ?? "Message could not be sent"); return; }
      setState((s) => ({ ...s, coins: Number(data?.balance ?? s.coins), threads: s.threads.map((t) => t.id === threadId ? { ...t, messages: [...t.messages, { id:data.id, body:data.body, at:new Date(data.created_at).getTime(), mine:true, messageType:"text" }] } : t) }));
      void refreshCoins();
      if (Number(data?.charged_bc ?? 0) > 0) {
        toast("−1 BC spent 🪙", { description:"Message delivered anonymously." });
      } else {
        toast.success("Message delivered 💗", { description:data?.free_reason === "dating_72h" ? "Free during the 72-hour Dating Chat." : "VIP message." });
      }
    })();
  }, [dbUserId, refreshCoins]);

  const startDatingChat = useCallback((userId: string, name: string) => {
    if (!dbUserId || !userId) { toast.error("Dating profile unavailable"); return Promise.resolve(null); }
    return (async () => {
      const { data, error } = await (supabase as any).rpc("create_direct_thread", { p_other_user_id:userId, p_kind:"dating", p_blurb:"Matched from Dating" });
      if (error) { toast.error(error.message ?? "Dating chat is still locked"); return null; }
      const id = data.id as string;
      setState(s => s.threads.some(t=>t.id===id) ? s : {...s,threads:[{id,name,kind:"dating",blurb:"Matched from Dating",messages:[],startedAt:Date.now()},...s.threads]});
      await (supabase as any).rpc("award_xp_secure", { p_action:"dating_match_chat", p_reference_id:id });
      void refreshCoins();
      return id;
    })();
  }, [dbUserId, refreshCoins]);

  const startDmWithAuthor = useCallback((userId: string, _author: string, _blurb: string) => {
    if (!dbUserId || !userId) { toast.error("This anonymous author cannot be contacted"); return Promise.resolve(null); }
    return (async () => {
      const { error } = await (supabase as any).rpc("request_direct_message_secure", { p_recipient_id:userId, p_message:"" });
      if (error) { toast.error(error.message ?? "Could not send message request"); return null; }
      toast.success("Message request sent 💬");
      return null;
    })();
  }, [dbUserId]);

  const openPaidDm = useCallback((userId: string, _author: string, blurb: string) => {
    if (!dbUserId || !userId) { toast.error("This anonymous author cannot be contacted"); return Promise.resolve(null); }
    return (async () => {
      const { error } = await (supabase as any).rpc("request_direct_message_secure", { p_recipient_id:userId, p_message:blurb ?? "" });
      if (error) { toast.error(error.message ?? "Could not send message request"); return null; }
      toast.success("Message request sent 💬");
      return null;
    })();
  }, [dbUserId]);

  const nominate = useCallback((name: string, kind: CrushKind, blurb: string, emoji: string) => {
    if (!dbUserId) { toast.error("Sign in to nominate"); return false; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("nominate_crush_secure", {
        p_name: name, p_kind: kind, p_blurb: blurb, p_emoji: emoji, p_cost_bc: NOMINATION_COST,
      });
      if (error) { toast.error(error.message ?? "Nomination could not be created"); return; }
      setState((s) => ({
        ...s,
        coins: Number(data?.balance ?? Math.max(0, s.coins - NOMINATION_COST)),
        nominees: [...s.nominees, { id: data.id, name, kind: data?.kind ?? kind, emoji, blurb, votes: 0, mine: name === "You (anonymous)" }],
      }));
      toast.success("Nomination live 💫", { description: `−${NOMINATION_COST} BC · added to this week's ${kind.toUpperCase()} tray.` });
    })();
    return true;
  }, [dbUserId]);

  const voteFor = useCallback((id: string) => {
    void (async()=>{
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.is_anonymous) { toast.error("Sign in to vote"); return; }
      const { data: voteData, error } = await (supabase as any).rpc("cast_crush_vote_secure", { p_nominee_id: id });
      if (error) { toast.error(error.message ?? "Vote could not be counted"); return; }
      const { data: results } = await (supabase as any).rpc("get_crush_results", { p_week_start: new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000).toISOString().slice(0,10) });
      const counts = new Map<string, number>((results ?? []).map((r:any)=>[r.nominee_id,Number(r.vote_count ?? r.votes ?? 0)]));
      void refreshCoins();
      setState((s) => ({ ...s, coins: voteData?.charged_bc ? Math.max(0, s.coins - Number(voteData.charged_bc)) : s.coins, votesUsedToday: Number(voteData?.free_votes_used ?? s.votesUsedToday), voteDay: todayKey(), votedIds: s.votedIds.includes(id) ? s.votedIds : [...s.votedIds,id], nominees: s.nominees.map((n) => ({...n,votes:counts.get(n.id) ?? n.votes})) }));
      toast.success(voteData?.charged_bc ? "Vote counted · 1 BC" : "Vote counted 💗");
    })();
  }, [refreshCoins]);

  /** Server-authoritative WCW/MCM weekly close. */
  useEffect(() => {
    const check = async () => {
      const { data } = await (supabase as any).rpc("close_crush_week_secure");
      if (data?.closed && Array.isArray(data.winners)) {
        const winners = data.winners.map((w:any) => ({ kind:w.kind, name:w.name, wonAt:Date.now() }));
        setState(s => ({ ...s, spotlights:[...winners,...s.spotlights].slice(0,8), weekEndsAt:Date.now()+WEEK_MS, votedIds:[] }));
        winners.forEach((w:any) => toast.success(`${String(w.kind).toUpperCase()} Spotlight crowned 👑`, { description:`${w.name} · ${WINNER_REWARD} BC winner reward.` }));
      }
    };
    void check();
    const i = setInterval(() => void check(), 60000);
    return () => clearInterval(i);
  }, []);

  /** Sweepstakes draws are closed and awarded only by the server/admin draw flow. */

  const toggleRsvp = useCallback((id: string) => {
    if (!dbUserId) return;
    void (async()=>{
      const { data, error } = await (supabase as any).rpc("toggle_event_rsvp_secure", { p_event_id: id });
      if (error) { toast.error(error.message ?? "Could not update RSVP"); return; }
      const joined = Boolean(data?.joined);
      const charged = Number(data?.charged_bc ?? 0);
      const refunded = Number(data?.refunded_bc ?? 0);
      setState((s) => ({
        ...s,
        coins: Math.max(0, s.coins - charged + refunded),
        events: s.events.map((e) => e.id === id ? { ...e, rsvp: joined } : e),
      }));
      if (joined) {
        toast.success("You're on the list 🐼", { description: charged > 0 ? `−${charged} BC entry fee` : "Free RSVP" });
      } else {
        toast.success("RSVP cancelled", { description: refunded > 0 ? `+${refunded} BC refunded` : undefined });
      }
    })();
  }, [dbUserId]);

  const createGroup = useCallback(async (name: string, topic: string, country = "", stateProvince = "", city = "", area = ""): Promise<GroupChat | null> => {
    if (!dbUserId) { toast.error("Sign in to create a group"); return null; }
    const coords = await new Promise<{latitude:number;longitude:number}|null>((resolve) => { if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null); navigator.geolocation.getCurrentPosition((pos) => resolve({ latitude:pos.coords.latitude, longitude:pos.coords.longitude }), () => resolve(null), { enableHighAccuracy:false, maximumAge:300000, timeout:5000 }); });
    const { data, error } = await (supabase as any).rpc("create_group_secure", { p_name:name, p_topic:topic, p_latitude:coords?.latitude ?? null, p_longitude:coords?.longitude ?? null });
    if (error) { toast.error(error.message ?? "Group could not be created"); return null; }
    const group: GroupChat = { id:data.id, name:data.name ?? name, topic:data.topic ?? topic, members:Number(data.members ?? 1), ownerId:dbUserId, memberRole:"owner", editGroupInfo:"admins", sendMessages:true, approveNewMembers:false, joinPending:false, openedAt:null, latitude:coords?.latitude ?? null, longitude:coords?.longitude ?? null, messages:[], country:data.country ?? country, stateProvince:data.state_province ?? stateProvince, city:data.city ?? city, area:data.area ?? area };
    setState((s) => ({ ...s, groups:[group, ...s.groups] }));
    toast.success("Group created 🐼", { description:"Invite members, then open it when 3+ members are ready." });
    return group;
  }, [dbUserId]);

  const createEvent = useCallback((eventData: Omit<PandaEvent, "id" | "rsvp">): PandaEvent => {
    const localId = crypto.randomUUID();
    const optimistic: PandaEvent = { ...eventData, id: localId, rsvp: false };
    if (!dbUserId) { toast.error("Sign in to create an event"); return optimistic; }
    void (async () => {
      const startsAt = eventData.date ? new Date(eventData.date).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const durationMinutes = Math.max(15, Math.min(10080, Number(eventData.durationMinutes) || 120));
      const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any).rpc("create_event_secure", {
        p_title:eventData.title,p_description:eventData.details || eventData.blurb,p_location:eventData.place,p_starts_at:startsAt,p_ends_at:endsAt,
        p_category:eventData.tag,p_entry_fee_bc:0,p_duration_minutes:durationMinutes,p_reach_scope:eventData.reachScope ?? "worldwide",
        p_reach_country:eventData.reachCountry ?? null,p_reach_state:eventData.reachState ?? null,p_reach_city:eventData.reachCity ?? null,p_reach_area:eventData.reachArea ?? null,
        p_entry_fee_amount:Math.max(0,Number(eventData.cost)||0),p_entry_fee_currency:eventData.currency ?? "NGN",p_venue_name:eventData.venueName ?? null,
        p_address_line:eventData.addressLine ?? null,p_country:eventData.country ?? null,p_state_province:eventData.stateProvince ?? null,p_city:eventData.city ?? null,p_area:eventData.area ?? null,
        p_latitude:eventData.latitude ?? null,p_longitude:eventData.longitude ?? null,p_cover_url:eventData.coverUrl ?? null,
      });
      if (error) { toast.error(error.message ?? "Could not publish event"); return; }
      setState(s=>({...s,events:[{...optimistic,id:data.id},...s.events]}));
      void (supabase as any).rpc("record_activity_participation",{p_activity_id:null,p_activity_type:"event_created",p_reference_id:data.id,p_points:5});
      toast.success("Event published 🐼");
    })();
    return optimistic;
  }, [dbUserId, refreshCoins]);

  const startEventBlast = useCallback(async (eventId: string, planId = "starter", paymentMethod: "bc" | "cash" = "bc", targetScope = "worldwide", targetCountry = "", targetState = "", targetCity = "", targetArea = "") => {
    if (!dbUserId) { toast.error("Sign in to promote an event"); return false; }
    const { data, error } = await (supabase as any).rpc("start_event_blast_secure", { p_event_id:eventId,p_plan_id:planId,p_payment_method:paymentMethod,p_target_scope:targetScope,p_target_country:targetCountry || null,p_target_state:targetState || null,p_target_city:targetCity || null,p_target_area:targetArea || null });
    if (error) { toast.error(error.message ?? "Could not start Event Blast"); return false; }
    const charged = Number(data?.bc_cost ?? 0);
    if (charged > 0) setState(s=>({...s,coins:Math.max(0,s.coins-charged)}));
    toast.success("Event Blast is live 🚀",{description:`${Number(data?.unique_reach??500).toLocaleString()} people + 20% extra notifications.`});
    return true;
  }, [dbUserId]);

  const searchDatingProfiles = useCallback(async (filters: { ageMin?: number; ageMax?: number; country?: string; location?: string; gender?: string; relationshipGoal?: string; lookingFor?: string; lifestyle?: string; smoking?: string; drinking?: string; children?: string; education?: string; heightMin?: number; heightMax?: number; zodiac?: string; sameCountryOnly?: boolean }) => {
    if (!dbUserId) return false;
    const { data, error } = await (supabase as any).rpc("get_dating_discovery_secure", {
      p_age_min: filters.ageMin ?? 18,
      p_age_max: filters.ageMax ?? 99,
      p_country: filters.country ?? "",
      p_location: filters.location ?? "",
      p_gender: filters.gender ?? "",
      p_relationship_goal: filters.relationshipGoal ?? "",
      p_looking_for: filters.lookingFor ?? "",
      p_lifestyle: filters.lifestyle ?? "",
      p_smoking: filters.smoking ?? "",
      p_drinking: filters.drinking ?? "",
      p_children: filters.children ?? "",
      p_education: filters.education ?? "",
      p_height_min: filters.heightMin || null,
      p_height_max: filters.heightMax || null,
      p_zodiac: filters.zodiac ?? "",
      p_same_country_only: filters.sameCountryOnly ?? false,
    });
    if (error) { toast.error(error.message ?? "Dating matches could not be loaded"); return false; }
    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map((d:any) => ({
      userId:d.user_id,name:d.name,age:d.age,vibe:d.vibe,emoji:d.emoji,bio:d.bio,interests:d.interests??[],
      location:d.location??"",country:d.country??"",gender:d.gender??"",relationshipGoal:d.relationship_goal??"",
      lookingFor:d.looking_for??[],lifestyle:d.lifestyle??[],personality:d.personality??[],loveLanguage:d.love_language??"",
      smoking:d.smoking??"",drinking:d.drinking??"",children:d.children??"",education:d.education??"",occupation:d.occupation??"",
      sexualExperience:d.sexual_experience??"",intimacyPreference:d.intimacy_preference??"",relationshipStatus:d.relationship_status??"single",
      heightCm:d.height_cm??null,zodiac:d.zodiac??"",favoriteDate:d.favorite_date??"",photoPath:d.photo_path??"",
      blurredPhotoPath:d.blurred_photo_path??"",registeredAt:new Date(d.updated_at).getTime()
    }));
    setState(s => ({...s, datingMatches:mapped}));
    return true;
  }, [dbUserId]);

  const registerDatingProfile = useCallback((p: Omit<DatingProfile, "registeredAt" | "userId">) => {
    if (!dbUserId) { toast.error("Sign in to register for Dating"); return; }
    void (async () => {
      const { data, error } = await (supabase as any).rpc("register_dating_profile_secure", {
        p_age:p.age,p_gender:p.gender,p_country:p.country,p_vibe:p.vibe,p_bio:p.bio,p_interests:p.interests,
        p_relationship_goal:p.relationshipGoal,p_looking_for:p.lookingFor,p_lifestyle:p.lifestyle,p_personality:p.personality,
        p_love_language:p.loveLanguage,p_smoking:p.smoking,p_drinking:p.drinking,p_children:p.children,p_education:p.education,
        p_occupation:p.occupation,p_sexual_experience:p.sexualExperience,p_intimacy_preference:p.intimacyPreference,
        p_relationship_status:p.relationshipStatus,p_height_cm:p.heightCm??null,p_zodiac:p.zodiac,p_favorite_date:p.favoriteDate,p_emoji:p.emoji,p_photo_path:p.photoPath||null,p_blurred_photo_path:p.blurredPhotoPath||null
      });
      if (error) { toast.error(error.message ?? "Dating profile could not be saved"); return; }
      setState(s => ({...s,datingProfile:{...p,name:data?.name??p.name,userId:dbUserId,registeredAt:Date.now()}}));
      toast.success("Dating profile saved 💗");
    })();
  }, [dbUserId]);

  const requestDatingMatch = useCallback((userId:string) => {
    if (!dbUserId || !userId) { toast.error("Dating profile unavailable"); return Promise.resolve(null); }
    return (async () => {
      const {data,error}=await (supabase as any).rpc("request_dating_match_secure",{p_recipient_id:userId});
      if(error){toast.error(error.message??"Could not send dating request");return null;}
      toast.success(data?.status==="matched"?"It's a mutual match 💗":"Dating request sent 💗");
      return String(data?.status??"pending");
    })();
  },[dbUserId]);

  const buyTicket = useCallback((draw: DrawKind) => {
    if (!dbUserId) { toast.error("Sign in to buy a ticket"); return false; }
    void (async()=>{
      const { data, error } = await (supabase as any).rpc("buy_sweepstake_ticket_secure", { p_draw: draw });
      if (error) { toast.error(error.message ?? "Could not secure ticket"); return; }
      setState((s) => ({ ...s, coins: Number(data?.balance ?? Math.max(0, s.coins - TICKET_COST)), sweepTickets: [...s.sweepTickets, { id: String(data?.ticket_id ?? data?.id), draw, at: Date.now() }] }));
      toast.success("Ticket secured 🎟️", { description: `−${TICKET_COST} BC · you're in the ${draw} draw.` });
    })();
    return true;
  }, [dbUserId]);

  const spinWheel = useCallback(async (): Promise<SpinPrize | null> => {
    if (!dbUserId) { toast.error("Sign in to spin"); return null; }
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from("cp_reward_campaigns")
      .select("id")
      .eq("enabled", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (campaignError || !campaign?.id) {
      toast.error(campaignError?.message ?? "Reward wheel is not available yet.");
      return null;
    }
    const { data: status, error: statusError } = await (supabase as any)
      .rpc("cp_get_reward_status", { p_campaign_id: campaign.id });
    if (statusError) { toast.error(statusError.message ?? "Could not check the wheel."); return null; }
    if (!status?.can_spin) {
      toast.error("Your free spin is not ready yet.");
      return null;
    }
    const { data, error } = await (supabase as any).rpc("cp_spin_reward", { p_campaign_id: campaign.id });
    if (error || !data) {
      toast.error(error?.message ?? "Spin could not be completed");
      return null;
    }
    const slice = SPIN_SLICES.find((item) => item.id === data.prize_id) ?? null;
    if (typeof data.value === "number" && data.prize_type === "bc") {
      await refreshCoins();
    }
    if (data.prize_type === "vip") await syncAccountEntitlements();
    let qualificationStage: any = null;
    if (data.qualification_id) {
      const { data: stage } = await (supabase as any)
        .from("cp_reward_stages")
        .select("id,form_config,title,instructions")
        .eq("campaign_id", campaign.id)
        .eq("stage_number", 1)
        .eq("enabled", true)
        .not("released_at", "is", null)
        .order("stage_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      qualificationStage = stage ?? null;
    }
    setState((current) => ({ ...current, lastSpinAt: Date.now() }));
    if (slice) {
      toast.success(`You won ${data.title}! ${data.emoji ?? ""}`, {
        description: data.fulfilment_type === "manual"
          ? "Congratulations — your qualification form is ready."
          : slice.blurb,
      });
    }
    const result: SpinPrize = slice ? { ...slice } : {
      id: String(data.prize_id ?? "reward"),
      title: String(data.title ?? "Reward"),
      label: String(data.title ?? "Reward"),
      type: "physical",
      kind: data.prize_type === "vip" ? "vip" : data.prize_type === "bc" ? "coins" : "physical",
      value: Number(data.value ?? 0),
      amount: Number(data.value ?? 0),
      emoji: String(data.emoji ?? "🎁"),
      rarity: "common",
      blurb: String(data.description ?? ""),
      weight: 1,
    };
    return {
      ...result,
      ...(data.qualification_id ? { qualificationId: String(data.qualification_id) } : {}),
      ...(qualificationStage?.id ? { qualificationStageId: String(qualificationStage.id) } : {}),
      ...(qualificationStage?.form_config ? { qualificationForm: qualificationStage.form_config as Record<string, unknown> } : {}),
      ...(data.qualification_id && qualificationStage?.id ? { requiresQualification: true } : {}),
    };
  }, [dbUserId, refreshCoins, syncAccountEntitlements]);

  const canSpin = state.lastSpinAt === null || Date.now() - state.lastSpinAt >= SPIN_COOLDOWN_MS;
  const nextSpinAt = state.lastSpinAt === null ? null : state.lastSpinAt + SPIN_COOLDOWN_MS;

  const activateVip = useCallback((_days: number) => {
    void syncAccountEntitlements();
  }, [syncAccountEntitlements]);

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
      joinGroup,
      leaveGroup,
      updateGroupInfo,
      updateGroupSettings,
      isGroupExpired,
      sendMessage,
      startDatingChat,
      requestDatingMatch,
      startDmWithAuthor,
      openPaidDm,
      syncCoins: refreshCoins,
      syncAccountEntitlements,
      nominate,
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
      isAdmin: dbIsAdmin,
      createGroup,
      createEvent,
      startEventBlast,
      registerDatingProfile,
      requestDatingMatch,
    }),
    [
      state,
      addPost,
      addReply,
      openGroup,
      sendGroupMessage,
      joinGroup,
      leaveGroup,
      updateGroupInfo,
      updateGroupSettings,
      isGroupExpired,
      sendMessage,
      startDatingChat,
      startDmWithAuthor,
      openPaidDm,
      refreshCoins,
      syncAccountEntitlements,
      nominate,
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
      startEventBlast,
      registerDatingProfile,
      requestDatingMatch,
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

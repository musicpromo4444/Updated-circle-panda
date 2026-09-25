export type VipEvent = {
  id: string;
  title: string;
  host: string;
  category: string;
  dateTime: string;
  location: string;
  description: string;
  rsvps: number;
  hasRsvp: boolean;
};

export type VipGiveaway = {
  id: string;
  title: string;
  host: string;
  prize: string;
  bcAmount: number;
  endsIn: string;
  entriesCount: number;
  hasEntered: boolean;
  winner?: string;
  status: "active" | "ended";
};

export type VipPollOption = {
  id: string;
  text: string;
  votes: number;
};

export type VipPoll = {
  id: string;
  question: string;
  author: string;
  options: VipPollOption[];
  userVotedOptionId?: string;
  totalVotes: number;
  createdAt: string;
};

export type VipMediaNote = {
  id: string;
  author: string;
  type: "voice" | "video";
  title: string;
  duration: string;
  createdAt: string;
  caption?: string;
  likes: number;
  hasLiked?: boolean;
};

const STORAGE_KEY = "circle_panda_vip_lounge_state_v1";

const DEFAULT_EVENTS: VipEvent[] = [
  {
    id: "evt-1",
    title: "VIP Rooftop Sunset Mixer & Live DJ",
    host: "Crown Panda 👑",
    category: "Campus Social",
    dateTime: "Tomorrow, 8:00 PM",
    location: "Main Quad Sky Lounge",
    description:
      "Exclusive gathering for verified VIPs. Free drinks, good music, and zero regular guests.",
    rsvps: 24,
    hasRsvp: true,
  },
  {
    id: "evt-2",
    title: "Tech Founders AMA & Pitch Prep",
    host: "Shadow Legend 🐼",
    category: "Masterclass",
    dateTime: "Friday, 6:30 PM",
    location: "VIP Voice Channel",
    description: "Get your startup pitch reviewed by alumni founders who raised seed rounds.",
    rsvps: 18,
    hasRsvp: false,
  },
];

const DEFAULT_GIVEAWAYS: VipGiveaway[] = [
  {
    id: "gw-1",
    title: "Midnight 1,000 BC Mega Drop",
    host: "Panda Ambassador 👑",
    prize: "1,000 Black Coins",
    bcAmount: 1000,
    endsIn: "4 hours left",
    entriesCount: 38,
    hasEntered: true,
    status: "active",
  },
  {
    id: "gw-2",
    title: "Weekend Skip-Pass & Exclusive Merch",
    host: "Bamboo VIP",
    prize: "3x Skip Passes + Panda Hoodie",
    bcAmount: 300,
    endsIn: "18 hours left",
    entriesCount: 22,
    hasEntered: false,
    status: "active",
  },
];

const DEFAULT_POLLS: VipPoll[] = [
  {
    id: "poll-1",
    question: "Which surprise artist should the VIP Committee book for the Mid-Semester Gala?",
    author: "Council Panda 👑",
    options: [
      { id: "opt-1", text: "Afrobeats DJ Set", votes: 42 },
      { id: "opt-2", text: "Indie Acoustic Duo", votes: 15 },
      { id: "opt-3", text: "Hip-Hop Headliner", votes: 67 },
      { id: "opt-4", text: "Electronic Dance Night", votes: 31 },
    ],
    totalVotes: 155,
    userVotedOptionId: "opt-3",
    createdAt: "2h ago",
  },
  {
    id: "poll-2",
    question: "Should we make the next Hot Seat round VIP-invitation only?",
    author: "Anonymous VIP",
    options: [
      { id: "p2-1", text: "Yes, keep it exclusive 👑", votes: 29 },
      { id: "p2-2", text: "No, open to all campuses", votes: 12 },
    ],
    totalVotes: 41,
    createdAt: "5h ago",
  },
];

const DEFAULT_NOTES: VipMediaNote[] = [
  {
    id: "note-1",
    author: "Diamond Panda 👑",
    type: "voice",
    title: "Behind the scenes on Friday's secret campus pop-up",
    duration: "0:48",
    createdAt: "15m ago",
    caption: "Listen closely for the entrance code to the lounge!",
    likes: 19,
    hasLiked: true,
  },
  {
    id: "note-2",
    author: "Midnight DJ",
    type: "video",
    title: "Soundcheck test for tonight's VIP set",
    duration: "0:25",
    createdAt: "1h ago",
    caption: "Bass is heavy tonight. Who is showing up early?",
    likes: 34,
    hasLiked: false,
  },
  {
    id: "note-3",
    author: "Bamboo Scout",
    type: "voice",
    title: "Exam study playlist leak",
    duration: "1:12",
    createdAt: "3h ago",
    caption: "Lo-fi beats created specifically for late-night grinds.",
    likes: 12,
  },
];

export type VipLoungeStorage = {
  events: VipEvent[];
  giveaways: VipGiveaway[];
  polls: VipPoll[];
  notes: VipMediaNote[];
};

export function loadVipLoungeData(): VipLoungeStorage {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to read VIP lounge data", e);
    }
  }
  return {
    events: DEFAULT_EVENTS,
    giveaways: DEFAULT_GIVEAWAYS,
    polls: DEFAULT_POLLS,
    notes: DEFAULT_NOTES,
  };
}

export function saveVipLoungeData(data: VipLoungeStorage) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save VIP lounge data", e);
  }
}

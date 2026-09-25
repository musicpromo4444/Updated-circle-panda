import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayableVideoAd } from "@/components/ads/PlayableVideoAd";
import { useAdPreloader } from "@/components/ads/useAdPreloader";
import { VIDEO_ADS } from "@/components/ads/AdTypes";
import { RegisterDatingModal } from "@/components/dating/RegisterDatingModal";
import { useStore } from "@/lib/store";

type Match = {
  name: string;
  age: number;
  vibe: string;
  emoji: string;
  bio: string;
  interests: string[];
  location: string;
};

const MATCHES: Match[] = [
  {
    name: "Moonlit Panda",
    age: 27,
    vibe: "Night owl · reads too much · terrible at texting first",
    emoji: "🌙",
    bio: "I stay up too late finishing books I said I'd only read one chapter of. Looking for someone who also thinks 1am is a personality trait.",
    interests: ["Books", "Late walks", "Vinyl", "Bad horror films"],
    location: "Yaba",
  },
  {
    name: "Cocoa Cub",
    age: 24,
    vibe: "Baker, plant hoarder, will send you memes at 3am",
    emoji: "🍫",
    bio: "Weekend baker with more plants than shelf space. If you like brownies and unsolicited plant facts, we'll get along.",
    interests: ["Baking", "Plants", "Memes", "Thrifting"],
    location: "Surulere",
  },
  {
    name: "Bamboo Bandit",
    age: 31,
    vibe: "Runs marathons to avoid conversations. Ironic, I know.",
    emoji: "🎋",
    bio: "Long distance runner, short distance talker. Trying to fix the second one, one anonymous chat at a time.",
    interests: ["Running", "Trail routes", "Podcasts", "Jollof debates"],
    location: "Lekki",
  },
  {
    name: "Quiet Storm",
    age: 29,
    vibe: "Loud in group chats, shy in person. Sorry in advance.",
    emoji: "⛈️",
    bio: "I have a whole personality behind a keyboard and roughly three words in person. Patience appreciated, humour required.",
    interests: ["Gaming", "Rain sounds", "Street food", "Playlists"],
    location: "Ikoyi",
  },
  {
    name: "Starlight Panda",
    age: 26,
    vibe: "Astrophysics enthusiast, rooftop stargazing & matcha lover",
    emoji: "✨",
    bio: "Looking for someone to argue about Fermi's paradox with over late night suya. I make great coffee and listen attentively.",
    interests: ["Space", "Matcha", "Photography", "Acoustic"],
    location: "Victoria Island",
  },
  {
    name: "Solar Flare",
    age: 28,
    vibe: "Golden retriever energy disguised in an anonymous avatar",
    emoji: "☀️",
    bio: "I believe every awkward silence can be broken with a sufficiently absurd hypothetical question.",
    interests: ["Surfing", "Board games", "Cooking", "Live gigs"],
    location: "Lekki Phase 1",
  },
  {
    name: "Velvet Whisper",
    age: 25,
    vibe: "Architectural sketches, vintage cameras, tea enthusiast",
    emoji: "🎨",
    bio: "I notice the small details in every room. Send me your current favorite song and tell me why it moves you.",
    interests: ["Architecture", "Art galleries", "Herbal tea", "Poetry"],
    location: "Ikeja GRA",
  },
];

export const Route = createFileRoute("/dating")({
  head: () => ({
    meta: [
      { title: "Dating — Circle Panda" },
      {
        name: "description",
        content: "Anonymous matches on Circle Panda. Chats opened here are tagged DATING CHAT.",
      },
      { property: "og:title", content: "Dating — Circle Panda" },
      { property: "og:description", content: "Match anonymously, chat for 1 BC a message." },
    ],
  }),
  component: DatingPage,
});

function DatingPage() {
  const { startDatingChat, threads, datingProfile } = useStore();
  const navigate = useNavigate();
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Pre-cache video ad units
  useAdPreloader({ videoUrls: VIDEO_ADS.map((ad) => ad.videoUrl) });

  const match = (m: Match) => {
    const existing = threads.find((t) => t.kind === "dating" && t.name === m.name);
    const id = startDatingChat(m.name);
    toast.success("Dating chat opened 💗", {
      description: "Opening message sent. 1 BC per message.",
    });
    setOpenMatch(null);
    void navigate({ to: "/messages", search: { thread: existing?.id ?? id } });
  };

  const allMatches: Match[] = datingProfile
    ? [
        {
          name: `${datingProfile.name} (You)`,
          age: datingProfile.age,
          vibe: datingProfile.vibe,
          emoji: datingProfile.emoji,
          bio: datingProfile.bio,
          interests: datingProfile.interests,
          location: datingProfile.location,
        },
        ...MATCHES,
      ]
    : MATCHES;

  return (
    <AppShell
      title="Dating"
      subtitle="Tap a card for the full profile. Chats open with a DATING CHAT badge."
    >
      {/* Primary CTA button immediately below subtitle description and above main content cards */}
      <div className="mb-5">
        <Button
          size="lg"
          onClick={() => setRegisterOpen(true)}
          className="w-full gap-2.5 rounded-2xl bg-[var(--dating)] py-6 text-sm sm:text-base font-bold text-[var(--dating-foreground)] shadow-lg shadow-[var(--dating)]/20 transition-all hover:bg-[var(--dating)]/90 active:scale-[0.99] cursor-pointer"
        >
          <Heart className="size-5 fill-current" />
          Register for Dating
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {allMatches.map((m, idx) => (
          <div key={m.name} className="contents">
            <article
              className={`panda-panel overflow-hidden rounded-2xl transition-all hover:border-primary/40 ${
                datingProfile && idx === 0 ? "border-2 border-[var(--dating)]/60 shadow-md" : ""
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenMatch(m)}
                aria-label={`Open ${m.name}'s profile`}
              >
                <span className="relative grid h-32 place-items-center bg-[color-mix(in_oklab,var(--dating)_22%,transparent)] text-5xl">
                  {m.emoji}
                  {datingProfile && idx === 0 ? (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-[var(--dating)] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide shadow">
                      Your Profile
                    </span>
                  ) : null}
                </span>
                <span className="block p-4 pb-0">
                  <span className="flex items-center gap-2 font-display text-lg font-semibold">
                    {m.name}
                    <span className="text-sm font-normal text-muted-foreground">{m.age}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{m.vibe}</span>
                </span>
              </button>
              <div className="p-4 pt-3">
                {datingProfile && idx === 0 ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[var(--dating)]/40 text-[var(--dating)] hover:bg-[var(--dating)]/10 font-semibold"
                    onClick={() => setRegisterOpen(true)}
                  >
                    <Sparkles className="size-4" /> Edit your profile
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2 bg-[var(--dating)] text-[var(--dating-foreground)] hover:bg-[var(--dating)]/90"
                    onClick={() => match(m)}
                  >
                    <Heart className="size-4 fill-current" /> Start dating chat
                  </Button>
                )}
              </div>
            </article>

            {/* Short, playable video advertisement (5-10 seconds, skippable) after every sequence of 5 user profiles */}
            {(idx + 1) % 5 === 0 ? (
              <div className="my-2 sm:col-span-2">
                <PlayableVideoAd index={Math.floor(idx / 5)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MessageCircle className="size-3.5" /> Dating chats never expire, but every message costs 1
        BC.
      </p>

      {/* Dating Profile Registration & Edit Modal */}
      <RegisterDatingModal open={registerOpen} onOpenChange={setRegisterOpen} />

      <Dialog open={!!openMatch} onOpenChange={(o) => !o && setOpenMatch(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-lg">
          {openMatch ? (
            <div>
              <div className="grid h-40 place-items-center bg-[color-mix(in_oklab,var(--dating)_22%,transparent)] text-6xl">
                {openMatch.emoji}
              </div>
              <div className="p-5">
                <DialogTitle className="flex items-center gap-2 font-display text-2xl">
                  {openMatch.name}
                  <span className="text-base font-normal text-muted-foreground">
                    {openMatch.age}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-1">{openMatch.vibe}</DialogDescription>

                <p className="mt-4 text-[15px] leading-relaxed">{openMatch.bio}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {openMatch.interests.map((i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground"
                    >
                      {i}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  📍 {openMatch.location} · anonymous profile
                </p>

                <Button
                  className="mt-5 w-full gap-2 bg-[var(--dating)] text-[var(--dating-foreground)] hover:bg-[var(--dating)]/90"
                  onClick={() => match(openMatch)}
                >
                  <Heart className="size-4 fill-current" /> Match & message
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

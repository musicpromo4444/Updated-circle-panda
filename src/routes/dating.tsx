import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayableVideoAd } from "@/components/ads/PlayableVideoAd";
import { RegisterDatingModal } from "@/components/dating/RegisterDatingModal";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Match = {
  userId?: string;
  name: string;
  age: number;
  vibe: string;
  emoji: string;
  bio: string;
  interests: string[];
  location: string;
  photoPath?: string;
  blurredPhotoPath?: string;
};

function DatingPhoto({ match, connection }: { match: Match; connection?: any }) {
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const revealed = Boolean(connection?.status === "matched" && connection?.requester_confirmed && connection?.recipient_confirmed);
  useEffect(() => {
    let active = true;
    if (!revealed || !match.photoPath) { setRevealedUrl(null); return; }
    void supabase.storage.from("dating-photos").createSignedUrl(match.photoPath, 60 * 60).then(({ data, error }: any) => {
      if (active && !error) setRevealedUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [revealed, match.photoPath]);

  if (revealed && revealedUrl) {
    return <img src={revealedUrl} alt="Dating profile" className="size-full object-cover" />;
  }
  if (match.blurredPhotoPath) {
    const url = supabase.storage.from("dating-photo-blur").getPublicUrl(match.blurredPhotoPath).data.publicUrl;
    return <img src={url} alt="Blurred Dating profile" className="size-full object-cover" />;
  }
  return <span aria-hidden="true">{match.emoji}</span>;
}

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
  const { requestDatingMatch, threads, datingProfile, datingMatches } = useStore();
  const navigate = useNavigate();
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [sent, setSent] = useState<Record<string,string>>({});
  const [incoming, setIncoming] = useState<any[]>([]);
  const [, setClock] = useState(Date.now());
  const [connections, setConnections] = useState<any[]>([]);
  const loadConnections = async () => {
    const [userRes, connRes] = await Promise.all([
      (supabase as any).auth.getUser(),
      (supabase as any).from("dating_connections").select("id,requester_id,recipient_id,status,requester_confirmed,recipient_confirmed,matched_at,reveal_at"),
    ]);
    const uid = userRes?.data?.user?.id;
    const rows = connRes?.data ?? [];
    if (!connRes?.error) {
      setConnections(rows);
      setIncoming(rows.filter((x:any) => x.status === "pending" && x.recipient_id === uid));
    }
  };

  useEffect(() => {
    void loadConnections();
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Pre-cache video ad units

  const match = async (m: Match) => {
    if (!m.userId) return;
    const status = await requestDatingMatch(m.userId);
    if (!status) return;
    setSent((s) => ({...s,[m.userId!]:status}));
    setOpenMatch(null);
  };

  const connectionFor = (userId?: string) => connections.find((x:any) => userId && ((x.requester_id === userId && x.recipient_id === datingProfile?.userId) || (x.recipient_id === userId && x.requester_id === datingProfile?.userId)));

  const allMatches: Match[] = [
    ...(datingProfile ? [{ ...datingProfile, name: `${datingProfile.name} (You)` }] : []),
    ...datingMatches,
  ];

  return (
    <AppShell
      title="Dating"
      subtitle="Tap a card for the full profile. Send a request first. Mutual matches follow the 72-hour confirmation flow before chat unlocks."
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

      {connections.filter((x:any)=>x.status==="matched" && x.reveal_at && new Date(x.reveal_at).getTime()>Date.now()).map((x:any)=>{
        const remaining=Math.max(0,new Date(x.reveal_at).getTime()-Date.now());
        const h=Math.floor(remaining/3600000), m=Math.floor((remaining%3600000)/60000), sec=Math.floor((remaining%60000)/1000);
        return <section key={x.id} className="mb-5 rounded-2xl border border-[var(--dating)]/20 bg-[var(--dating)]/5 p-4">
          <p className="font-display font-bold">Mutual match 💗</p>
          <p className="mt-1 text-xs text-muted-foreground">The full 72-hour waiting period must finish before either person can confirm. Photos remain blurred until both confirmations are complete.</p>
          <p className="mt-3 text-center text-2xl font-black tabular-nums text-[var(--dating)]">{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(sec).padStart(2,"0")}</p>
        </section>;
      })}

      {connections.filter((x:any)=>x.status==="matched" && new Date(x.reveal_at).getTime()<=Date.now() && (!x.requester_confirmed || !x.recipient_confirmed)).length ? (
        <section className="mb-5 rounded-2xl border border-[var(--dating)]/25 bg-[var(--dating)]/5 p-4">
          <p className="font-display font-bold">72-hour confirmation ready</p>
          <p className="mt-1 text-xs text-muted-foreground">The waiting period is complete. Both people must confirm before Dating Chat unlocks.</p>
          <div className="mt-3 space-y-2">
            {connections.filter((x:any)=>x.status==="matched" && new Date(x.reveal_at).getTime()<=Date.now() && (!x.requester_confirmed || !x.recipient_confirmed)).map((x:any)=>(
              <div key={x.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">🐼</span><span className="flex-1 text-sm">Mutual Panda match</span>
                <Button size="sm" onClick={()=>void navigate({to:"/messages"})}>Open Messages</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {incoming.length ? (
        <section className="mb-5 rounded-2xl border border-[var(--dating)]/25 bg-[var(--dating)]/5 p-4">
          <p className="font-display font-bold">Dating requests</p>
          <p className="mt-1 text-xs text-muted-foreground">Accepting creates the mutual 72-hour confirmation period.</p>
          <div className="mt-3 space-y-2">
            {incoming.map((r:any)=>(
              <div key={r.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">🐼</span><span className="flex-1 text-sm">Anonymous Panda</span>
                <Button size="sm" onClick={()=>void (supabase as any).rpc("respond_dating_match_secure",{p_connection_id:r.id,p_accept:true}).then(async ({data,error}:any)=>{if(error){toast.error(error.message??"Could not accept request");return;} await loadConnections();toast.success("Mutual match 💗",{description:"Your 72-hour confirmation period has started."});})}>Accept</Button>
                <Button size="sm" variant="outline" onClick={()=>void (supabase as any).rpc("respond_dating_match_secure",{p_connection_id:r.id,p_accept:false}).then(({error}:any)=>{if(error)throw error;setIncoming(x=>x.filter(y=>y.id!==r.id));})}>Decline</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
                  <DatingPhoto match={m} connection={idx === 0 ? undefined : connectionFor(m.userId)} />
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
                    <Heart className="size-4 fill-current" /> {m.userId && sent[m.userId] === "matched" ? "Mutual match 💗" : m.userId && sent[m.userId] === "pending" ? "Request sent" : "Send dating request"}
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
        <MessageCircle className="size-3.5" /> Chat unlocks only after mutual confirmation and the 72-hour waiting period. Normal messages then cost 1 BC; VIP is free.
      </p>

      {/* Dating Profile Registration & Edit Modal */}
      <RegisterDatingModal open={registerOpen} onOpenChange={setRegisterOpen} />

      <Dialog open={!!openMatch} onOpenChange={(o) => !o && setOpenMatch(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-lg">
          {openMatch ? (
            <div>
              <div className="grid h-40 place-items-center bg-[color-mix(in_oklab,var(--dating)_22%,transparent)] text-6xl">
                <DatingPhoto match={openMatch} connection={connectionFor(openMatch.userId)} />
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
                  <Heart className="size-4 fill-current" /> Send dating request
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

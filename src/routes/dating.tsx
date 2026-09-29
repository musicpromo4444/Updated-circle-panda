import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { requestDatingMatch, startDatingChat, threads, datingProfile, datingMatches } = useStore();
  const navigate = useNavigate();
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [sent, setSent] = useState<Record<string,string>>({});
  const [incoming, setIncoming] = useState<any[]>([]);
  const [, setClock] = useState(Date.now());
  const [connections, setConnections] = useState<any[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(99);
  const [countryFilter, setCountryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [lookingForFilter, setLookingForFilter] = useState("");
  const [lifestyleFilter, setLifestyleFilter] = useState("");
  const [smokingFilter, setSmokingFilter] = useState("");
  const [drinkingFilter, setDrinkingFilter] = useState("");
  const [childrenFilter, setChildrenFilter] = useState("");
  const [educationFilter, setEducationFilter] = useState("");
  const [heightMin, setHeightMin] = useState(0);
  const [heightMax, setHeightMax] = useState(0);
  const [zodiacFilter, setZodiacFilter] = useState("");
  const [sameCountryOnly, setSameCountryOnly] = useState(true);
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
    if (status === "matched") {
      const threadId = await startDatingChat(m.userId, m.name);
      if (threadId) navigate({ to: "/messages", search: { thread: threadId } });
    }
  };

  const connectionFor = (userId?: string) => connections.find((x:any) => userId && ((x.requester_id === userId && x.recipient_id === datingProfile?.userId) || (x.recipient_id === userId && x.requester_id === datingProfile?.userId)));

  const allMatches: Match[] = [
    ...(datingProfile ? [{ ...datingProfile, name: `${datingProfile.name} (You)` }] : []),
    ...datingMatches,
  ];
  const filteredMatches = allMatches.filter((m:any, idx) => {
    if (idx === 0) return true;
    if (m.age < ageMin || m.age > ageMax) return false;
    if (sameCountryOnly && datingProfile?.country && String(m.country).toLowerCase() !== String(datingProfile.country).toLowerCase()) return false;
    if (countryFilter && !String(m.country ?? "").toLowerCase().includes(countryFilter.toLowerCase())) return false;
    if (locationFilter && !String(m.location ?? "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (genderFilter && String(m.gender ?? "").toLowerCase() !== genderFilter.toLowerCase()) return false;
    if (goalFilter && !String(m.relationshipGoal ?? "").toLowerCase().includes(goalFilter.toLowerCase())) return false;
    if (lookingForFilter && !(m.lookingFor ?? []).some((v:string)=>v.toLowerCase().includes(lookingForFilter.toLowerCase()))) return false;
    if (lifestyleFilter && !(m.lifestyle ?? []).some((v:string)=>v.toLowerCase().includes(lifestyleFilter.toLowerCase()))) return false;
    if (smokingFilter && String(m.smoking ?? "").toLowerCase() !== smokingFilter.toLowerCase()) return false;
    if (drinkingFilter && String(m.drinking ?? "").toLowerCase() !== drinkingFilter.toLowerCase()) return false;
    if (childrenFilter && String(m.children ?? "").toLowerCase() !== childrenFilter.toLowerCase()) return false;
    if (educationFilter && !String(m.education ?? "").toLowerCase().includes(educationFilter.toLowerCase())) return false;
    if (heightMin && Number(m.heightCm ?? 0) < heightMin) return false;
    if (heightMax && Number(m.heightCm ?? 0) > heightMax) return false;
    if (zodiacFilter && String(m.zodiac ?? "").toLowerCase() !== zodiacFilter.toLowerCase()) return false;
    return true;
  });
  const activeFilterCount = [ageMin > 18, ageMax < 99, countryFilter, locationFilter, genderFilter, goalFilter, lookingForFilter, lifestyleFilter, smokingFilter, drinkingFilter, childrenFilter, educationFilter, heightMin, heightMax, zodiacFilter, !sameCountryOnly].filter(Boolean).length;
  const resetFilters = () => {
    setAgeMin(18); setAgeMax(99); setCountryFilter(""); setLocationFilter(""); setGenderFilter(""); setGoalFilter("");
    setLookingForFilter(""); setLifestyleFilter(""); setSmokingFilter(""); setDrinkingFilter(""); setChildrenFilter("");
    setEducationFilter(""); setHeightMin(0); setHeightMax(0); setZodiacFilter(""); setSameCountryOnly(false);
  };

  return (
    <AppShell
      title="Dating"
      subtitle="Tap a card for the full profile. Send a request first. Mutual matches open a free 72-hour Dating Chat. Photos stay hidden until both people continue after 72 hours."
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

      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" className="flex-1 gap-2 rounded-2xl" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="size-4" /> Filters {activeFilterCount ? `(${activeFilterCount})` : ""}</Button>
        {datingProfile ? <span className="rounded-2xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">{sameCountryOnly ? `Showing ${datingProfile.country || "your country"} first` : "Worldwide"}</span> : null}
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
        {filteredMatches.map((m, idx) => (
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
            {((idx + 1 - (datingProfile ? 1 : 0)) > 0 && ((idx + 1 - (datingProfile ? 1 : 0)) % 5 === 0)) ? (
              <div className="my-2 sm:col-span-2">
                <PlayableVideoAd index={Math.floor((idx + 1 - (datingProfile ? 1 : 0)) / 5) - 1} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MessageCircle className="size-3.5" /> Mutual matches can chat free for 72 hours. After that, both must continue before normal 1 BC messages unlock; VIP is free.
      </p>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="size-5" /> Dating Filters</DialogTitle>
          <DialogDescription>Choose who appears in your Dating cards. Your filters are private.</DialogDescription>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <label className="text-xs font-semibold">Minimum age<Input type="number" min={18} max={99} value={ageMin} onChange={e=>setAgeMin(Math.max(18,Number(e.target.value)||18))} className="mt-1" /></label>
            <label className="text-xs font-semibold">Maximum age<Input type="number" min={18} max={99} value={ageMax} onChange={e=>setAgeMax(Math.min(99,Number(e.target.value)||99))} className="mt-1" /></label>
            <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm sm:col-span-2"><input type="checkbox" checked={sameCountryOnly} onChange={e=>setSameCountryOnly(e.target.checked)} /> Only show people in my country</label>
            <label className="text-xs font-semibold">Country<Input value={countryFilter} onChange={e=>setCountryFilter(e.target.value)} placeholder="Any country" className="mt-1" /></label>
            <label className="text-xs font-semibold">City / area<Input value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} placeholder="Optional" className="mt-1" /></label>
            <label className="text-xs font-semibold">Gender<select value={genderFilter} onChange={e=>setGenderFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Any</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
            <label className="text-xs font-semibold">Relationship goal<Input value={goalFilter} onChange={e=>setGoalFilter(e.target.value)} placeholder="e.g. serious" className="mt-1" /></label>
            <label className="text-xs font-semibold">Looking for<Input value={lookingForFilter} onChange={e=>setLookingForFilter(e.target.value)} placeholder="e.g. Long-term relationship" className="mt-1" /></label>
            <label className="text-xs font-semibold">Lifestyle<Input value={lifestyleFilter} onChange={e=>setLifestyleFilter(e.target.value)} placeholder="e.g. Night owl" className="mt-1" /></label>
            <label className="text-xs font-semibold">Smoking<select value={smokingFilter} onChange={e=>setSmokingFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Any</option><option>Never</option><option>Sometimes</option><option>Yes</option></select></label>
            <label className="text-xs font-semibold">Drinking<select value={drinkingFilter} onChange={e=>setDrinkingFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Any</option><option>Never</option><option>Sometimes</option><option>Yes</option></select></label>
            <label className="text-xs font-semibold">Children<select value={childrenFilter} onChange={e=>setChildrenFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Any</option><option>No children</option><option>Have children</option><option>Want children</option><option>Don't want children</option></select></label>
            <label className="text-xs font-semibold">Education<Input value={educationFilter} onChange={e=>setEducationFilter(e.target.value)} placeholder="Optional" className="mt-1" /></label>
            <label className="text-xs font-semibold">Minimum height (cm)<Input type="number" min={0} value={heightMin || ""} onChange={e=>setHeightMin(Math.max(0,Number(e.target.value)||0))} className="mt-1" /></label>
            <label className="text-xs font-semibold">Maximum height (cm)<Input type="number" min={0} value={heightMax || ""} onChange={e=>setHeightMax(Math.max(0,Number(e.target.value)||0))} className="mt-1" /></label>
            <label className="text-xs font-semibold">Zodiac<Input value={zodiacFilter} onChange={e=>setZodiacFilter(e.target.value)} placeholder="e.g. Leo" className="mt-1" /></label>
          </div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={resetFilters}><X className="size-4" /> Reset</Button><Button className="flex-1 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90" onClick={()=>setFiltersOpen(false)}>Show matches</Button></div>
        </DialogContent>
      </Dialog>

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
                  📍 {openMatch.country || openMatch.location} · anonymous profile
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
import { requestLogin } from "@/components/auth/LoginRequiredDialog";

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
  country?: string;
  gender?: string;
  aboutTraits?: string[];
  lookingFor?: string[];
  relationshipGoal?: string;
  lifestyle?: string[];
  occupation?: string;
  favoriteDate?: string;
};

function DatingPhoto({ match, connection }: { match: Match; connection?: any }) {
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const revealed = Boolean(connection?.status === "matched" && connection?.requester_confirmed && connection?.recipient_confirmed);
  useEffect(() => {
    let active = true;
    if (!revealed && match.blurredPhotoPath) {
      void supabase.storage.from("dating-photo-blur").createSignedUrl(match.blurredPhotoPath, 10 * 60).then(({ data, error }: any) => {
        if (active && !error) setRevealedUrl(data?.signedUrl ?? null);
      });
      return () => { active = false; };
    }
    if (!revealed || !match.photoPath) { setRevealedUrl(null); return; }
    void supabase.storage.from("dating-photos").createSignedUrl(match.photoPath, 60 * 60).then(({ data, error }: any) => {
      if (active && !error) setRevealedUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [revealed, match.photoPath, match.blurredPhotoPath]);

  if (revealed && revealedUrl) {
    return <img src={revealedUrl} alt="Dating profile" className="size-full object-cover" />;
  }
  if (match.blurredPhotoPath && revealedUrl) {
    return <img src={revealedUrl} alt="Blurred Dating profile" className="size-full object-cover blur-sm" />;
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
  const { requestDatingMatch, startDatingChat, searchDatingProfiles, refreshDatingData, datingProfile, datingMatches } = useStore();
  const navigate = useNavigate();
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const openDatingRegistration = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.is_anonymous) {
      requestLogin("register for Dating");
      return;
    }
    setRegisterOpen(true);
  };
  const [sent, setSent] = useState<Record<string,string>>({});
  const [incoming, setIncoming] = useState<any[]>([]);
  const [, setClock] = useState(Date.now());
  const [connections, setConnections] = useState<any[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
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
    void refreshDatingData();
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [refreshDatingData]);

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
    if (sameCountryOnly && datingProfile?.country && String(m.country).toLowerCase() !== String(datingProfile.country).toLowerCase()) return false;
    if (countryFilter && !String(m.country ?? "").toLowerCase().includes(countryFilter.toLowerCase())) return false;
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
  const activeFilterCount = [countryFilter, locationFilter, goalFilter, lookingForFilter, lifestyleFilter, smokingFilter, drinkingFilter, childrenFilter, educationFilter, heightMin, heightMax, zodiacFilter, !sameCountryOnly].filter(Boolean).length;
  const applyFilters = async () => {
    await searchDatingProfiles({
      ageMin:18, ageMax:120, country: countryFilter, location: locationFilter, gender:"",
      relationshipGoal: goalFilter, lookingFor: lookingForFilter, lifestyle: lifestyleFilter,
      smoking: smokingFilter, drinking: drinkingFilter, children: childrenFilter, education: educationFilter,
      heightMin, heightMax, zodiac: zodiacFilter, sameCountryOnly,
    });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setCountryFilter(""); setLocationFilter(""); setGoalFilter("");
    setLookingForFilter(""); setLifestyleFilter(""); setSmokingFilter(""); setDrinkingFilter(""); setChildrenFilter("");
    setEducationFilter(""); setHeightMin(0); setHeightMax(0); setZodiacFilter(""); setSameCountryOnly(true);
  };

  return (
    <AppShell
      title="Dating"
      subtitle="Tap a card for the full profile. Send a request first. Mutual matches open a free 72-hour Dating Chat. Photos stay hidden until both people continue after 72 hours."
    >


      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" className="flex-1 gap-2 rounded-2xl" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="size-4" /> Filters {activeFilterCount ? `(${activeFilterCount})` : ""}</Button>
        {datingProfile ? <span className="rounded-2xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">{sameCountryOnly ? `Showing ${datingProfile.country || "your country"} first` : "Worldwide"}</span> : null}
      </div>

      {/* Primary CTA button immediately below subtitle description and above main content cards */}
      <div className="mb-5">
        <Button
          size="lg"
          onClick={() => void openDatingRegistration()}
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
                <Button size="sm" onClick={()=>void (supabase as any).rpc("respond_dating_match_secure",{p_connection_id:r.id,p_accept:true}).then(async ({data,error}:any)=>{if(error){toast.error(error.message??"Could not accept request");return;} await loadConnections();toast.success("Mutual match 💗",{description:"Your free 72-hour Dating Chat is ready."}); if(data?.thread_id) void navigate({to:"/messages",search:{thread:data.thread_id}});})}>Accept</Button>
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
                <span className="block p-4 pb-0">
                  <span className="flex items-center gap-2 font-display text-lg font-semibold">
                    {m.name}
                    <span className="text-sm font-normal text-muted-foreground">{m.age}</span>
                  </span>
                  {datingProfile && idx === 0 ? <span className="mt-1 inline-block rounded-full bg-[var(--dating)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--dating)]">Your Dating Card</span> : null}
                  <span className="mt-2 block text-sm text-muted-foreground">{m.location || "Location not listed"} · {m.country || "Country not listed"}</span>
                  <span className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {[
                      ["Gender", m.gender],
                      ["Looking for", (m.lookingFor ?? []).slice(0,2).join(", ")],
                      ["Relationship", m.relationshipGoal],
                      ["Lifestyle", (m.lifestyle ?? []).slice(0,2).join(", ")],
                      ["Personality", (m.personality ?? []).slice(0,2).join(", ")],
                      ["Interests", (m.interests ?? []).slice(0,2).join(", ")],
                      ["Occupation", m.occupation],
                      ["Education", m.education],
                      ["Children", m.children],
                      ["Smoking", m.smoking],
                      ["Drinking", m.drinking],
                      ["Height", m.heightCm ? `${m.heightCm} cm` : ""],
                    ].filter((x:any)=>String(x[1] ?? "").trim()).map(([label,value]:any)=><span key={label} className="rounded-xl bg-secondary/50 px-2.5 py-2"><span className="block text-[9px] uppercase text-muted-foreground">{label}</span><span className="mt-0.5 block font-semibold">{value}</span></span>)}
                  </span>
                </span>
              </button>
              <div className="p-4 pt-3">
                {datingProfile && idx === 0 ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[var(--dating)]/40 text-[var(--dating)] hover:bg-[var(--dating)]/10 font-semibold"
                    onClick={() => void openDatingRegistration()}
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
                <PlayableVideoAd placement="speed_dating_interstitial" index={Math.floor((idx + 1 - (datingProfile ? 1 : 0)) / 5) - 1} />
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
            <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm sm:col-span-2"><input type="checkbox" checked={sameCountryOnly} onChange={e=>setSameCountryOnly(e.target.checked)} /> Only show people in my country</label>
            <label className="text-xs font-semibold">Country<Input value={countryFilter} onChange={e=>setCountryFilter(e.target.value)} placeholder="Any country" className="mt-1" /></label>
            <label className="text-xs font-semibold">City / area<Input value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} placeholder="Optional" className="mt-1" /></label>
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
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={resetFilters}><X className="size-4" /> Reset</Button><Button className="flex-1 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90" onClick={()=>void applyFilters()}>Show matches</Button></div>
        </DialogContent>
      </Dialog>

      {/* Dating Profile Registration & Edit Modal */}
      <RegisterDatingModal open={registerOpen} onOpenChange={setRegisterOpen} />

      <Dialog open={!!openMatch} onOpenChange={(o) => !o && setOpenMatch(null)}>
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none border-0 bg-background p-0">
          {openMatch ? (
            <div className="min-h-full">
              <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
                <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setOpenMatch(null)}><ArrowLeft className="size-4" /> Back</Button>
                <span className="font-display font-semibold">Dating Profile</span>
              </div>
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

                {openMatch.aboutTraits?.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">About</p><div className="mt-2 flex flex-wrap gap-2">{openMatch.aboutTraits.map((i:string)=><span key={i} className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">{i}</span>)}</div></div> : null}

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

                {openMatch.lookingFor?.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Looking for</p><div className="mt-2 flex flex-wrap gap-2">{openMatch.lookingFor.map((i:string)=><span key={i} className="rounded-full border border-[var(--dating)]/25 bg-[var(--dating)]/5 px-3 py-1 text-xs text-muted-foreground">{i}</span>)}</div></div> : null}
                <p className="mt-3 text-xs text-muted-foreground">📍 {openMatch.country || openMatch.location} · anonymous profile</p>

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

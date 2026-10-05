import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
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
  stateProvince?: string;
  gender?: string;
  aboutTraits?: string[];
  lookingFor?: string[];
  relationshipGoal?: string;
  lifestyle?: string[];
  occupation?: string;
  favoriteDate?: string;
  personality?: string[];
  education?: string;
  children?: string;
  smoking?: string;
  drinking?: string;
  heightCm?: number | null;
  zodiac?: string;
  sexualExperience?: string;
  intimacyPreference?: string;
  loveLanguage?: string;
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

const RELATIONSHIP_GOALS = [
  "Long-distance relationship","Something casual","Long-term relationship","Something that leads to marriage",
  "Just for fun","Just exploring","Friendship first","Dating / getting to know someone"
];
const LOOKING_FOR_OPTIONS = [
  "Very fair","Fair","Light brown","Brown","Dark brown","Deep dark","Slim","Petite","Average build","Athletic",
  "Muscular","Chubby","Curvy","Plus-size","Broad shoulders","Figure-eight","Short","Average height","Tall",
  "Very tall","Black hair","Brown hair","Blonde hair","Red hair","Grey hair","Other","Short hair","Long hair",
  "Dreads","Braids","Curly hair","Straight hair","Bald","Black eyes","Brown eyes","Hazel eyes","Blue eyes",
  "Green eyes","Grey eyes","Casual","Smart","Streetwear","Glamorous","Feminine","Masculine","Sexy"
];
const LIFESTYLE_OPTIONS = [
  "Playful","Adventurous","Social","Social-media person","Office type","Inside type","Romantic","Funny",
  "Ambitious","Party person","Quiet/private","Family-oriented","Spontaneous","Jealous","Easygoing"
];
const SMOKING_OPTIONS = ["Non-smoker","Smoker","Occasionally","Prefer not to say"];
const DRINKING_OPTIONS = ["Non-drinker","Drinker","Occasionally","Prefer not to say"];
const CHILDREN_OPTIONS = ["No children","Have children","Prefer not to say"];

function DatingPage() {
  const { requestDatingMatch, startDatingChat, searchDatingProfiles, refreshDatingData, datingProfile, datingMatches } = useStore();
  const navigate = useNavigate();
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [profilePage, setProfilePage] = useState(0);
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
  const [stateFilter, setStateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [lookingForFilter, setLookingForFilter] = useState("");
  const [lifestyleFilter, setLifestyleFilter] = useState("");
  const [smokingFilter, setSmokingFilter] = useState("");
  const [drinkingFilter, setDrinkingFilter] = useState("");
  const [childrenFilter, setChildrenFilter] = useState("");
  const [sameCountryOnly, setSameCountryOnly] = useState(false);
  const loadConnections = async () => {
    const [userRes, connRes, requestRes] = await Promise.all([
      (supabase as any).auth.getUser(),
      (supabase as any).from("dating_connections").select("id,requester_id,recipient_id,status,requester_confirmed,recipient_confirmed,matched_at,reveal_at"),
      (supabase as any).from("direct_message_requests").select("id,sender_id,recipient_id,status,created_at,thread_id,message").eq("kind","dating"),
    ]);
    const uid = userRes?.data?.user?.id;
    const rows = connRes?.data ?? [];
    const requests = requestRes?.data ?? [];
    if (!connRes?.error || !requestRes?.error) {
      setConnections(rows);
      // Dating requests are message requests. The request itself is the source of
      // truth until accepted; acceptance then creates the Dating connection/chat.
      setIncoming(requests.filter((x:any) => x.status === "pending" && x.recipient_id === uid));
      const sent: Record<string,string> = {};
      rows.filter((x:any) => x.requester_id === uid).forEach((x:any) => { sent[x.recipient_id] = x.status; });
      requests.filter((x:any) => x.sender_id === uid).forEach((x:any) => {
        sent[x.recipient_id] = x.status === "accepted" ? "matched" : x.status;
      });
      setSent(sent);
    }
  };

  useEffect(() => {
    void loadConnections();
    void refreshDatingData();
    const connectionChannel = supabase.channel("dating-connections-live")
      .on("postgres_changes", {event:"*", schema:"public", table:"dating_connections"}, () => {
        void loadConnections();
      })
      .on("postgres_changes", {event:"*", schema:"public", table:"direct_message_requests"}, () => {
        void loadConnections();
      })
      .subscribe();
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    const onFocus = () => { void refreshDatingData(); };
    window.addEventListener("focus", onFocus);
    const channel = supabase.channel("dating-discovery-live")
      .on("postgres_changes", {event:"*", schema:"public", table:"dating_profiles"}, () => {
        void refreshDatingData({sameCountryOnly:false});
      })
      .subscribe();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(connectionChannel);
    };
  }, [refreshDatingData]);

  // Pre-cache video ad units

  const match = async (m: Match) => {
    if (!m.userId || m.userId === datingProfile?.userId) {
      toast.error("That Dating card cannot receive a request.");
      return;
    }
    const result = await requestDatingMatch(m.userId);
    if (!result) return;
    setSent((s) => ({...s,[m.userId!]:result.status}));
    await loadConnections();
    setOpenMatch(null);

    // Every Dating request enters the same Messages request-card pipeline.
    // Pending: show the sender their own request immediately.
    if (result.status === "pending" && result.requestId) {
      navigate({ to: "/messages", search: { request: result.requestId } });
      return;
    }

    // Already matched: open the existing Dating thread.
    if ((result.status === "matched" || result.status === "accepted") && result.threadId) {
      navigate({ to: "/messages", search: { thread: result.threadId } });
    }
  };

  const connectionFor = (userId?: string) => connections.find((x:any) => userId && ((x.requester_id === userId && x.recipient_id === datingProfile?.userId) || (x.recipient_id === userId && x.requester_id === datingProfile?.userId)));

  const allMatches: Match[] = datingMatches.filter((m:any) => m.userId && m.userId !== datingProfile?.userId);
  const filteredMatches = allMatches.filter((m:any, idx) => {
    if (idx === 0) return true;
    if (sameCountryOnly && datingProfile?.country && String(m.country).toLowerCase() !== String(datingProfile.country).toLowerCase()) return false;
    if (countryFilter && String(m.country ?? "").toLowerCase() !== countryFilter.toLowerCase()) return false;
    if (stateFilter && String(m.stateProvince ?? "").toLowerCase() !== stateFilter.toLowerCase()) return false;
    if (locationFilter && String(m.location ?? "").toLowerCase() !== locationFilter.toLowerCase()) return false;
    if (goalFilter && !String(m.relationshipGoal ?? "").toLowerCase().includes(goalFilter.toLowerCase())) return false;
    if (lookingForFilter && !(m.lookingFor ?? []).some((v:string)=>v.toLowerCase().includes(lookingForFilter.toLowerCase()))) return false;
    if (lifestyleFilter && !(m.lifestyle ?? []).some((v:string)=>v.toLowerCase().includes(lifestyleFilter.toLowerCase()))) return false;
    if (smokingFilter && String(m.smoking ?? "").toLowerCase() !== smokingFilter.toLowerCase()) return false;
    if (drinkingFilter && String(m.drinking ?? "").toLowerCase() !== drinkingFilter.toLowerCase()) return false;
    if (childrenFilter && String(m.children ?? "").toLowerCase() !== childrenFilter.toLowerCase()) return false;
    return true;
  });
  const activeFilterCount = [countryFilter, stateFilter, locationFilter, goalFilter, lookingForFilter, lifestyleFilter, smokingFilter, drinkingFilter, childrenFilter, sameCountryOnly].filter(Boolean).length;
  const applyFilters = async () => {
    await searchDatingProfiles({
      ageMin:18, ageMax:120, country: sameCountryOnly && !countryFilter ? (datingProfile?.country ?? "") : countryFilter, state: stateFilter, location: locationFilter, gender:"",
      relationshipGoal: goalFilter, lookingFor: lookingForFilter, lifestyle: lifestyleFilter,
      smoking: smokingFilter, drinking: drinkingFilter, children: childrenFilter,
      sameCountryOnly,
    });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setCountryFilter(""); setStateFilter(""); setLocationFilter(""); setGoalFilter("");
    setLookingForFilter(""); setLifestyleFilter(""); setSmokingFilter(""); setDrinkingFilter(""); setChildrenFilter("");
setSameCountryOnly(false);
  };

  const countryOptions = Array.from(new Set(datingMatches.map((m:any) => String(m.country ?? "").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const stateOptions = Array.from(new Set(datingMatches
    .filter((m:any) => !countryFilter || String(m.country ?? "").toLowerCase() === countryFilter.toLowerCase())
    .map((m:any) => String(m.stateProvince ?? "").trim()).filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b));
  const areaOptions = Array.from(new Set(datingMatches
    .filter((m:any) => (!countryFilter || String(m.country ?? "").toLowerCase() === countryFilter.toLowerCase())
      && (!stateFilter || String(m.stateProvince ?? "").toLowerCase() === stateFilter.toLowerCase()))
    .map((m:any) => String(m.location ?? "").trim()).filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b));

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
                <Button size="sm" onClick={()=>void (supabase as any).rpc("respond_direct_message_request_secure",{p_request_id:r.id,p_accept:true}).then(async ({data,error}:any)=>{if(error){toast.error(error.message??"Could not accept request");return;} await loadConnections();toast.success("Message request accepted 💗",{description:"Your free 72-hour Dating Chat is ready."}); if(data?.thread_id) void navigate({to:"/messages",search:{thread:data.thread_id}});})}>Accept</Button>
                <Button size="sm" variant="outline" onClick={()=>void (supabase as any).rpc("respond_direct_message_request_secure",{p_request_id:r.id,p_accept:false}).then(({error}:any)=>{if(error)throw error;setIncoming(x=>x.filter(y=>y.id!==r.id));})}>Decline</Button>
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
                onClick={() => { setOpenMatch(m); setProfilePage(0); }}
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
                    onClick={() => void match(m)}
                    disabled={Boolean(m.userId && (sent[m.userId] === "pending" || sent[m.userId] === "matched"))}
                  >
                    <Heart className="size-4 fill-current" /> {m.userId && sent[m.userId] === "matched" ? "Request accepted 💗" : m.userId && sent[m.userId] === "pending" ? "Sent request" : "Send message request"}
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

            <label className="text-xs font-semibold">Country
              <select value={countryFilter} onChange={e=>{ setCountryFilter(e.target.value); setStateFilter(""); setLocationFilter(""); }} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any country</option>{countryOptions.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">State
              <select value={stateFilter} onChange={e=>{ setStateFilter(e.target.value); setLocationFilter(""); }} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any state</option>{stateOptions.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Area
              <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any area</option>{areaOptions.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Relationship goal
              <select value={goalFilter} onChange={e=>setGoalFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{RELATIONSHIP_GOALS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Looking for
              <select value={lookingForFilter} onChange={e=>setLookingForFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{LOOKING_FOR_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Lifestyle
              <select value={lifestyleFilter} onChange={e=>setLifestyleFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{LIFESTYLE_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Smoking
              <select value={smokingFilter} onChange={e=>setSmokingFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{SMOKING_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Drinking
              <select value={drinkingFilter} onChange={e=>setDrinkingFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{DRINKING_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="text-xs font-semibold">Children
              <select value={childrenFilter} onChange={e=>setChildrenFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <option value="">Any</option>{CHILDREN_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>

          </div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={resetFilters}><X className="size-4" /> Reset</Button><Button className="flex-1 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90" onClick={()=>void applyFilters()}>Show matches</Button></div>
        </DialogContent>
      </Dialog>

      {/* Dating Profile Registration & Edit Modal */}
      <RegisterDatingModal open={registerOpen} onOpenChange={setRegisterOpen} />

      <Dialog open={!!openMatch} onOpenChange={(o) => !o && setOpenMatch(null)}>
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none border-0 bg-background p-0">
          {openMatch ? (
            <div className="flex min-h-full flex-col">
              <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
                <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setOpenMatch(null)}><ArrowLeft className="size-4" /> Back</Button>
                <span className="flex-1 text-center font-display font-semibold">Dating Profile</span>
                <span className="w-14 text-right text-xs text-muted-foreground">{profilePage + 1}/2</span>
              </div>

              <div className="flex-1 p-5">
                {profilePage === 0 ? (
                  <>
                    <div className="mb-6">
                      <div className="mb-2 inline-flex rounded-full bg-[var(--dating)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--dating)]">
                        About this Panda
                      </div>
                      <DialogTitle className="font-display text-3xl">{openMatch.name} <span className="text-lg font-normal text-muted-foreground">{openMatch.age}</span></DialogTitle>
                      <DialogDescription className="mt-1">{openMatch.vibe || "Dating profile"}</DialogDescription>
                    </div>

                    <div className="space-y-3">
                      {[
                        ["Gender", openMatch.gender],
                        ["Relationship goal", openMatch.relationshipGoal],
                        ["Looking for", (openMatch.lookingFor ?? []).join(", ")],
                        ["About", (openMatch.aboutTraits ?? []).join(", ")],
                        ["Lifestyle", (openMatch.lifestyle ?? []).join(", ")],
                        ["Personality", (openMatch.personality ?? []).join(", ")],
                        ["Interests", (openMatch.interests ?? []).join(", ")],
                        ["Occupation", openMatch.occupation],
                      ].filter(([,v]) => String(v ?? "").trim()).map(([label,value]) => (
                        <div key={label} className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm leading-relaxed">{value}</p>
                        </div>
                      ))}
                      {openMatch.bio ? <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Bio</p><p className="mt-1 text-sm leading-relaxed">{openMatch.bio}</p></div> : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="mb-2 inline-flex rounded-full bg-[var(--dating)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--dating)]">More about this Panda</div>
                      <DialogTitle className="font-display text-2xl">Lifestyle & preferences</DialogTitle>
                      <DialogDescription className="mt-1">Photos remain hidden until the Dating reveal rules are completed.</DialogDescription>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Country", openMatch.country],
                        ["Location", openMatch.location],
                        ["Education", openMatch.education],
                        ["Children", openMatch.children],
                        ["Smoking", openMatch.smoking],
                        ["Drinking", openMatch.drinking],
                        ["Height", openMatch.heightCm ? `${openMatch.heightCm} cm` : ""],
                        ["Zodiac", openMatch.zodiac],
                        ["Sexual Experience", openMatch.sexualExperience],
                        ["Intimacy Preference", openMatch.intimacyPreference],
                        ["Love Language", openMatch.loveLanguage],
                        ["Favorite Date", openMatch.favoriteDate],
                      ].filter(([,v]) => String(v ?? "").trim()).map(([label,value]) => (
                        <div key={label} className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 border-t border-border/70 bg-background/95 p-4 backdrop-blur-xl">
                <div className="flex gap-2">
                  {profilePage > 0 ? <Button variant="outline" className="flex-1" onClick={() => setProfilePage(0)}>Previous</Button> : null}
                  {profilePage === 0 ? <Button className="flex-1 bg-[var(--dating)] text-[var(--dating-foreground)] hover:bg-[var(--dating)]/90" onClick={() => setProfilePage(1)}>Next</Button> : (
                    <Button
                      className="flex-1 bg-[var(--dating)] text-[var(--dating-foreground)] hover:bg-[var(--dating)]/90"
                      onClick={() => void match(openMatch)}
                      disabled={Boolean(openMatch.userId && (sent[openMatch.userId] === "pending" || sent[openMatch.userId] === "matched"))}
                    >
                      <Heart className="mr-2 size-4 fill-current" />
                      {openMatch.userId && sent[openMatch.userId] === "matched" ? "Request accepted 💗" : openMatch.userId && sent[openMatch.userId] === "pending" ? "Sent request" : "Send dating request"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>    </AppShell>
  );
}

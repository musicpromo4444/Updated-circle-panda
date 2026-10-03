import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  Crown,
  Heart,
  MessageCircle,
  Bell,
  Palette,
  Sparkles,
  Star,
  Trophy,
  Users,
  Share2,
  Eye,
  Copy,
  ShieldAlert,
  LogOut,
  Settings,
  CreditCard,
  Info,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { ProfileProgressCard } from "@/components/ProfileProgressCard";
import { VipIdentity } from "@/components/VipIdentity";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PandaAvatar } from "@/components/PandaAvatar";
import { useStore, pandaProgress, starRating, pandaTier, TIERS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Panda Profile — Circle Panda" },
      {
        name: "description",
        content:
          "Your anonymous Circle Panda dashboard: coin balance, star rating, Panda tier badge, and activity.",
      },
      { property: "og:title", content: "Your Panda Profile — Circle Panda" },
      {
        property: "og:description",
        content: "Coins, rating, tier badge, and activity in one place.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const HEADS = ["🐼", "🐼🎩", "🐼🧢", "🐼🎧", "🐼🎀"];
  const GLASSES = ["", "🕶️", "👓", "🥽"];
  const COSMETICS = ["", "✨", "🔥", "🌸", "💎", "⚡", "🦋", "🌈", "❤️", "💫"];
  const [avatar, setAvatar] = useState("🐼");
  const [accountGender, setAccountGender] = useState<"male" | "female" | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Your Panda");
  const [age, setAge] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [locationCountries, setLocationCountries] = useState<any[]>([]);
  const [locationStates, setLocationStates] = useState<string[]>([]);
  const [locationCities, setLocationCities] = useState<string[]>([]);
  const [locationAreas, setLocationAreas] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState<"active" | "deactivated" | "pending_deletion">("active");
  const [deactivatedUntil, setDeactivatedUntil] = useState<string | null>(null);
  const [deletionScheduledFor, setDeletionScheduledFor] = useState<string | null>(null);
  const [resumeDate, setResumeDate] = useState("");
  const [deletionConfirmOpen, setDeletionConfirmOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [avatarHead, setAvatarHead] = useState("🐼");
  const [avatarGlasses, setAvatarGlasses] = useState("");
  const [avatarCosmetic, setAvatarCosmetic] = useState("");
  const composeAvatar = (head=avatarHead, glasses=avatarGlasses, cosmetic=avatarCosmetic) => `${head}${glasses}${cosmetic}`;
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setProfileId(data.user.id);
      if (!data.user.is_anonymous) {
        await (supabase as any).rpc("ensure_my_circle_panda_profile");
      }
      const { data: profile } = await (supabase as any).from("profiles").select("display_name,avatar_url,gender,age,date_of_birth,country,state_province,city,area,address_line,bio").eq("id", data.user.id).maybeSingle();
      if (profile?.display_name) setDisplayName(profile.display_name);
      if (profile?.avatar_url) {
        const saved = String(profile.avatar_url);
        setAvatar(saved);
        setAvatarHead(saved.includes("🎩") ? "🐼🎩" : saved.includes("🧢") ? "🐼🧢" : saved.includes("🎧") ? "🐼🎧" : saved.includes("🎀") ? "🐼🎀" : "🐼");
        setAvatarGlasses(saved.includes("🕶️") ? "🕶️" : saved.includes("👓") ? "👓" : saved.includes("🥽") ? "🥽" : "");
        setAvatarCosmetic(saved.includes("✨") ? "✨" : saved.includes("🔥") ? "🔥" : saved.includes("🌸") ? "🌸" : saved.includes("💎") ? "💎" : saved.includes("⚡") ? "⚡" : saved.includes("🦋") ? "🦋" : saved.includes("🌈") ? "🌈" : "");
      }
      if (profile?.age) setAge(Number(profile.age));
      if (profile?.date_of_birth) setDateOfBirth(String(profile.date_of_birth));
      if (profile?.country) setCountry(profile.country);
      if (profile?.date_of_birth && profile?.country) setProfileSaved(true);
      if (profile?.state_province) setStateProvince(profile.state_province);
      if (profile?.city) setCity(profile.city);
      if (profile?.area) setArea(profile.area);
      if (profile?.address_line) setAddressLine(profile.address_line);
      if (profile?.bio) setBio(profile.bio);
      if (profile?.gender === "male" || profile?.gender === "female") setAccountGender(profile.gender);
      const { data: settings } = await (supabase as any).rpc("get_my_account_settings_secure");
      if (settings) {
        setAccountStatus(settings.status ?? "active");
        setDeactivatedUntil(settings.deactivated_until ?? null);
        setDeletionScheduledFor(settings.deletion_scheduled_for ?? null);
      }
    });
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoadingLocations(true);
    void fetch("https://countriesnow.space/api/v0.1/countries/positions")
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setLocationCountries(Array.isArray(json?.data) ? json.data : []); })
      .catch(() => { if (!cancelled) setLocationCountries([]); })
      .finally(() => { if (!cancelled) setLoadingLocations(false); });
    return () => { cancelled = true; };
  }, []);

  const loadStates = async (countryName: string) => {
    setStateProvince(""); setCity(""); setArea(""); setLocationCities([]); setLocationAreas([]);
    if (!countryName) { setLocationStates([]); return; }
    try {
      const r = await fetch("https://countriesnow.space/api/v0.1/countries/states", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: countryName }) });
      const json = await r.json();
      setLocationStates(Array.isArray(json?.data?.states) ? json.data.states.map((s:any) => s.name).filter(Boolean) : []);
    } catch { setLocationStates([]); }
  };

  const loadCities = async (countryName: string, stateName: string) => {
    setCity(""); setArea(""); setLocationAreas([]);
    if (!countryName || !stateName) { setLocationCities([]); return; }
    try {
      const r = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: countryName, state: stateName }) });
      const json = await r.json();
      setLocationCities(Array.isArray(json?.data) ? json.data.filter(Boolean) : []);
    } catch { setLocationCities([]); }
  };

  const loadAreas = async (countryName: string, stateName: string, cityName: string) => {
    setArea(""); setLocationAreas([]);
    if (!countryName || !stateName || !cityName) return;
    try {
      const q = encodeURIComponent(cityName + ", " + stateName + ", " + countryName);
      const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&q=" + q);
      const json = await r.json();
      const areas = Array.isArray(json) ? json.map((x:any) => x?.address?.suburb || x?.address?.neighbourhood || x?.address?.quarter || x?.address?.district).filter(Boolean) : [];
      setLocationAreas(Array.from(new Set(areas)));
    } catch { setLocationAreas([]); }
  };

  useEffect(() => {
    if (!country) return;
    void fetch("https://countriesnow.space/api/v0.1/countries/states", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({country}) })
      .then(r=>r.json()).then(j=>setLocationStates(Array.isArray(j?.data?.states)?j.data.states.map((s:any)=>s.name).filter(Boolean):[])).catch(()=>setLocationStates([]));
  }, [country]);

  useEffect(() => {
    if (!country || !stateProvince) return;
    void fetch("https://countriesnow.space/api/v0.1/countries/state/cities", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({country,state:stateProvince}) })
      .then(r=>r.json()).then(j=>setLocationCities(Array.isArray(j?.data)?j.data.filter(Boolean):[])).catch(()=>setLocationCities([]));
  }, [country,stateProvince]);

  useEffect(() => {
    if (!country || !stateProvince || !city) return;
    const q=encodeURIComponent(city+", "+stateProvince+", "+country);
    void fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&q="+q)
      .then(r=>r.json()).then(j=>{
        const areas=Array.isArray(j)?j.map((x:any)=>x?.address?.suburb||x?.address?.neighbourhood||x?.address?.quarter||x?.address?.district).filter(Boolean):[];
        setLocationAreas(Array.from(new Set(areas)));
      }).catch(()=>setLocationAreas([]));
  }, [country,stateProvince,city]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    toast.success("You have been logged out.");
    window.location.replace("/");
  };

  const saveAvatar = (next:string) => {
    void (supabase as any).rpc("set_panda_avatar_secure", { p_avatar: next }).then(({ data, error }: any) => {
      if (error) { toast.error(error.message ?? "Avatar could not be updated"); return; }
      setAvatar(data ?? next);
      toast.success("Panda avatar updated 🐼");
    });
  };
  const { coins, reputation, level, xp, posts, threads, groups, mySpotlight, isVip, vipExpiresAt } =
    useStore();
  const pandaRank = pandaProgress(xp);
  const tier = pandaTier(reputation);
  const [publishedConfessions, setPublishedConfessions] = useState(0);
  useEffect(() => {
    if (!profileId) return;
    void (supabase as any).from("confessions").select("id", { count: "exact", head: true })
      .eq("author_id", profileId).eq("is_published", true)
      .then(({ count }: any) => setPublishedConfessions(Number(count ?? 0)));
  }, [profileId]);
  const myPosts = posts.filter((p) => p.authorId === profileId || p.author === "You (anonymous)").length + publishedConfessions;

  const stats = [
    { label: "Panda Coins", value: `${coins} BC`, icon: Trophy },
    { label: "Rating", value: starRating(reputation).toFixed(1), icon: Star },
    { label: "Posts", value: myPosts, icon: MessageCircle },
    { label: "Chats", value: threads.length, icon: Users },
  ];

  const daysRemaining = vipExpiresAt
    ? Math.max(0, Math.ceil((vipExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AppShell title="Your Profile" subtitle="Anonymous to everyone else. Tracked only for you.">\n      <div className="mb-3 flex justify-end"><Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => setSettingsOpen(true)}><Settings className="size-4" /> Profile Settings</Button></div>
      <section className="panda-panel rounded-2xl p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0">
          <VipIdentity isVip={isVip} seed={profileId ?? displayName} avatar={""} />
            <p className="truncate font-display text-xl font-semibold">{displayName}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary">{pandaRank.current.name}</span> {xp.toLocaleString()} XP
            </p>
            {mySpotlight ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--coin)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--coin)]">
                <Crown className="size-3.5" /> Spotlight{" "}
                {mySpotlight.kind === "wcw" ? "Queen" : "King"}
              </p>
            ) : null}
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">🐼</span>
            <div className="min-w-0 flex-1"><h2 className="font-display text-sm font-semibold">Panda Avatar</h2><p className="text-[10px] text-muted-foreground">Your built-in Panda look</p></div>
            <div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs font-bold" onClick={() => setAvatarViewOpen(true)}>View</Button><Button type="button" size="sm" className="h-8 rounded-lg px-3 text-xs font-bold" onClick={() => setCosmeticsOpen(true)}>Edit</Button></div>
          </div>
        </section>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{`Panda Rank · ${pandaRank.current.name}`}</span>
            <span className="tabular-nums">
              {pandaRank.next ? `${(pandaRank.next.minXp - xp).toLocaleString()} XP to ${pandaRank.next.name}` : "Max rank"}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${pandaRank.progress}%` }}
            />
          </div>
        </div>
      </section>

      <ProfileProgressCard level={level} xp={xp} />

      {profileId ? <section className="panda-panel mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 shadow-[0_0_18px_rgba(245,158,11,0.08)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-black text-amber-300">View Secrets</h2>
            <p className="mt-1 text-xs font-medium text-amber-100/80">View the secrets of this Panda. Click the button below to view.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link to="/secret/$userId" params={{ userId: profileId }} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-black">
            <Eye className="size-3.5" /> View
          </Link>
          <input readOnly value={window.location.origin + "/secret/" + profileId} className="cp-input min-w-0 flex-1 text-xs" aria-label="Secret profile link" />
          <Button type="button" variant="outline" className="shrink-0 gap-1.5 border-amber-500/30" onClick={() => { const url = window.location.origin + "/secret/" + profileId; void navigator.clipboard?.writeText(url); toast.success("Secret link copied."); }}>
            <Copy className="size-3.5" /> Copy
          </Button>
        </div>
      </section> : null}

      <section className="panda-panel mt-4 rounded-2xl p-4">
        {profileSaved ? (
          <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm">✓</span>
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm font-semibold">Profile Details</h2>
                <p className="text-[10px] text-muted-foreground">Your profile is saved.</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-lg px-3 text-xs font-bold" onClick={() => setProfileDetailsOpen((v) => !v)}>
              {profileDetailsOpen ? "Hide" : "View"}
            </Button>
          </div>
          {profileDetailsOpen ? (
            <div className="mt-3 grid gap-2 border-t border-border/50 pt-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Age</p><p className="mt-1 text-sm font-semibold">{age ?? "—"}</p></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Country</p><p className="mt-1 text-sm font-semibold">{country || "—"}</p></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">State / Province</p><p className="mt-1 text-sm font-semibold">{stateProvince || "—"}</p></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">City / Location</p><p className="mt-1 text-sm font-semibold">{city || "—"}</p></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Area / Neighbourhood</p><p className="mt-1 text-sm font-semibold">{area || "—"}</p></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Street / Address</p><p className="mt-1 text-sm font-semibold">{addressLine || "—"}</p></div>
            </div>
          ) : null}
          </>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Complete your profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">Country is recommended. State, city, area, and street/address can be left optional and completed later.</p></div>
          <span className="text-xl">📍</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Date of birth *</span>
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Birth year" value={dateOfBirth ? dateOfBirth.slice(0,4) : ""} onChange={(e) => {
                const y=e.target.value, m=dateOfBirth ? dateOfBirth.slice(5,7) : "", d=dateOfBirth ? dateOfBirth.slice(8,10) : "";
                setDateOfBirth(y && m && d ? `${y}-${m}-${d}` : y ? `${y}-01-01` : "");
              }} className="cp-input">
                <option value="">Year</option>{Array.from({length:123},(_,i)=>new Date().getFullYear()-18-i).map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select aria-label="Birth month" value={dateOfBirth ? dateOfBirth.slice(5,7) : ""} onChange={(e) => {
                const y=dateOfBirth ? dateOfBirth.slice(0,4) : "", m=e.target.value, d=dateOfBirth ? dateOfBirth.slice(8,10) : "";
                setDateOfBirth(y && m && d ? `${y}-${m}-${d}` : y && m ? `${y}-${m}-01` : "");
              }} className="cp-input">
                <option value="">Month</option>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m).padStart(2,"0")}>{new Date(2000,m-1,1).toLocaleString(undefined,{month:"long"})}</option>)}
              </select>
              <select aria-label="Birth day" value={dateOfBirth ? dateOfBirth.slice(8,10) : ""} onChange={(e) => {
                const y=dateOfBirth ? dateOfBirth.slice(0,4) : "", m=dateOfBirth ? dateOfBirth.slice(5,7) : "", d=e.target.value;
                setDateOfBirth(y && m && d ? `${y}-${m}-${d}` : "");
              }} className="cp-input">
                <option value="">Day</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={String(d).padStart(2,"0")}>{d}</option>)}
              </select>
            </div>
            {age !== null ? <p className="mt-1 text-[10px] text-muted-foreground">Age: {age} · Date of birth is locked after it is saved.</p> : null}
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Country *</span>
            <select value={country} disabled={loadingLocations} onChange={(e)=>{setCountry(e.target.value); void loadStates(e.target.value);}} className="cp-input w-full">
              <option value="">Choose country</option>{locationCountries.map((c:any)=><option key={c.name} value={c.name}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">State / Province</span>
            <select value={stateProvince} disabled={!country || locationStates.length===0} onChange={(e)=>{setStateProvince(e.target.value); void loadCities(country,e.target.value);}} className="cp-input w-full">
              <option value="">Choose state / province</option>{locationStates.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">City / Location</span>
            <select value={city} disabled={!stateProvince || locationCities.length===0} onChange={(e)=>{setCity(e.target.value); void loadAreas(country,stateProvince,e.target.value);}} className="cp-input w-full">
              <option value="">Choose city / location</option>{locationCities.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Area / neighbourhood</span>
            <input list="profile-area-options" value={area} onChange={(e)=>setArea(e.target.value)} placeholder="Type or choose an area" className="cp-input w-full" />
            <datalist id="profile-area-options">{locationAreas.map(s=><option key={s} value={s} />)}</datalist>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Street / Address · optional</span>
            <input value={addressLine} onChange={(e)=>setAddressLine(e.target.value)} placeholder="Optional street, house or address" className="cp-input w-full" />
          </label>
        </div>
        <Button className="mt-3 w-full rounded-xl" disabled={savingProfile} onClick={() => void (async () => {
          setSavingProfile(true);
          const { data, error } = await (supabase as any).rpc("update_profile_completion_secure", {
            p_country: country, p_state_province: stateProvince, p_city: city, p_area: area, p_address_line: addressLine, p_date_of_birth: dateOfBirth || null,
          });
          setSavingProfile(false);
          if (error) { toast.error(error.message ?? "Profile could not be saved"); return; }
          setAge(data?.age ? Number(data.age) : age); setDateOfBirth(data?.date_of_birth ?? dateOfBirth); setCountry(data?.country ?? country); setStateProvince(data?.state_province ?? stateProvince);
          setCity(data?.city ?? city); setArea(data?.area ?? area); setAddressLine(data?.address_line ?? addressLine); setProfileSaved(Boolean((data?.date_of_birth ?? dateOfBirth) && (data?.country ?? country)));
          toast.success("Profile details saved 🐼");
        })()}>
          {savingProfile ? "Saving…" : "Save profile details"}
        </Button>
          </div>
        )}
      </section>

      <section className="panda-panel mt-4 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-display text-base font-semibold">Account gender</h2><p className="mt-1 text-xs text-muted-foreground">Used only to route your Crush submission automatically: male → MCM, female → WCW.</p></div>
          <span className="text-xl">{accountGender === "male" ? "🧑" : accountGender === "female" ? "👩" : "🐼"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["female","male"] as const).map((g) => <button key={g} type="button" disabled={Boolean(accountGender && accountGender !== g)} onClick={() => void (async () => { const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender:g }); if (error) { toast.error(error.message); return; } setAccountGender(data); toast.success("Account gender saved"); })()} className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${accountGender===g?"border-primary bg-primary/10":"border-border bg-secondary/40"}`}>{g === "female" ? "Female · WCW" : "Male · MCM"}</button>)}
        </div>
        {accountGender ? <p className="mt-2 text-[10px] text-muted-foreground">Locked after registration so MCM/WCW routing cannot change between submissions.</p> : null}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panda-panel rounded-2xl p-3.5">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 font-display text-lg font-semibold tabular-nums">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {cosmeticsOpen ? (
        <section className="panda-panel mt-4 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-display text-lg font-semibold">Panda Avatar Studio</h2><p className="text-xs text-muted-foreground">Choose your built-in Panda head, glasses and cosmetic.</p></div>
            <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs font-bold" onClick={() => setCosmeticsOpen(false)}>Done</Button>
          </div>
          <div className="mt-4 grid gap-4">
            {[
              ["Head / hat", HEADS, avatarHead, setAvatarHead],
              ["Eyeglasses", GLASSES, avatarGlasses, setAvatarGlasses],
              ["Cosmetics", COSMETICS, avatarCosmetic, setAvatarCosmetic],
            ].map(([label, values, selected, setter]: any) => (
              <div key={label as string}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label as string}</p>
                <div className="flex flex-wrap gap-2">
                  {(values as string[]).map((value) => (
                    <button key={`${label}-${value}`} type="button" onClick={() => { setter(value); const next = composeAvatar(label === "Head / hat" ? value : avatarHead, label === "Eyeglasses" ? value : avatarGlasses, label === "Cosmetics" ? value : avatarCosmetic); saveAvatar(next); }} className={`grid min-h-11 min-w-11 place-items-center rounded-xl border px-2 text-xl transition-transform hover:scale-105 ${selected===value?"border-primary bg-primary/10":"border-border bg-secondary/40"}`}>{value || "None"}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-secondary"><PandaAvatar avatar={avatar} size="lg" /></div>
            <div><p className="font-semibold">Current Panda</p><p className="text-xs text-muted-foreground">Your selected look is saved to your profile.</p></div>
          </div>
        </section>
      ) : null}
      {/* Coin Store & VIP Banner */}
      <section className="panda-panel mt-4 rounded-2xl p-4 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 border border-primary/25 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-xl shrink-0">
              🪙
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">
                  Coin Store &amp; VIP Pass
                </h2>
                {isVip ? (
                  <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                    <Crown className="size-3" /> VIP Active ({daysRemaining}d)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Starter Pack ($0.50), Panda Popular Pack ($1.00), VIP Passes &amp; scaling bonuses.
              </p>
            </div>
          </div>

          <Link
            to="/store"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <span>Open Coin Store</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      <section className="panda-panel mt-4 rounded-2xl p-4">
        <h2 className="font-display text-lg font-semibold">Panda tiers</h2>
        <div className="mt-3 space-y-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                t.name === tier.name ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <span className="shrink-0 tabular-nums">{t.min}+ rep</span>
            </div>
          ))}
        </div>
      </section>


      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/events"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <CalendarDays className="size-4 text-primary" /> Events
        </Link>
        <Link
          to="/dating"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Heart className="size-4 text-[var(--dating)]" /> Dating
        </Link>
        <Link
          to="/groups"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Users className="size-4 text-primary" /> {groups.length} groups
        </Link>
        <Link
          to="/leaders"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Trophy className="size-4 text-primary" /> Leaderboard
        </Link>
        <Link
          to="/notifications"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Bell className="size-4 text-primary" /> Notifications
        </Link>
      </div>


      <div className="mt-5"><StandardBannerAd variant="feed-card" placement="profile_inline" /></div>
      <section className="panda-panel mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-destructive/10"><LogOut className="size-5 text-destructive" /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">Log out</p><p className="text-xs text-muted-foreground">Sign out of this Panda account. You will need to log in again to enter Circle Panda.</p></div>
          <Button variant="outline" className="shrink-0 rounded-xl" onClick={() => void logout()}>Log out</Button>
        </div>
      </section>



      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="size-5" /> Profile Settings</DialogTitle><DialogDescription>Manage your plan, account information, deactivation and deletion.</DialogDescription></DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <section className="rounded-2xl border border-border bg-secondary/20 p-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10"><CreditCard className="size-5 text-primary" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">Plan</h3><p className="mt-1 text-xs text-muted-foreground">{isVip && vipExpiresAt ? "VIP active · expires " + new Date(vipExpiresAt).toLocaleDateString() : "Free Panda plan"}</p></div><Link to="/store" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">View Plan</Link></div></section>
            <section className="rounded-2xl border border-border bg-secondary/20 p-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10"><Info className="size-5 text-primary" /></span><div><h3 className="font-semibold">About</h3><p className="mt-1 text-xs text-muted-foreground">Circle Panda profile, privacy and account controls. Your account identity stays separate from your public Panda activity.</p></div></div></section>
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-500/15"><PauseCircle className="size-5 text-amber-400" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">Deactivate Account</h3><p className="mt-1 text-xs text-muted-foreground">Choose when your account should automatically resume. You can resume early at any time.</p></div></div>
              {accountStatus === "deactivated" ? <div className="mt-3 space-y-2"><p className="text-xs font-semibold text-amber-200">Scheduled to resume {deactivatedUntil ? new Date(deactivatedUntil).toLocaleString() : "automatically"}.</p><Button className="w-full gap-2 rounded-xl" disabled={settingsBusy} onClick={() => void (async () => { setSettingsBusy(true); const { data, error } = await (supabase as any).rpc("resume_my_account_secure"); setSettingsBusy(false); if (error) { toast.error(error.message); return; } setAccountStatus(data?.status ?? "active"); setDeactivatedUntil(null); toast.success("Your account is active again."); })()}><PlayCircle className="size-4" /> Resume Now</Button></div> :
              <div className="mt-3 space-y-2"><input type="datetime-local" value={resumeDate} onChange={(e) => setResumeDate(e.target.value)} min={new Date(Date.now()+60000).toISOString().slice(0,16)} className="cp-input w-full" /><Button className="w-full gap-2 rounded-xl" disabled={settingsBusy || !resumeDate} onClick={() => void (async () => { setSettingsBusy(true); const { data, error } = await (supabase as any).rpc("deactivate_my_account_secure", { p_resume_at: new Date(resumeDate).toISOString() }); setSettingsBusy(false); if (error) { toast.error(error.message); return; } setAccountStatus(data?.status ?? "deactivated"); setDeactivatedUntil(data?.deactivated_until ?? null); toast.success("Account deactivated. It will resume on your chosen date."); })()}><PauseCircle className="size-4" /> Deactivate Account</Button></div>}
            </section>
            <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-destructive/10"><Trash2 className="size-5 text-destructive" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold text-destructive">Delete Account</h3><p className="mt-1 text-xs text-muted-foreground">Deletion is scheduled 30 days from the request. You can come back during those 30 days and cancel deletion.</p></div></div>
              {accountStatus === "pending_deletion" ? <div className="mt-3 space-y-2"><p className="text-xs font-semibold text-destructive">Permanent deletion scheduled for {deletionScheduledFor ? new Date(deletionScheduledFor).toLocaleString() : "30 days after your request"}.</p><Button variant="outline" className="w-full rounded-xl" disabled={settingsBusy} onClick={() => void (async () => { setSettingsBusy(true); const { data, error } = await (supabase as any).rpc("cancel_account_deletion_secure"); setSettingsBusy(false); if (error) { toast.error(error.message); return; } setAccountStatus(data?.status ?? "active"); setDeletionScheduledFor(null); toast.success("Deletion cancelled. Your account is active."); })()}>Cancel Deletion</Button></div> :
              <Button variant="destructive" className="mt-3 w-full gap-2 rounded-xl" onClick={() => setDeletionConfirmOpen(true)}><Trash2 className="size-4" /> Schedule Account Deletion</Button>}
            </section>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deletionConfirmOpen} onOpenChange={setDeletionConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Delete your Panda account?</DialogTitle><DialogDescription>Your account remains recoverable for 30 days. After that, it is permanently deleted. You can cancel before the deadline.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setDeletionConfirmOpen(false)}>Keep Account</Button><Button variant="destructive" disabled={settingsBusy} onClick={() => void (async () => { setSettingsBusy(true); const { data, error } = await (supabase as any).rpc("request_account_deletion_secure"); setSettingsBusy(false); if (error) { toast.error(error.message); return; } setAccountStatus(data?.status ?? "pending_deletion"); setDeletionScheduledFor(data?.deletion_scheduled_for ?? null); setDeletionConfirmOpen(false); toast.success("Deletion scheduled. You have 30 days to change your mind."); })()}>Delete in 30 Days</Button></div></DialogContent>
      </Dialog>
      <Dialog open={avatarViewOpen} onOpenChange={setAvatarViewOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Your Panda Avatar</DialogTitle><DialogDescription>Your built-in Panda avatar is private to your profile. Use Edit to change the look.</DialogDescription></DialogHeader>
          <div className="grid place-items-center py-5"><div className="grid size-36 place-items-center rounded-3xl bg-secondary"><PandaAvatar avatar={avatar} size="lg" /></div></div>
          <Button onClick={() => { setAvatarViewOpen(false); setCosmeticsOpen(true); }}>Edit Avatar</Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

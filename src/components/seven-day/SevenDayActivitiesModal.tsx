import { useEffect, useState, type MouseEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, Gift, Loader2, Play, Sparkles, Target as TargetIcon, Trophy, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActiveAdCreative } from "@/components/ads/adInventoryStorage";
import { notifyAdEvent, openAdExternalUrl } from "@/components/ads/platformAdBridge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";


const GAMES = [
  { slug: "wheel_spin", title: "Wheel Spin", icon: "🎡", description: "Tap to spin and let Circle Panda's reward engine choose the result.", free: 3 },
  { slug: "mystery_box", title: "Mystery Box", icon: "🎁", description: "Open your box, watch the reveal, then see what the reward engine selected.", free: 1 },
  { slug: "target", title: "Target", icon: "🎯", description: "Take your skill shot and let the server verify the outcome.", free: 3 },
  { slug: "guess_sponsor", title: "Guess the Sponsor", icon: "🃏", description: "Make your guess, reveal the sponsor, then continue through the sponsored reveal.", free: 1 },
  { slug: "puzzle", title: "Puzzle", icon: "🧩", description: "Solve the quick puzzle. A rewarded ad can unlock Try Again.", free: 1 },
  { slug: "coin_drop", title: "Coin Drop", icon: "🪙", description: "60 seconds. Coins fall from the sponsored card; stones cost 3 BC.", free: 3 },
  { slug: "slots", title: "Slots", icon: "🎰", description: "Play for 60 seconds, watch the calculating animation, then the sponsored result reveal.", free: 3 },
  { slug: "pick_prize", title: "Pick the Prize", icon: "🏆", description: "Pick a prize, reveal the result, then use the sponsored Try Again when available.", free: 1 },
  { slug: "playable_ad", title: "Just Playbo Ads", icon: "▶️", description: "Interactive sponsored experience only. No Panda Coin reward.", free: 1 },
  { slug: "secret_reveal", title: "Secret Reveal", icon: "🕵️", description: "Piece together a real Secret Confession and choose whether to reveal it.", free: 1 },
  { slug: "cup_shuffle", title: "Panda Cup Shuffle", icon: "🥤", description: "Track the hidden prize as Panda shuffles three cups.", free: 1 },
] as const;

type Game = (typeof GAMES)[number];
type Result = { result?: string; reward_bc?: number; reward_label?: string; attempts_left?: number; extra_attempt?: boolean; ad_required?: boolean; sponsor?: string; score?: number; detail?: string } | null;

function Banner({ className = "" }: { placement: "seven_day_banner"; className?: string }) {
  const ad = useActiveAdCreative("seven_day_banner");
  useEffect(() => { if (ad) void notifyAdEvent("impression", { adId: ad.id, format: ad.videoUrl ? "video" : "banner" }); }, [ad]);
  if (!ad) return null;
  return <button type="button" onClick={() => { void notifyAdEvent("click", { adId: ad.id, format: ad.videoUrl ? "video" : "banner" }); openAdExternalUrl(ad.destinationUrl, ad.sponsor); }} className={`w-full rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm ${className}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"><span className="rounded bg-muted px-1.5 py-0.5 text-foreground">Sponsored</span><span className="truncate">{ad.sponsor}</span></div><p className="mt-1 truncate text-xs font-semibold">{ad.headline}</p></div><span className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary">{ad.callToAction || "Explore"}</span></div></button>;
}

function PlayableGate({ surface, onComplete, onClose, required = true }: { surface: string; onComplete: (sessionId?: string) => void; onClose: () => void; required?: boolean }) {
  const ad = useActiveAdCreative("seven_day_playable");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!started || !ad?.durationSeconds) return;
    const id = window.setInterval(() => setSeconds((v) => Math.min(v + 1, ad.durationSeconds ?? 8)), 1000);
    return () => window.clearInterval(id);
  }, [started, ad?.durationSeconds]);

  const start = async () => {
    if (!ad?.id) return toast.info("No sponsored playable is active right now.");
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("start_rewarded_ad_session", { p_ad_id: ad.id, p_surface: surface });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Sponsored playable could not start");
    setSessionId(data?.session_id ?? null);
    setStarted(true);
    setSeconds(0);
    void notifyAdEvent("impression", { adId: ad.id, format: "rewarded" });
  };

  const complete = async () => {
    if (!sessionId) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("complete_rewarded_ad_session", { p_session_id: sessionId });
    if (error) { setBusy(false); return toast.error(error.message ?? "Finish the sponsored playable first"); }
    if (surface.startsWith("seven_day_") && surface.endsWith("_extra")) {
      const slug = surface.slice("seven_day_".length, -"_extra".length);
      const { data: grant, error: grantError } = await (supabase as any).rpc("grant_seven_day_extra_attempt", { p_slug: slug, p_session_id: sessionId });
      if (grantError) { setBusy(false); return toast.error(grantError.message ?? "Extra attempt could not be unlocked"); }
      onComplete(sessionId);
      if (grant?.attempts_left !== undefined) toast.success("Extra attempt unlocked");
    } else if (surface === "seven_day_playable_only") {
      const { error: activityError } = await (supabase as any).rpc("play_seven_day_activity", {
        p_slug: "playable_ad",
        p_action: "playable_complete",
        p_payload: { session_id: sessionId },
      });
      if (activityError) { setBusy(false); return toast.error(activityError.message ?? "Playable activity could not be completed"); }
      onComplete(sessionId);
    } else {
      onComplete(sessionId);
    }
    setBusy(false);
    setDone(true);
    if (Number(data?.reward_bc ?? 0) > 0) toast.success(`Sponsored ad reward +${data.reward_bc} BC`);
  };

  if (!ad) return null;
  return <div className="cp-playable-gate">
    <div className="cp-playable-head"><span>Sponsored Playable</span><button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-full bg-background/70"><X className="size-3.5" /></button></div>
    {ad.videoUrl && <video src={ad.videoUrl} poster={ad.posterUrl || ad.imageUrl} controls playsInline muted className="cp-playable-video" onPlay={() => setStarted(true)} onEnded={() => { setSeconds(ad.durationSeconds ?? 8); }} />}
    <div className="cp-playable-copy"><p>{ad.headline}</p><span>{ad.description || ad.tagline}</span></div>
    {!started ? <Button className="w-full" onClick={() => void start()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start sponsored playable</Button> : <Button className="w-full" onClick={() => void complete()} disabled={busy || done || seconds < Math.max(1, (ad.durationSeconds ?? 8) - 1)}>{busy ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : <Gift className="size-4" />} {done ? "Completed" : `Complete playable (${Math.max(0, (ad.durationSeconds ?? 8) - seconds)}s)`}</Button>}
    {!required && <Button variant="ghost" className="w-full" onClick={onClose}>Skip</Button>}
  </div>;
}

export function SevenDayActivitiesModal({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const { syncCoins } = useStore();
  const [activity, setActivity] = useState<any>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [adFor, setAdFor] = useState<{ slug: string; mode: "extra" | "required" } | null>(null);
  const [timer, setTimer] = useState(0);
  const [coinScore, setCoinScore] = useState(0);
  const [coinStones, setCoinStones] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [target, setTarget] = useState(50);
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const [puzzleQuestion, setPuzzleQuestion] = useState("Solve today’s puzzle.");
  const [targetPoint, setTargetPoint] = useState<{ x: number; y: number } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [sponsorChoices, setSponsorChoices] = useState<{ key: number; sponsor: string }[]>([]);
  const [cupChoices, setCupChoices] = useState<number[]>([0, 1, 2]);
  const [cupMessage, setCupMessage] = useState("Watch Panda shuffle the prize.");
  const [secretPieces, setSecretPieces] = useState<string[]>([]);
  const [secretAnswer, setSecretAnswer] = useState<string[]>([]);
  const [secretChoice, setSecretChoice] = useState<"yes" | "no" | null>(null);
  const [secretId, setSecretId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_today_seven_day_activity");
    setLoading(false);
    if (error) return toast.error(error.message ?? "Today's activity could not load");
    setDayNumber(Number(data?.day_number ?? 0));
    setActivity(data?.available ? data.activity : null);
    const loadedActivity = data?.available ? data.activity : null;
    setCompleted(Boolean(loadedActivity?.completed) && Number(loadedActivity?.attempts_left ?? 0) <= 0);
    setPuzzleQuestion(String(data?.activity?.puzzle_question || "Solve today’s puzzle."));
  };

  useEffect(() => { if (open) { setResult(null); setAdFor(null); setTimer(0); setRevealing(false); setPuzzleAnswer(""); setSponsorChoices([]); setTargetPoint(null); setPuzzleQuestion("Solve today’s puzzle."); setCupChoices([0,1,2]); setCupMessage("Watch Panda shuffle the prize."); setSecretPieces([]); setSecretAnswer([]); setSecretChoice(null); setSecretId(null); void load(); } }, [open]);

  useEffect(() => {
    if (!open || activity?.slug !== "guess_sponsor") return;
    void loadSponsorChoices();
  }, [open, activity?.slug]);

  const finishActivity = () => { setCompleted(true); toast.success("Today's activity is complete. Welcome to Psycho Panda."); onComplete?.(); };

  const play = async (action = "play", payload: Record<string, unknown> = {}) => {
    if (!activity) return;
    setBusy(true); setResult(null);
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: activity.slug, p_action: action, p_payload: payload });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Activity could not be completed");
    setResult(data as Result);
    setActivity((a: any) => a ? ({ ...a, attempts_left: Number(data?.attempts_left ?? a.attempts_left) }) : a);
    if (Number(data?.reward_bc ?? 0) !== 0) { await syncCoins(); toast.success(`${data.reward_label || "Reward"} · ${data.reward_bc > 0 ? "+" : ""}${data.reward_bc} BC`); }
    if (data?.ad_required) {
      const isPuzzleRetry = activity.slug === "puzzle" && String(data?.result) === "failed";
      setAdFor({ slug: activity.slug, mode: isPuzzleRetry ? "extra" : "required" });
    }
    if (["revealed", "solved", "completed", "won"].includes(String(data?.result)) && !data?.ad_required && activity.slug !== "secret_reveal" && activity.slug !== "cup_shuffle" && activity.slug !== "pick_prize") finishActivity();
  };

  const startTimed = async () => {
    const seconds = activity?.slug === "coin_drop" || activity?.slug === "slots" ? Math.max(1, Number(activity?.timer_seconds ?? 60)) : 0;
    if (!seconds) return void play();
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: activity.slug, p_action: "start", p_payload: {} });
    if (error) return toast.error(error.message ?? "Activity could not start");
    setResult(data as Result); setActivity((a: any) => a ? ({ ...a, attempts_left: Number(data?.attempts_left ?? a.attempts_left), timer_seconds: seconds }) : a); setTimer(seconds); setRevealing(false); setCoinScore(0); setCoinStones(0);
  };

  useEffect(() => { if (timer <= 0) return; const id=window.setInterval(()=>setTimer(v=>v-1),1000); return ()=>window.clearInterval(id); }, [timer]);
  useEffect(() => {
    if (timer === 0 && (activity?.slug === "coin_drop" || activity?.slug === "slots") && result?.result === "running") {
      setRevealing(true);
      const id=window.setTimeout(()=>{ void play("finish"); }, activity.slug === "coin_drop" ? 4000 : 1600);
      return ()=>window.clearTimeout(id);
    }
  }, [timer, activity?.slug, result?.result]);

  const attemptLeft = Number(activity?.attempts_left ?? 0);
  const hasResult = Boolean(result && result.result !== "running");
  const targetFire = () => void play("target", { accuracy: target });
  const puzzleSubmit = () => void play("solve", { answer: puzzleAnswer.trim().toLowerCase() });
  const choose = (index:number) => void play("pick", { choice:index });
  const loadSponsorChoices = async () => {
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: "guess_sponsor", p_action: "options", p_payload: {} });
    if (error) return toast.error(error.message ?? "Sponsor choices could not load");
    setSponsorChoices((data?.choices ?? []) as { key:number; sponsor:string }[]);
  };
  const startTarget = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: "target", p_action: "start", p_payload: {} });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Target could not start");
    setTargetPoint({ x: Number(data?.target_x ?? 50), y: Number(data?.target_y ?? 50) });
    setActivity((a:any) => a ? ({ ...a, attempts_left: Number(data?.attempts_left ?? a.attempts_left) }) : a);
  };
  const startSecretReveal = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: "secret_reveal", p_action: "start", p_payload: {} });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Secret puzzle could not start");
    setSecretPieces((data?.pieces ?? []) as string[]);
    setSecretAnswer([]);
    setSecretId(data?.secret_id ?? null);
    setResult(data as Result);
    setActivity((a:any) => a ? ({ ...a, attempts_left: Number(data?.attempts_left ?? a.attempts_left) }) : a);
  };

  const submitSecret = async () => {
    if (!secretAnswer.length) return toast.error("Put the secret together first.");
    await play("solve_secret", { words: secretAnswer });
  };

  const chooseSecretDestination = (choice: "yes" | "no") => {
    setSecretChoice(choice);
    setAdFor({ slug: "secret_reveal", mode: "required" });
  };

  const startCupShuffle = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_seven_day_activity", { p_slug: "cup_shuffle", p_action: "start", p_payload: {} });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Cup shuffle could not start");
    setCupChoices([0,1,2].sort(() => Math.random() - 0.5));
    setCupMessage("Panda is shuffling the cups…");
    setResult(data as Result);
    setActivity((a:any) => a ? ({ ...a, attempts_left: Number(data?.attempts_left ?? a.attempts_left) }) : a);
    window.setTimeout(() => setCupMessage("Pick the cup hiding your prize."), 900);
  };

  const pickCup = async (index: number) => {
    await play("cup_pick", { cup: index });
  };

  const fireTarget = async (e: MouseEvent<HTMLDivElement>) => {
    if (!targetPoint || busy) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX-r.left)/r.width)*100; const y=((e.clientY-r.top)/r.height)*100;
    await play("target", { x, y }); setTargetPoint(null);
  };

  const gameMeta = GAMES.find((g) => g.slug === activity?.slug);
  const revealBlocked = Boolean(adFor?.mode === "required");
  const prizeIcons = ["🎁", "💎", "🎮", "🏆"];

  return <Dialog open={open} onOpenChange={(v)=>{ if (!v) onClose(); }}>
    <DialogContent className="cp-game-dialog max-h-[96vh] w-[94vw] max-w-md overflow-y-auto rounded-[28px] border-0 p-0">
      <div className="cp-game-shell">
        <div className="cp-game-topbar">
          <button type="button" onClick={onClose} className="cp-icon-button" aria-label="Back"><ChevronLeft className="size-5" /></button>
          <div className="min-w-0 text-center">
            <DialogTitle className="cp-game-title">{gameMeta?.title || activity?.title || "Today’s Activity"}</DialogTitle>
            <DialogDescription className="cp-game-subtitle">Day {dayNumber ?? "—"} · {attemptLeft} attempt{attemptLeft === 1 ? "" : "s"} left</DialogDescription>
          </div>
          <div className="cp-panda-orb" aria-hidden>🐼</div>
        </div>

        {loading ? <div className="cp-game-loading"><Loader2 className="size-9 animate-spin" /><span>Loading today’s activity…</span></div> : !activity ? <div className="cp-empty-state"><Gift className="mx-auto size-10" /><h2>No activity today</h2><p>Circle Panda Admin has not scheduled an activity for today.</p><Button className="cp-neon-button mt-5" onClick={onClose}>Continue exploring</Button></div> : <>
          <div className="cp-game-hero">
            <div className="cp-game-badge">{gameMeta?.icon ?? "🎮"}</div>
            <div className="min-w-0 flex-1">
              <p className="cp-eyebrow">TODAY’S ACTIVITY</p>
              <h2>{activity.title}</h2>
              <p>{activity.description}</p>
            </div>
          </div>

          {activity.slug === "coin_drop" && <Banner placement="seven_day_banner" className="cp-ad-banner cp-ad-top" />}
          {activity.slug === "pick_prize" && !hasResult && <Banner placement="seven_day_banner" className="cp-ad-banner" />}

          {activity.slug === "wheel_spin" && <div className="cp-game-card cp-wheel-game">
            <div className="cp-status-pill"><Sparkles className="size-3" /> {attemptLeft > 0 ? `${attemptLeft} Free Spin${attemptLeft === 1 ? "" : "s"}` : "No spins left"}</div>
            <div className="cp-wheel-wrap">
              <div className="cp-wheel-pointer" />
              <div className={`cp-neon-wheel ${busy ? "is-spinning" : ""}`}>
                <div className="cp-wheel-center">SPIN</div>
                <span>🪙</span><span>🎁</span><span>💎</span><span>⭐</span><span>🪙</span><span>🎟️</span><span>🏆</span><span>🎁</span>
              </div>
            </div>
            <Button className="cp-neon-button cp-big-button" disabled={busy || attemptLeft<=0 || completed} onClick={()=>void play()}>SPIN NOW</Button>
            <p className="cp-helper">Reveal animation → sponsored playable → reward reveal.</p>
          </div>}
          {activity.slug === "wheel_spin" && <Banner placement="seven_day_banner" className="cp-ad-banner" />}
          {activity.slug === "wheel_spin" && hasResult && !revealBlocked && <Button variant="outline" className="cp-secondary-button w-full" onClick={()=>setAdFor({ slug: "wheel_spin", mode: "extra" })}>Watch Ad for +3 Spins</Button>}

          {activity.slug === "mystery_box" && <div className="cp-game-card">
            <div className="cp-section-label">CHOOSE ONE BOX</div>
            <div className="cp-box-grid">
              {[0,1,2].map((box) => <button key={box} type="button" disabled={busy || attemptLeft<=0 || completed || hasResult} onClick={()=>void play("play", { box })} className="cp-mystery-box">
                <span className="cp-box-lid" /><span className="cp-box-bow">✦</span><span className="cp-box-question">?</span><small>BOX {box+1}</small>
              </button>)}
            </div>
            <p className="cp-helper">Pick one box. The box opens, then the sponsored reveal runs before your prize is shown.</p>
          </div>}
          {activity.slug === "mystery_box" && hasResult && !revealBlocked && <><Banner placement="seven_day_banner" className="cp-ad-banner" /><Button variant="outline" className="cp-secondary-button w-full" onClick={()=>setAdFor({ slug: "mystery_box", mode: "extra" })}>Watch Ad for More Boxes</Button></>}

          {activity.slug === "target" && <div className="cp-game-card">
            <div className="cp-section-label">PANdA TARGET</div>
            <div onClick={fireTarget} className="cp-target-stage">
              <div className="cp-target-ring ring-one" /><div className="cp-target-ring ring-two" /><div className="cp-target-ring ring-three" /><div className="cp-target-bullseye" />
              {targetPoint ? <button type="button" aria-label="Target" style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y}%` }} className="cp-target-pin"><TargetIcon className="size-5" /></button> : <TargetIcon className="cp-target-icon" />}
            </div>
            <p className="cp-game-instruction">{targetPoint ? "Tap the target to fire" : "Start the challenge to reveal Panda’s target."}</p>
            <Button className="cp-neon-button cp-big-button" disabled={busy || attemptLeft<=0 || completed || Boolean(targetPoint)} onClick={startTarget}>{targetPoint ? "FIRE" : "START TARGET"}</Button>
          </div>}

          {activity.slug === "guess_sponsor" && <div className="cp-game-card">
            <div className="cp-sponsored-card">
              <span>SPONSORED</span><div className="cp-sponsor-mark">AD</div><p>Can you guess the sponsor?</p>
            </div>
            <div className="cp-section-label">MAKE YOUR GUESS</div>
            <div className="grid grid-cols-2 gap-3">{sponsorChoices.map((option, index)=><Button key={`${option.key}-${option.sponsor}`} variant="outline" className="cp-choice-button" disabled={busy || attemptLeft<=0 || completed} onClick={()=>void play("guess",{sponsor:option.sponsor})}><span>{String.fromCharCode(65 + index)}</span><span className="truncate">{option.sponsor}</span></Button>)}</div>
            {sponsorChoices.length<2 && <Button className="cp-secondary-button mt-3 w-full" variant="outline" onClick={()=>void loadSponsorChoices()}>Load sponsor choices</Button>}
          </div>}

          {activity.slug === "puzzle" && <div className="cp-game-card">
            <div className="cp-puzzle-art"><div className="cp-puzzle-piece">✦</div><div className="cp-puzzle-piece">?</div><div className="cp-puzzle-piece">★</div><div className="cp-puzzle-piece">✦</div></div>
            <div className="cp-section-label">PANdA PUZZLE</div><p className="cp-question">{puzzleQuestion}</p>
            <input value={puzzleAnswer} onChange={e=>setPuzzleAnswer(e.target.value)} placeholder="Type your answer" className="cp-game-input" />
            <Button className="cp-neon-button cp-big-button" disabled={busy || attemptLeft<=0 || !puzzleAnswer.trim() || completed} onClick={puzzleSubmit}>SUBMIT PUZZLE</Button>
          </div>}
          {activity.slug === "puzzle" && <Banner placement="seven_day_banner" className="cp-ad-banner" />}
          {activity.slug === "puzzle" && hasResult && result?.result === "failed" && <Button variant="outline" className="cp-secondary-button w-full" onClick={()=>setAdFor({ slug: "puzzle", mode: "extra" })}>Watch Ad to Try Again</Button>}

          {activity.slug === "coin_drop" && <div className="cp-game-card cp-coin-game">
            <div className="cp-sponsored-strip"><span>Sponsored Banner</span><b>YOUR AD HERE</b></div>
            <div className="cp-coin-timer">00:{String(timer).padStart(2,"0")}</div>
            <div className="cp-coin-rain" aria-hidden>{Array.from({length:12},(_,i)=><span key={i} style={{left:`${8+(i*31)%86}%`,animationDelay:`${(i%6)*.18}s`}}>🪙</span>)}</div>
            <div className="cp-coin-panda">🐼</div>
            <p className="cp-game-instruction">{timer>0 ? "Tap the falling coins!" : revealing ? "Revealing your result…" : "60 seconds of Coin Drop"}</p>
            {timer>0 && <button type="button" className="cp-coin-tap" onClick={async()=>{const {data,error}=await (supabase as any).rpc("play_seven_day_activity",{p_slug:"coin_drop",p_action:"drop",p_payload:{}});if(error)toast.error(error.message??"Drop failed");else{setCoinScore(Number(data?.score??0));setCoinStones(Number(data?.stones??0));}}}>🪙</button>}
            <div className="cp-stat-row"><span>TIME <b>{timer}s</b></span><span>COINS <b>{coinScore}</b></span><span>STONES <b>{coinStones}</b></span></div>
            <Button className="cp-neon-button cp-big-button" disabled={busy || attemptLeft<=0 || timer>0 || completed} onClick={()=>void startTimed()}>START DROP</Button>
          </div>}

          {activity.slug === "slots" && <div className="cp-game-card cp-slots-game">
            <div className="cp-slots-lights" aria-hidden>✦ ✦ ✦ ✦ ✦</div>
            <Banner placement="seven_day_banner" className="cp-ad-banner cp-ad-top" />
            <div className="cp-slots-timer">00:{String(timer).padStart(2,"0")}</div>
            <div className="cp-reels"><div>🍒</div><div>🪙</div><div>🎁</div></div>
            {timer>0 ? <p className="cp-game-instruction">SPINNING…</p> : revealing ? <p className="cp-game-instruction">CALCULATING…</p> : <p className="cp-game-instruction">Ready for your spin?</p>}
            <Button className="cp-neon-button cp-big-button" disabled={busy || attemptLeft<=0 || timer>0 || completed} onClick={()=>void startTimed()}>SPINNING</Button>
          </div>}

          {activity.slug === "pick_prize" && <div className="cp-game-card">
            {!hasResult || result?.result === "prize_selected" ? <>
              <div className="cp-section-label">CHOOSE YOUR PRIZE</div>
              <div className="cp-prize-grid">{prizeIcons.map((icon,i)=><button key={i} type="button" disabled={busy || attemptLeft<=0 || completed || result?.result === "prize_selected"} onClick={()=>void play("choose_prize",{prize_index:i})} className="cp-prize-card"><span>{icon}</span><small>PRIZE {i+1}</small></button>)}</div>
              {result?.result === "prize_selected" && <div className="cp-find-card"><p>Your prize is behind one card.</p><div className="grid grid-cols-3 gap-3">{[0,1,2].map(i=><button key={i} type="button" onClick={()=>void play("prize_pick_card",{card:i})} disabled={busy} className="cp-shuffle-card"><span>?</span><small>CARD {i+1}</small></button>)}</div><p className="cp-helper">Panda shuffled the cards. Track your prize.</p></div>}
            </> : null}
            <Banner placement="seven_day_banner" className="cp-ad-banner" />
          </div>}
          {activity.slug === "pick_prize" && hasResult && result?.result === "failed" && !revealBlocked && <Button variant="outline" className="cp-secondary-button w-full" onClick={()=>setAdFor({ slug:"pick_prize", mode:"extra" })}>Watch Ad to Try Again</Button>}

          {activity.slug === "cup_shuffle" && <div className="cp-game-card cp-cup-game">
            <div className="cp-cup-panda">🐼</div><p className="cp-game-instruction">{cupMessage}</p>
            <div className="cp-cups">{cupChoices.map(c=><button key={c} type="button" disabled={busy || completed || result?.result === "won"} onClick={()=>void pickCup(c)} className="cp-cup"><span>🥤</span><small>CUP {c+1}</small></button>)}</div>
            {!result && <Button className="cp-neon-button cp-big-button" onClick={()=>void startCupShuffle()} disabled={busy || completed || attemptLeft<=0}>START SHUFFLE</Button>}
            <Banner placement="seven_day_banner" className="cp-ad-banner" />
            {result?.result === "failed" && !revealBlocked && <Button variant="outline" className="cp-secondary-button w-full" onClick={()=>setAdFor({slug:"cup_shuffle",mode:"extra"})}>Watch Ad to Shuffle Again</Button>}
          </div>}

          {activity.slug === "secret_reveal" && <div className="cp-game-card cp-secret-game">
            <div className="cp-secret-art"><div>🐼</div><span>?</span><span>?</span><span>?</span></div>
            {!secretPieces.length ? <><p className="cp-question">Reconstruct today’s real Secret Confession.</p><Button className="cp-neon-button cp-big-button" onClick={()=>void startSecretReveal()} disabled={busy || completed || attemptLeft<=0}>START SECRET PUZZLE</Button></> : <>
              <div className="cp-secret-timer">45s</div><p className="cp-section-label">PUT THE SECRET TOGETHER</p>
              <div className="cp-secret-answer">{secretAnswer.length ? secretAnswer.map((w,i)=><button key={`${w}-${i}`} type="button" onClick={()=>setSecretAnswer(a=>a.filter((_,j)=>j!==i))}>{w}</button>) : <span>Tap pieces below</span>}</div>
              <div className="cp-secret-pieces">{secretPieces.map((w,i)=>{const used=secretAnswer.filter(x=>x===w).length;const available=secretPieces.slice(0,i+1).filter(x=>x===w).length;return used<available?<button key={`${w}-${i}`} type="button" onClick={()=>setSecretAnswer(a=>[...a,w])}>{w}</button>:null})}</div>
              <Button className="cp-neon-button cp-big-button" onClick={()=>void submitSecret()} disabled={busy || !secretAnswer.length}>SUBMIT SECRET</Button>
            </>}
            {result?.result === "solved" && !revealBlocked && <div className="cp-secret-win"><p>YOU WON!</p><span>Would you like to see today’s secret?</span><div className="grid grid-cols-2 gap-3"><Button className="cp-neon-button" onClick={()=>chooseSecretDestination("yes")}>YES</Button><Button variant="outline" className="cp-secondary-button" onClick={()=>chooseSecretDestination("no")}>NO</Button></div></div>}
            <Banner placement="seven_day_banner" className="cp-ad-banner" />
          </div>}

          {activity.slug === "playable_ad" && <PlayableGate surface="seven_day_playable_only" onComplete={finishActivity} onClose={onClose} required />}

          {hasResult && activity.slug !== "playable_ad" && !revealBlocked && activity.slug !== "secret_reveal" && activity.slug !== "cup_shuffle" && activity.slug !== "pick_prize" && <div className="cp-result-card"><div className="cp-result-icon"><Trophy className="size-7" /></div><p className="cp-result-kicker">RESULT REVEALED</p><p className="cp-result-title">{result?.reward_label || "Result revealed"}</p>{result?.reward_bc !== undefined ? <p className="cp-result-bc">{result.reward_bc>0?"+":""}{result.reward_bc} BC</p>:null}<p className="cp-result-detail">{result?.detail || result?.result}</p></div>}

          {adFor && <div className="cp-ad-stage"><PlayableGate surface={adFor.mode === "extra" ? `seven_day_${adFor.slug}_extra` : `seven_day_${adFor.slug}_reveal`} onComplete={(sessionId)=>{ const current=adFor; setAdFor(null); if (current.slug === "secret_reveal" && current.mode === "required") { void play("secret_choice", { choice: secretChoice, session_id: sessionId }); } else if (current.slug === "cup_shuffle" && current.mode === "extra") { void play("cup_retry", { session_id: sessionId }); setCupMessage("Panda is shuffling the cups again…"); } else if (current.slug === "pick_prize" && current.mode === "extra") { void play("prize_retry", { session_id: sessionId }); } else if (current.mode === "required") { finishActivity(); } else { setResult(null); void load(); } }} onClose={()=>setAdFor(null)} required={adFor.mode === "required"} /></div>}
          {completed && <div className="cp-complete-card"><p>Today’s activity is complete.</p><span>Continue into Psycho Panda and explore Circle Panda.</span><Button className="cp-neon-button mt-3" onClick={onClose}>CONTINUE</Button></div>}
        </>}
      </div>
    </DialogContent>
  </Dialog>;


}

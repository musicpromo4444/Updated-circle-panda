import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, Heart, MapPin, MessageCircle, Rocket, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { useStore, type PandaEvent } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { sendMessageRequest, isSelfMessageError } from "@/lib/messageRequests";
import { requireCompleteProfile } from "@/lib/profileGate";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Community Events — Circle Panda" },
      { name: "description", content: "Discover and create anonymous-friendly Circle Panda events." },
    ],
  }),
  component: EventsPage,
});

type BlastPlan = {
  id: string;
  name: string;
  unique_reach: number;
  duration_minutes: number;
  price_usd: number;
  bc_price: number | null;
};

function EventsPage() {
  const { events, startEventBlast, toggleRsvp, toggleEventInterest } = useStore();
  const navigate = useNavigate();
  const [openEvent, setOpenEvent] = useState<PandaEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);
  const [plans, setPlans] = useState<BlastPlan[]>([]);
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [boostPromptOpen, setBoostPromptOpen] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<PandaEvent | null>(null);
  const [bcProcessing, setBcProcessing] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<"worldwide"|"country"|"state"|"city"|"area">("worldwide");
  const [targetCountry, setTargetCountry] = useState(""); const [targetState, setTargetState] = useState(""); const [targetCity, setTargetCity] = useState(""); const [targetArea, setTargetArea] = useState("");
  const [targetCountries, setTargetCountries] = useState<Array<{name:string;iso2:string}>>([]);
  const [targetStates, setTargetStates] = useState<string[]>([]); const [targetCities, setTargetCities] = useState<string[]>([]);
  const current = openEvent ? (events.find((e) => e.id === openEvent.id) ?? null) : null;

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { setCurrentUserId(data.user?.id ?? null); if (data.user && !data.user.is_anonymous) void requireCompleteProfile("use Events"); }); }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).rpc("get_event_blast_plans");
      setPlans((data ?? []) as BlastPlan[]);
    })();
  }, []);

  const messageEventCreator = async () => {
    if (!current?.ownerId || current.ownerId === currentUserId) return;
    try {
      const result = await sendMessageRequest(
        current.ownerId,
        'I\'d like to know more about your event, "' + current.title + '".',
        "event",
        current.id,
      );
      toast.success("Message request sent 💌", { description: "The event creator can accept it from Messages." });
      void navigate({ to: "/messages", search: { request: result.id } });
    } catch (e: any) {
      if (isSelfMessageError(e)) return;
      toast.error(e?.message ?? "Could not message the event creator");
    }
  };

  const openBlast = () => {
    if (!current) return;
    setTargetScope("worldwide"); setTargetCountry(""); setTargetState(""); setTargetCity(""); setTargetArea(""); setBlastOpen(true);
    void (async () => {
      const { data, error } = await (supabase as any).rpc("get_event_promotion_status_secure");
      if (!error) setFreePromotionEligible(Boolean(data?.eligible));
    })();
  };
  const claimFreePromotion = async () => {
    if (!current) return;
    setFreePromotionProcessing(true);
    try {
      const { data, error } = await (supabase as any).rpc("claim_free_event_promotion_secure", {
        p_event_id: current.id, p_target_scope: targetScope, p_target_country: targetCountry || null,
        p_target_state: targetState || null, p_target_city: targetCity || null, p_target_area: targetArea || null,
      });
      if (error) throw new Error(error.message);
      toast.success("Free Event Blast is live 🎁", { description: `${Number(data?.unique_reach ?? 500).toLocaleString()} target users · up to 1,000 notifications.` });
      setFreePromotionEligible(false); setBlastOpen(false);
    } catch (e:any) { toast.error(e?.message ?? "Free promotion could not be started."); }
    finally { setFreePromotionProcessing(false); }
  };
  useEffect(() => { void fetch("https://countriesnow.space/api/v0.1/countries/positions").then(r=>r.json()).then(j=>setTargetCountries((j.data ?? []).map((x:any)=>({name:x.name,iso2:x.iso2})).sort((a:any,b:any)=>a.name.localeCompare(b.name)))).catch(()=>setTargetCountries([])); }, []);
  useEffect(() => { setTargetStates([]); setTargetCities([]); if(!targetCountry) return; void fetch("https://countriesnow.space/api/v0.1/countries/states",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country:targetCountry})}).then(r=>r.json()).then(j=>setTargetStates((j.data?.states ?? []).map((x:any)=>x.name).filter(Boolean).sort())).catch(()=>setTargetStates([])); }, [targetCountry]);
  useEffect(() => { setTargetCities([]); if(!targetCountry || !targetState) return; void fetch("https://countriesnow.space/api/v0.1/countries/state/cities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country:targetCountry,state:targetState})}).then(r=>r.json()).then(j=>setTargetCities((j.data ?? []).filter(Boolean).sort())).catch(()=>setTargetCities([])); }, [targetCountry,targetState]);
  const countryFlag = (iso2:string) => iso2.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));

  const payCashBlast = async (plan: BlastPlan) => {
    if (!current || !email.trim()) { toast.error("Enter an email for checkout."); return; }
    setProcessing(true);
    try {
      const { data: paystackConfig, error: configError } = await (supabase as any).rpc("get_paystack_public_config");
      if (configError) throw new Error(configError.message || "Payment configuration could not be loaded.");
      const key = String(paystackConfig?.public_key || "").trim();
      if (!key || !window.PaystackPop?.setup) throw new Error("Cash checkout is not configured yet.");
      const reference = `CP_BLAST_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      await new Promise<void>((resolve, reject) => {
        const popup = window.PaystackPop!.setup({
          key, email:email.trim(), amount:Math.round(Number(plan.price_usd)*100), currency:"USD", ref:reference,
          metadata:{eventId:current.id,planId:plan.id,purpose:"event_blast",targetScope,targetCountry,targetState,targetCity,targetArea},
          callback: async (response) => {
            if (response.status !== "success") { reject(new Error("Payment was not confirmed.")); return; }
            const { data, error } = await supabase.functions.invoke("verify-event-blast-payment", { body:{reference:response.reference,eventId:current.id,planId:plan.id,targetScope,targetCountry,targetState,targetCity,targetArea} });
            if (error) { reject(new Error(error.message || "Payment verification failed.")); return; }
            toast.success("Event Blast is live 🚀", { description: `${Number(data?.unique_reach ?? plan.unique_reach).toLocaleString()} target users · up to ${Number(data?.notification_cap ?? plan.unique_reach*2).toLocaleString()} notifications.` });
            setBlastOpen(false); resolve();
          },
          onClose:()=>reject(new Error("Checkout closed before confirmation.")),
        });
        popup.openIframe();
      });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Event Blast payment failed."); }
    finally { setProcessing(false); }
  };

  return (
    <AppShell title="Events" subtitle="Masks encouraged. Names optional.">
      <div className="cp-events-page min-w-0 w-full overflow-x-hidden">
      <div className="mb-5">
        <Button size="lg" onClick={() => setCreateOpen(true)} className="w-full gap-2.5 rounded-2xl py-6 font-bold shadow-lg shadow-primary/20">
          <CalendarPlus className="size-5" /> Create an Event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="panda-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">No published events yet. Be the first Panda to create one.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((e, idx) => (
            <>
            <div key={e.id} role="button" tabIndex={0} onClick={() => setOpenEvent(e)} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") setOpenEvent(e); }} className="panda-panel rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">{e.tag}</span>
                <span className="coin-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">{e.cost === 0 ? "Gate fee: Free" : `Gate fee: ${e.currency === "NGN" ? "₦" : e.currency + " "}${e.cost.toLocaleString()}`}</span>
              </div>
              {e.coverUrl ? <img src={e.coverUrl} alt="" className="mt-3 h-36 w-full rounded-xl object-cover" /> : null}<h2 className="mt-3 font-display text-lg font-semibold">{e.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.blurb}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {e.date} · {e.time}</p>
                <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {e.place}</p>
                <p className="flex items-center gap-1.5"><Users className="size-3.5" /> {e.attendeeCount ?? 0} attending · {e.reachScope === "worldwide" ? "Worldwide" : `${e.reachScope}: ${e.reachCity || e.reachCountry || e.reachArea || ""}`}</p>
              </div>
              {e.rsvp ? <p className="mt-3 rounded-lg bg-primary/15 py-1.5 text-center text-xs font-semibold text-primary">You're going 🐼</p> : null}
              {e.ownerId && e.ownerId === currentUserId ? <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3"><span className="text-[11px] text-muted-foreground">Your event</span><span role="button" tabIndex={0} onClick={(ev) => { ev.stopPropagation(); setOpenEvent(e); setBlastOpen(true); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Boost Event</span></div> : null}
            </div>
            {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} variant="feed-card" placement="events_inline" /> : null}
            </>
          ))}
        </div>
      )}

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpenEvent(null)}>
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none border-0 bg-background p-0">
          {current ? <>
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
              <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setOpenEvent(null)}><ArrowLeft className="size-4" /> Back</Button>
              <span className="font-display font-semibold">Event Details</span>
            </div>
            <div className="space-y-4 p-5">
            <DialogHeader>
              <span className="w-fit rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">{current.tag}</span>
              <DialogTitle className="font-display text-2xl">{current.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 rounded-xl bg-secondary/40 p-3 text-sm">
              <p className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> {current.date}</p>
              <p className="flex items-center gap-2"><Clock className="size-4 text-primary" /> {current.time}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {current.venueName || current.place}</p>
              <p className="text-xs text-muted-foreground">{current.addressLine}{current.area ? `, ${current.area}` : ""}{current.city ? `, ${current.city}` : ""}{current.stateProvince ? `, ${current.stateProvince}` : ""}{current.country ? `, ${current.country}` : ""}</p>
              <p className="flex items-center gap-2"><Users className="size-4 text-primary" /> {current.attendeeCount ?? 0} attending · {current.reachScope ?? "worldwide"} reach</p>
              <p>{current.cost === 0 ? "Gate fee: Free" : `Gate fee: ${current.currency === "NGN" ? "₦" : current.currency + " "}${current.cost.toLocaleString()} — paid at the gate`}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.details}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {current.ownerId !== currentUserId ? (
                <>
                  <Button
                    type="button"
                    variant={current.rsvp ? "secondary" : "default"}
                    onClick={() => toggleRsvp(current.id)}
                  >
                    {current.rsvp ? "You’re going 🐼" : "I will attend"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void messageEventCreator()} className="gap-2">
                    <MessageCircle className="size-4" /> Message creator
                  </Button>
                </>
              ) : null}
              {current.ownerId === currentUserId ? <Button type="button" variant="outline" onClick={openBlast} className="gap-2"><Rocket className="size-4" /> Event Blast</Button> : null}
            </div>
            </div>
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={blastOpen} onOpenChange={setBlastOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">🚀 Event Blast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Promote <strong>{current?.title}</strong> for {plans[0]?.duration_minutes ?? 60} minutes. Your purchased reach is the base audience, plus up to <strong>20% extra notification reach</strong> at no additional cost.</p>
          <div className="space-y-2 rounded-2xl border border-border p-4"><label className="text-xs font-semibold">Target audience</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{(["worldwide","country","state","city","area"] as const).map((scope) => <button key={scope} type="button" onClick={() => setTargetScope(scope)} className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${targetScope === scope ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/60"}`}>{scope}</button>)}</div>{targetScope !== "worldwide" ? <div className="grid gap-2 sm:grid-cols-2"><select value={targetCountry} style={{minWidth:0,maxWidth:"100%"}} onChange={e=>{setTargetCountry(e.target.value);setTargetState("");setTargetCity("");}} className="h-10 rounded-xl border border-border bg-secondary/60 px-3 text-sm"><option value="">Select country</option>{targetCountries.map(c=><option key={c.iso2} value={c.name}>{countryFlag(c.iso2)} {c.name}</option>)}</select>{(targetScope==="state"||targetScope==="city"||targetScope==="area")?<select value={targetState} style={{minWidth:0,maxWidth:"100%"}} disabled={!targetCountry} onChange={e=>{setTargetState(e.target.value);setTargetCity("");}} className="h-10 rounded-xl border border-border bg-secondary/60 px-3 text-sm"><option value="">Select state / province</option>{targetStates.map(s=><option key={s}>{s}</option>)}</select>:null}{(targetScope==="city"||targetScope==="area")?<select value={targetCity} style={{minWidth:0,maxWidth:"100%"}} disabled={!targetState} onChange={e=>setTargetCity(e.target.value)} className="h-10 rounded-xl border border-border bg-secondary/60 px-3 text-sm"><option value="">Select city</option>{targetCities.map(s=><option key={s}>{s}</option>)}</select>:null}{targetScope==="area"?<Input value={targetArea} onChange={e=>setTargetArea(e.target.value)} placeholder="Target area / neighborhood"/>:null}</div>:null}</div>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.unique_reach.toLocaleString()} base reach · up to {(Math.ceil(plan.unique_reach * 1.2)).toLocaleString()} notifications (+20%) · {plan.duration_minutes} min</p></div>
                  <p className="font-bold">${Number(plan.price_usd).toFixed(2)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={plan.bc_price ? "default" : "outline"}
                    disabled={processing || bcProcessing !== null}
                    onClick={() => {
                      if (!plan.bc_price) {
                        window.dispatchEvent(new CustomEvent("circle-panda-insufficient-bc", { detail: { noEquivalent: true, reason: "No equivalent BC price for this Event Blast plan" } }));
                        return;
                      }
                      if (!current) return;
                      setBcProcessing(plan.id);
                      void (async () => {
                        try {
                          const ok = await startEventBlast(current.id, plan.id, "bc", targetScope, targetCountry, targetState, targetCity, targetArea);
                          if (ok) setBlastOpen(false);
                        } finally {
                          setBcProcessing(null);
                        }
                      })();
                    }}
                  >
                    {bcProcessing === plan.id ? "Starting…" : plan.bc_price ? `${Number(plan.bc_price).toLocaleString()} BC` : "BC unavailable"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={processing} onClick={() => void payCashBlast(plan)}>
                    {processing ? "Processing…" : `Pay $${Number(plan.price_usd).toFixed(2)}`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-xs font-semibold text-muted-foreground">Checkout email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </DialogContent>
      </Dialog>

      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} onCreated={(event) => { setCreatedEvent(event); setBoostPromptOpen(true); }} />

      <Dialog open={boostPromptOpen} onOpenChange={setBoostPromptOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="font-display text-xl">Boost your event?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Would you like to boost your event to reach a lot of people?</p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => { setBoostPromptOpen(false); setCreatedEvent(null); setOpenEvent(null); }}>No</Button>
            <Button onClick={() => { setBoostPromptOpen(false); if (createdEvent) { setOpenEvent(createdEvent); setBlastOpen(true); } }}>Yes</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AppShell>
  );
}

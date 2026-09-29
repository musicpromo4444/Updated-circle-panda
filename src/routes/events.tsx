import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CalendarPlus, Clock, MapPin, Rocket, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { useStore, type PandaEvent } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { loadPricingConfig } from "@/components/store/pricingStorage";

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
  price_ngn: number;
  bc_price: number | null;
};

function EventsPage() {
  const { events, toggleRsvp, startEventBlast } = useStore();
  const [openEvent, setOpenEvent] = useState<PandaEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);
  const [plans, setPlans] = useState<BlastPlan[]>([]);
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [bcProcessing, setBcProcessing] = useState<string | null>(null);
  const current = openEvent ? (events.find((e) => e.id === openEvent.id) ?? null) : null;

  useEffect(() => {
    void (async () => {
      const [{ data }, config] = await Promise.all([
        (supabase as any).from("event_blast_plans").select("id,name,unique_reach,duration_minutes,price_usd,price_ngn,bc_price").eq("enabled", true).order("sort_order"),
        loadPricingConfig(),
      ]);
      setPlans((data ?? []) as BlastPlan[]);
      const session = (await supabase.auth.getSession()).data.session;
      setEmail(session?.user?.email ?? "");
      void config;
    })();
  }, []);

  const openBlast = () => {
    if (!current) return;
    setBlastOpen(true);
  };

  const payCashBlast = async (plan: BlastPlan) => {
    if (!current || !email.trim()) {
      toast.error("Enter an email for the secure cash checkout.");
      return;
    }
    setProcessing(true);
    try {
      const config = await loadPricingConfig();
      const key = config.paystack.publicKey.trim();
      if (!key || !window.PaystackPop?.setup) throw new Error("Paystack checkout is not configured yet.");
      const reference = `CP_BLAST_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await new Promise<void>((resolve, reject) => {
        const popup = window.PaystackPop!.setup({
          key,
          email: email.trim(),
          amount: Math.round(Number(plan.price_ngn) * 100),
          currency: "NGN",
          ref: reference,
          metadata: { eventId: current.id, planId: plan.id, purpose: "event_blast" },
          callback: async (response) => {
            if (response.status !== "success") { reject(new Error("Payment was not confirmed.")); return; }
            const { error } = await supabase.functions.invoke("verify-event-blast-payment", { body: { reference: response.reference, eventId: current.id, planId: plan.id } });
            if (error) { reject(new Error(error.message || "Payment verification failed.")); return; }
            toast.success("Event Blast is live 🚀", { description: `${plan.unique_reach.toLocaleString()} unique users · 60 minutes.` });
            setBlastOpen(false);
            resolve();
          },
          onClose: () => reject(new Error("Checkout closed before confirmation.")),
        });
        popup.openIframe();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event Blast payment failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppShell title="Events" subtitle="Masks encouraged. Names optional.">
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
            <button key={e.id} type="button" onClick={() => setOpenEvent(e)} className="panda-panel rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">{e.tag}</span>
                <span className="coin-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">{e.cost === 0 ? "Free" : `${e.cost} BC`}</span>
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold">{e.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.blurb}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {e.date} · {e.time}</p>
                <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {e.place}</p>
                <p className="flex items-center gap-1.5"><Users className="size-3.5" /> Reach: {e.reachScope ?? "worldwide"}</p>
              </div>
              {e.rsvp ? <p className="mt-3 rounded-lg bg-primary/15 py-1.5 text-center text-xs font-semibold text-primary">You're going 🐼</p> : null}
            </button>
            {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} variant="feed-card" placement="events_inline" /> : null}
          ))}
        </div>
      )}

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpenEvent(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {current ? <>
            <DialogHeader>
              <span className="w-fit rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">{current.tag}</span>
              <DialogTitle className="font-display text-2xl">{current.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 rounded-xl bg-secondary/40 p-3 text-sm">
              <p className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> {current.date}</p>
              <p className="flex items-center gap-2"><Clock className="size-4 text-primary" /> {current.time}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {current.place}</p>
              <p className="flex items-center gap-2"><Users className="size-4 text-primary" /> {current.reachScope ?? "worldwide"} reach</p>
              <p>🪙 {current.cost === 0 ? "Free entry" : `${current.cost} BC entry`}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.details}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant={current.rsvp ? "secondary" : "default"} onClick={() => toggleRsvp(current.id)}>
                {current.rsvp ? "Cancel RSVP" : "RSVP anonymously"}
              </Button>
              <Button type="button" variant="outline" onClick={openBlast} className="gap-2"><Rocket className="size-4" /> Event Blast</Button>
            </div>
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={blastOpen} onOpenChange={setBlastOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">🚀 Event Blast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Promote <strong>{current?.title}</strong> for 60 minutes. Reach is measured in unique users; notification capacity can reach up to 200% of the purchased reach.</p>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.unique_reach.toLocaleString()} unique users · 60 min</p></div>
                  <p className="font-bold">${Number(plan.price_usd).toFixed(2)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.bc_price ? <Button size="sm" disabled={processing || bcProcessing !== null} onClick={() => void (async () => {
                    if (!current) return;
                    setBcProcessing(plan.id);
                    try {
                      const ok = await startEventBlast(current.id, plan.id, "bc");
                      if (ok) setBlastOpen(false);
                    } finally {
                      setBcProcessing(null);
                    }
                  })()}>{bcProcessing === plan.id ? "Starting…" : `${Number(plan.bc_price).toLocaleString()} BC`}</Button> : null}
                  <Button size="sm" variant="outline" disabled={processing} onClick={() => void payCashBlast(plan)}>{processing ? "Processing…" : `Pay $${Number(plan.price_usd).toFixed(2)}`}</Button>
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

      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}

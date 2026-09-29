import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Crown,
  Gift,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { SpinWheel } from "@/components/SpinWheel";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sweepstakes")({
  head: () => ({
    meta: [
      { title: "Panda Sweepstakes — Circle Panda" },
      {
        name: "description",
        content:
          "Buy Panda Sweepstakes tickets with Panda Coins, win VIP passes, BC packages and event tickets in the Weekly Draw, or the Monthly Mega Jackpot. Spin the Wheel daily for free BC.",
      },
      { property: "og:title", content: "Panda Sweepstakes — Circle Panda" },
      {
        property: "og:description",
        content:
          "Weekly prize draws and a Monthly Mega Jackpot, plus a free daily Spin the Wheel for instant BC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SweepstakesPage,
});

function countdown(until: number) {
  const left = Math.max(0, until - Date.now());
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type DailyDrawItem = {
  id: string;
  name: string;
  label: string;
  ticketPrice: number;
  consolationPrice: number;
  imageUrl: string;
  emoji: string;
  jackpot?: boolean;
};

const DEFAULT_DAILY_ITEMS: DailyDrawItem[] = [];


function DailyItemCard({
  item,
  coins,
  tickets,
  onBuy,
}: {
  item: DailyDrawItem;
  coins: number;
  tickets: number;
  onBuy: () => void;
}) {
  const [, setTick] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <article
      className={`panda-panel overflow-hidden rounded-3xl ${
        item.jackpot ? "ring-1 ring-[var(--coin)]/50" : ""
      }`}
    >
      <div className="flex min-h-[236px]">
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex items-center gap-2">
            {item.jackpot ? (
              <Crown className="size-4 text-[var(--coin)]" />
            ) : (
              <Gift className="size-4 text-primary" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </span>
            {item.jackpot ? (
              <span className="ml-auto rounded-full bg-[var(--coin)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--coin)]">
                JACKPOT
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold leading-tight">{item.name}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            One item. One winner. Five daily drops.
          </p>
          <div className="mt-auto pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ticket className="size-3.5" /> {tickets} {tickets === 1 ? "ticket" : "tickets"}{" "}
              purchased
            </div>
            <Button className="w-full gap-2" onClick={onBuy} disabled={coins < item.ticketPrice}>
              <Ticket className="size-4" /> Buy ticket · {item.ticketPrice} BC
            </Button>
            <p className="mt-2 text-center text-[11px] font-medium text-[var(--coin)]">
              +${item.consolationPrice} consolation prize if you miss out
            </p>
            {coins < item.ticketPrice ? (
              <p className="mt-1 text-center text-xs text-destructive">
                Not enough BC for this item.
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative flex w-[38%] min-w-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/50 to-[var(--coin)]/10 p-4">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_50%_45%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_60%)]" />
          {imageFailed ? (
            <span className="relative text-7xl drop-shadow-2xl" aria-hidden>
              {item.emoji}
            </span>
          ) : (
            <img
              src={item.imageUrl}
              alt=""
              className="relative max-h-40 w-full object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,.45)]"
              onError={() => setImageFailed(true)}
            />
          )}
          <span className="absolute bottom-3 right-3 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur">
            1 item
          </span>
        </div>
      </div>
    </article>
  );
}

function SweepstakesPage() {
  const { coins, syncCoins, sweepWinners, weeklyDrawEndsAt } = useStore();
  const [spinOpen, setSpinOpen] = useState(false);
  const [items, setItems] = useState(DEFAULT_DAILY_ITEMS);
  const [tickets, setTickets] = useState<Record<string, number>>({});
  const [ticketHistory, setTicketHistory] = useState<Array<{id:string;draw:string;created_at:string}>>([]);
  const [activeConfigs, setActiveConfigs] = useState<Record<string,{ticket_price_bc:number;prize_name:string;closes_at:string|null}>>({});

  useEffect(() => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;
      const [configResult, ticketResult, prizeResult] = await Promise.all([
        supabase.from("sweepstakes_config").select("draw,ticket_price_bc,prize_name,closes_at").eq("is_active", true),
        supabase.from("sweep_tickets").select("id,draw,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("sweepstake_prizes").select("id,name,label,ticket_price_bc,consolation_price,image_url,emoji,jackpot").eq("enabled", true).order("id"),
      ]);
      if (configResult.error || ticketResult.error || prizeResult.error) {
        toast.error((configResult.error ?? ticketResult.error ?? prizeResult.error)?.message ?? "Could not load sweepstakes");
        setItems([]);
        return;
      }
      const history=(ticketResult.data ?? []) as Array<{id:string;draw:string;created_at:string}>;
      setTicketHistory(history);
      setTickets(history.reduce((acc:any,t:any)=>{acc[t.draw]=(acc[t.draw]??0)+1;return acc;},{}));
      setActiveConfigs(Object.fromEntries((configResult.data ?? []).map((c:any) => [c.draw, c])));
      setItems((prizeResult.data ?? []).map((p:any)=>({id:p.id,name:p.name,label:p.label,ticketPrice:Number(p.ticket_price_bc),consolationPrice:Number(p.consolation_price),imageUrl:p.image_url,emoji:p.emoji,jackpot:Boolean(p.jackpot)})));
    })();
  }, []);

  const buyDailyTicket = (item: DailyDrawItem) => {
    void (supabase as any).rpc("buy_sweepstake_ticket_secure", { p_draw: item.id }).then(async ({ data, error }: any) => {
      if (error) throw error;
      await syncCoins();
      setTickets((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
      setTicketHistory((current) => [{ id: data?.id ?? crypto.randomUUID(), draw: item.id, created_at: new Date().toISOString() }, ...current]);
      toast.success(`Ticket purchased for ${item.name} 🎟️`);
    }).catch((error: any) => toast.error(error?.message ?? "Could not purchase ticket."));
  };



  return (
    <AppShell
      title="Panda Sweepstakes"
      subtitle="Buy tickets with BC, win prizes, and spin the Wheel daily for free BC."
    >
      <Button
        className="mb-5 w-full gap-2 bg-[var(--coin)] text-[var(--coin-foreground)] hover:bg-[var(--coin)]/90"
        onClick={() => setSpinOpen(true)}
      >
        <Sparkles className="size-4" /> Spin the Wheel · 1 free spin / 24h
      </Button>

      <section className="mb-4 rounded-2xl border border-[var(--coin)]/25 bg-[var(--coin)]/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[var(--coin)]">
              <Crown className="size-3.5" /> Daily draw & jackpot
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Five items. Five chances to win.
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Every card is a single prize with its own ticket price and consolation value.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-semibold tabular-nums">
            <Timer className="size-3.5 text-primary" /> {countdown(weeklyDrawEndsAt)} left
          </span>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, idx) => (
          <DailyItemCard
            key={item.id}
            item={item}
            coins={coins}
            tickets={tickets[item.id] ?? 0}
            onBuy={() => buyDailyTicket(item)}
          />
          {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} variant="feed-card" placement="sweepstakes_inline" /> : null}
        ))}
      </div>

      <section className="panda-panel mt-5 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Ticket className="size-4 text-primary" /> Your ticket history</h2>
        {ticketHistory.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No tickets purchased yet.</p> : <div className="mt-3 space-y-2">{ticketHistory.slice(0,10).map(t => <div key={t.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs"><span className="font-medium">{t.draw}</span><span className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span></div>)}</div>}
      </section>

      <section className="panda-panel mt-5 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Trophy className="size-4 text-primary" /> Recent winners
        </h2>
        {sweepWinners.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No draws closed yet. Be the first winner.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {sweepWinners.map((w, i) => (
              <div
                key={`${w.name}-${w.wonAt}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-sm">
                  {w.draw === "monthly" ? "👑" : "🎁"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{w.prize}</p>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {w.draw}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timer className="size-3.5" /> Daily items reset when the draw timer reaches zero.
          Consolation prizes are issued to non-winning ticket holders.
        </p>
      </section>

      <SpinWheel open={spinOpen} onOpenChange={setSpinOpen} />
    </AppShell>
  );
}

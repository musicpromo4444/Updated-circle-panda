import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  Check,
  Crown,
  Gift,
  ImagePlus,
  Pencil,
  Save,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinWheel } from "@/components/SpinWheel";
import { useStore } from "@/lib/store";

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

const DAILY_ITEMS_STORAGE_KEY = "circle-panda-daily-draw-items-v1";

const DEFAULT_DAILY_ITEMS: DailyDrawItem[] = [
  {
    id: "iphone-16",
    name: "iPhone 16 Pro Max",
    label: "Grand prize",
    ticketPrice: 10,
    consolationPrice: 10,
    imageUrl: "https://pngimg.com/uploads/iphone/iphone_PNG5733.png",
    emoji: "📱",
    jackpot: true,
  },
  {
    id: "playstation-5",
    name: "PlayStation 5",
    label: "Gaming drop",
    ticketPrice: 8,
    consolationPrice: 8,
    imageUrl: "https://pngimg.com/uploads/ps5/ps5_PNG16.png",
    emoji: "🎮",
  },
  {
    id: "vip-pass",
    name: "7-Day VIP Pass",
    label: "Panda perks",
    ticketPrice: 5,
    consolationPrice: 5,
    imageUrl: "https://pngimg.com/uploads/ticket/ticket_PNG1.png",
    emoji: "🎟️",
  },
  {
    id: "black-coins",
    name: "1,000 Black Coins",
    label: "Coin drop",
    ticketPrice: 3,
    consolationPrice: 3,
    imageUrl: "https://pngimg.com/uploads/coin/coin_PNG368.png",
    emoji: "🪙",
  },
  {
    id: "event-tickets",
    name: "2 Event Tickets",
    label: "Community pick",
    ticketPrice: 6,
    consolationPrice: 6,
    imageUrl: "https://pngimg.com/uploads/ticket/ticket_PNG27.png",
    emoji: "🎫",
  },
];

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

function DailyItemsAdmin({
  items,
  onChange,
  onSave,
}: {
  items: DailyDrawItem[];
  onChange: (id: string, patch: Partial<DailyDrawItem>) => void;
  onSave: () => void;
}) {
  const handleNumberChange =
    (id: string, key: "ticketPrice" | "consolationPrice") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(id, { [key]: Math.max(0, Number(event.target.value)) });
    };

  return (
    <section className="panda-panel mt-5 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-primary">
            <Pencil className="size-3.5" /> Admin dashboard
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            Manage today&apos;s five items
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Each card is one item. PNG images with transparent backgrounds work best.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onSave}>
          <Save className="size-3.5" /> Save daily items
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-border/70 bg-secondary/25 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
                {index + 1}
              </span>
              Item {index + 1}
              <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
                {item.id}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_110px_130px]">
              <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Item name
                <Input
                  value={item.name}
                  onChange={(event) => onChange(item.id, { name: event.target.value })}
                  aria-label={`Item ${index + 1} name`}
                />
              </label>
              <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ticket price
                <Input
                  type="number"
                  min={0}
                  value={item.ticketPrice}
                  onChange={handleNumberChange(item.id, "ticketPrice")}
                  aria-label={`Item ${index + 1} ticket price`}
                />
              </label>
              <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Consolation $
                <Input
                  type="number"
                  min={0}
                  value={item.consolationPrice}
                  onChange={handleNumberChange(item.id, "consolationPrice")}
                  aria-label={`Item ${index + 1} consolation price`}
                />
              </label>
            </div>
            <label className="mt-2 block space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Transparent PNG image URL
              <div className="flex gap-2">
                <Input
                  value={item.imageUrl}
                  onChange={(event) => onChange(item.id, { imageUrl: event.target.value })}
                  placeholder="https://…/product.png"
                  aria-label={`Item ${index + 1} image URL`}
                />
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background/60">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <ImagePlus className="size-4 text-muted-foreground" />
                  )}
                </span>
              </div>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function SweepstakesPage() {
  const { coins, spendCoins, sweepWinners, weeklyDrawEndsAt, isAdmin } = useStore();
  const [spinOpen, setSpinOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [items, setItems] = useState(DEFAULT_DAILY_ITEMS);
  const [itemsReady, setItemsReady] = useState(false);
  const [tickets, setTickets] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DAILY_ITEMS_STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as DailyDrawItem[]);
    } catch {
      /* Keep the default item catalog if saved admin data is unavailable. */
    } finally {
      setItemsReady(true);
    }
  }, []);

  useEffect(() => {
    if (itemsReady) window.localStorage.setItem(DAILY_ITEMS_STORAGE_KEY, JSON.stringify(items));
  }, [items, itemsReady]);

  const updateItem = (id: string, patch: Partial<DailyDrawItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const buyDailyTicket = (item: DailyDrawItem) => {
    if (!spendCoins(item.ticketPrice, `Daily draw ticket for ${item.name}`)) return;
    setTickets((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
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
        {items.map((item) => (
          <DailyItemCard
            key={item.id}
            item={item}
            coins={coins}
            tickets={tickets[item.id] ?? 0}
            onBuy={() => buyDailyTicket(item)}
          />
        ))}
      </div>

      {isAdmin ? (
        <div className="mt-5">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setAdminOpen((open) => !open)}
          >
            {adminOpen ? <Check className="size-4" /> : <Pencil className="size-4" />}{" "}
            {adminOpen ? "Close item manager" : "Manage daily items"}
          </Button>
          {adminOpen ? (
            <DailyItemsAdmin
              items={items}
              onChange={updateItem}
              onSave={() => {
                window.localStorage.setItem(DAILY_ITEMS_STORAGE_KEY, JSON.stringify(items));
                setAdminOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}

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
          <CalendarDays className="size-3.5" /> Daily items reset when the draw timer reaches zero.
          Consolation prizes are issued to non-winning ticket holders.
        </p>
      </section>

      <SpinWheel open={spinOpen} onOpenChange={setSpinOpen} />
    </AppShell>
  );
}

import { useEffect, useState } from "react";
import { Gift, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "cp_lastSpinDate";
const BADGE_KEY = "cp_dailyBadges";

export type DailyPrize = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number;
  coins?: number;
  badge?: string;
  bonusSpin?: boolean;
};

/** Reward slices for the daily login wheel. */
export const DAILY_PRIZES: DailyPrize[] = [
  { id: "bc5", label: "5 BC", emoji: "🪙", color: "var(--coin)", weight: 26, coins: 5 },
  {
    id: "badge",
    label: "Panda Badge",
    emoji: "🎖️",
    color: "var(--primary)",
    weight: 12,
    badge: "Daily Panda",
  },
  { id: "bc15", label: "15 BC", emoji: "💰", color: "var(--dating)", weight: 20, coins: 15 },
  {
    id: "bonus",
    label: "Bonus Spin",
    emoji: "🔄",
    color: "oklch(0.55 0.12 200)",
    weight: 12,
    bonusSpin: true,
  },
  { id: "bc30", label: "30 BC", emoji: "💎", color: "var(--coin)", weight: 14, coins: 30 },
  {
    id: "gift",
    label: "Gift Card",
    emoji: "🎁",
    color: "var(--primary)",
    weight: 4,
    badge: "Gift Card Winner",
    coins: 50,
  },
  { id: "bc2", label: "2 BC", emoji: "🐼", color: "var(--dating)", weight: 12, coins: 2 },
];

function pickPrize(): number {
  const total = DAILY_PRIZES.reduce((n, p) => n + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < DAILY_PRIZES.length; i++) {
    r -= DAILY_PRIZES[i]!.weight;
    if (r <= 0) return i;
  }
  return 0;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export function DailyLoginWheel() {
  const { addCoins } = useStore();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [prize, setPrize] = useState<DailyPrize | null>(null);
  const [claimed, setClaimed] = useState(false);

  // Daily check: only after hydration, so SSR markup stays stable.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== todayKey()) setOpen(true);
    } catch {
      /* storage blocked — skip the popup */
    }
  }, []);

  const markToday = () => {
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* ignore */
    }
  };

  const sliceAngle = 360 / DAILY_PRIZES.length;

  const spin = () => {
    if (spinning || prize) return;
    setSpinning(true);
    const idx = pickPrize();
    const target = 360 * 6 + (360 - (idx * sliceAngle + sliceAngle / 2));
    setAngle((prev) => prev + (target - (prev % 360)));
    setTimeout(() => {
      setPrize(DAILY_PRIZES[idx]!);
      setSpinning(false);
    }, 4200);
  };

  const claim = () => {
    if (!prize) return;
    if (prize.coins) addCoins(prize.coins, `Daily spin: ${prize.label}`);
    if (prize.badge) {
      try {
        const list: string[] = JSON.parse(localStorage.getItem(BADGE_KEY) ?? "[]");
        if (!list.includes(prize.badge))
          localStorage.setItem(BADGE_KEY, JSON.stringify([...list, prize.badge]));
      } catch {
        /* ignore */
      }
    }
    setClaimed(true);
    if (prize.bonusSpin) {
      // Bonus spin: reset the wheel for one more free go today.
      setPrize(null);
      setClaimed(false);
      return;
    }
    markToday();
    setOpen(false);
  };

  const skip = () => {
    markToday();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !spinning && (o ? setOpen(true) : skip())}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="flex items-center justify-center gap-2 text-center font-display text-xl">
          <Gift className="size-5 text-[var(--coin)]" /> Daily Panda Spin
        </DialogTitle>
        <DialogDescription className="text-center">
          {prize
            ? "Your reward is ready to claim."
            : "One free spin every day. Win BC, badges, gift cards or a bonus spin."}
        </DialogDescription>

        {prize ? (
          <div className="animate-scale-in flex flex-col items-center gap-3 py-3 text-center">
            <span className="text-5xl leading-none">{prize.emoji}</span>
            <p className="flex items-center gap-2 font-display text-2xl font-semibold text-primary">
              <PartyPopper className="size-5" /> Congratulations!
            </p>
            <p className="text-sm text-muted-foreground">
              You won <span className="font-semibold text-foreground">{prize.label}</span>
              {prize.bonusSpin ? " — spin again for free!" : ""}
            </p>
            <Button className="mt-1 w-full gap-2" onClick={claim}>
              <Sparkles className="size-4" /> {prize.bonusSpin ? "Use bonus spin" : "Claim reward"}
            </Button>
            {!prize.bonusSpin && claimed ? null : null}
          </div>
        ) : (
          <>
            <div
              className="relative mx-auto mt-1 grid place-items-center"
              style={{ width: 250, height: 250 }}
            >
              <span
                aria-hidden
                className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-[var(--coin)]"
              />
              <div
                className="relative size-full rounded-full border-4 border-[var(--coin)] shadow-[0_0_0_4px_var(--background)]"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transition: spinning ? "transform 4.2s cubic-bezier(0.16,1,0.3,1)" : undefined,
                  background: `conic-gradient(${DAILY_PRIZES.map((p, i) => {
                    const start = i * sliceAngle;
                    return `${p.color} ${start}deg ${start + sliceAngle}deg`;
                  }).join(",")})`,
                }}
              >
                {DAILY_PRIZES.map((p, i) => (
                  <span
                    key={p.id}
                    aria-hidden
                    className="absolute left-1/2 top-1/2 origin-left text-lg leading-none"
                    style={{
                      transform: `rotate(${i * sliceAngle + sliceAngle / 2}deg) translateX(62px) rotate(90deg)`,
                    }}
                  >
                    {p.emoji}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={spin}
                disabled={spinning}
                className="absolute z-10 grid size-20 place-items-center rounded-full border-4 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 disabled:opacity-80"
              >
                {spinning ? "…" : "SPIN NOW!"}
              </button>
            </div>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={skip}
              disabled={spinning}
            >
              Maybe later
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

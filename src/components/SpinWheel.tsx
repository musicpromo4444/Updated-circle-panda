import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore, SPIN_SLICES, SPIN_COOLDOWN_MS, type SpinPrize } from "@/lib/store";

function formatRemaining(ms: number) {
  const left = Math.max(0, ms);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SLICE_COLORS = [
  "var(--coin)",
  "var(--primary)",
  "var(--dating)",
  "oklch(0.55 0.12 200)",
  "var(--coin)",
  "var(--primary)",
  "var(--dating)",
];

export function SpinWheel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { canSpin, nextSpinAt, spinWheel } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<SpinPrize | null>(null);
  const [, setTick] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Live countdown for the next-free-spin timer.
  useEffect(() => {
    if (canSpin) return;
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, [canSpin]);

  const sliceAngle = 360 / SPIN_SLICES.length;

  const doSpin = () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);
    // Land on a weighted random slice.
    const idx = (() => {
      const total = SPIN_SLICES.reduce((n, s) => n + s.weight, 0);
      let r = Math.random() * total;
      for (let i = 0; i < SPIN_SLICES.length; i++) {
        r -= SPIN_SLICES[i]!.weight;
        if (r <= 0) return i;
      }
      return 0;
    })();
    // We want the pointer (at top, 0deg) to point at slice idx center.
    // Each slice spans sliceAngle starting at idx*sliceAngle.
    const target = 360 * 6 + (360 - (idx * sliceAngle + sliceAngle / 2));
    setAngle((prev) => prev + (target - (prev % 360)));
    setTimeout(() => {
      const prize = spinWheel();
      setResult(prize);
      setSpinning(false);
    }, 4200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !spinning && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="flex items-center gap-2 font-display text-xl">
          <Sparkles className="size-5 text-[var(--coin)]" /> Spin the Wheel
        </DialogTitle>
        <DialogDescription>
          One free spin every 24 hours. Black Coins, data, VIP — and ultra-rare grand prizes.
        </DialogDescription>

        <div
          className="relative mx-auto mt-2 grid place-items-center"
          style={{ width: 240, height: 240 }}
        >
          {/* pointer */}
          <span
            aria-hidden
            className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-[var(--coin)]"
          />
          <div
            ref={wheelRef}
            className="size-full rounded-full border-4 border-[var(--coin)] shadow-[0_0_0_4px_var(--background)]"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning ? "transform 4.2s cubic-bezier(0.16,1,0.3,1)" : undefined,
              background: `conic-gradient(${SPIN_SLICES.map((_, i) => {
                const start = i * sliceAngle;
                const end = start + sliceAngle;
                return `${SLICE_COLORS[i % SLICE_COLORS.length]!} ${start}deg ${end}deg`;
              }).join(",")})`,
            }}
          >
            {SPIN_SLICES.map((s, i) => {
              const mid = i * sliceAngle + sliceAngle / 2;
              return (
                <span
                  key={s.id}
                  className="absolute left-1/2 top-1/2 origin-left text-lg"
                  style={{ transform: `rotate(${mid}deg) translateX(58px) rotate(90deg)` }}
                  aria-hidden
                >
                  {s.emoji}
                </span>
              );
            })}
          </div>
        </div>

        {result ? (
          <p className="text-center text-sm font-semibold text-primary">
            You won {result.title} {result.emoji}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {result.rarity.replace("-", " ")}
            </span>
          </p>
        ) : null}

        <Button className="w-full gap-2" onClick={doSpin} disabled={spinning || !canSpin}>
          <Sparkles className="size-4" />
          {spinning
            ? "Spinning…"
            : canSpin
              ? "Spin free"
              : `Next spin in ${formatRemaining((nextSpinAt ?? 0) - Date.now())}`}
        </Button>
        {!canSpin ? (
          <p className="text-center text-xs text-muted-foreground">
            Free spins reset every {SPIN_COOLDOWN_MS / 3600000} hours.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

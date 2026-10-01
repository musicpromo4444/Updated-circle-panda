import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingQualification, setSubmittingQualification] = useState(false);
  const [qualificationComplete, setQualificationComplete] = useState<{ nextStageReleased: boolean } | null>(null);
  const [, setTick] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Live countdown for the next-free-spin timer.
  useEffect(() => {
    if (canSpin) return;
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, [canSpin]);

  const sliceAngle = 360 / SPIN_SLICES.length;

  const doSpin = async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);
    setQualificationComplete(null);
    try {
      // Resolve the prize on the server first. The animation must never
      // display a different slice from the authoritative result.
      const prize = await spinWheel();
      if (!prize) {
        setSpinning(false);
        return;
      }
      const idx = Math.max(0, SPIN_SLICES.findIndex((slice) => slice.id === prize.id));
      const target = 360 * 6 + (360 - (idx * sliceAngle + sliceAngle / 2));
      setAngle((prev) => prev + (target - (prev % 360)));
      window.setTimeout(() => {
        setResult(prize);
        setSpinning(false);
      }, 4200);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !spinning && onOpenChange(o)}>
      <DialogContent className="cp-game-dialog sm:max-w-md overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <DialogTitle className="cp-game-header flex items-center gap-2 font-display text-xl">
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
            className="cp-neon-wheel size-full rounded-full border-4 border-[#a96cff]"
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

        {qualificationComplete ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center">
            <p className="text-lg font-black text-emerald-300">✅ Qualification stage completed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your submission has been saved securely.
              {qualificationComplete.nextStageReleased ? " The next qualification stage is now available." : " We will notify you when the next stage is released."}
            </p>
            <Button className="mt-4 w-full" onClick={() => setQualificationComplete(null)}>Continue</Button>
          </div>
        ) : null}

        {result ? (
          result.requiresQualification && result.qualificationId && result.qualificationStageId ? (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">🎉 You qualified: {result.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Complete this form now. Your qualification is saved immediately.
                </p>
              </div>
              {Array.isArray((result.qualificationForm as any)?.fields) ? (result.qualificationForm as any).fields.map((field: any) => (
                <label key={String(field.key)} className="block space-y-1.5">
                  <span className="text-xs font-semibold">{String(field.label ?? field.key)}</span>
                  <input
                    value={answers[String(field.key)] ?? ""}
                    onChange={(e) => setAnswers((current) => ({ ...current, [String(field.key)]: e.target.value }))}
                    required={field.required !== false}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              )) : null}
              <Button
                className="w-full"
                disabled={submittingQualification}
                onClick={async () => {
                  const fields = Array.isArray((result.qualificationForm as any)?.fields) ? (result.qualificationForm as any).fields : [];
                  const missing = fields.find((field: any) => field.required !== false && !String(answers[String(field.key)] ?? "").trim());
                  if (missing) {
                    toast.error(`Please complete: ${String(missing.label ?? missing.key)}`);
                    return;
                  }
                  setSubmittingQualification(true);
                  try {
                    const { data, error } = await (supabase as any).rpc("cp_submit_reward_stage", {
                      p_qualification_id: result.qualificationId,
                      p_stage_id: result.qualificationStageId,
                      p_answers: answers,
                    });
                    if (error) throw error;
                    setQualificationComplete({ nextStageReleased: Boolean(data?.next_stage_released) });
                    setResult(null);
                    setAnswers({});

                  } catch (error: any) {
                    toast.error(error?.message ?? "Could not submit your qualification.");
                  } finally {
                    setSubmittingQualification(false);
                  }
                }}
              >
                {submittingQualification ? "Submitting…" : "Complete qualification"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm font-semibold text-primary">
              You won {result.title} {result.emoji}
              <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {result.rarity.replace("-", " ")}
              </span>
            </p>
          )
        ) : null}

        <Button className="w-full gap-2" onClick={doSpin} disabled={spinning || !canSpin || Boolean(result?.requiresQualification)}>

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

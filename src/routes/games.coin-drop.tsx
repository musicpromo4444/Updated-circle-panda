import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins, Gem, Loader2, Timer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

type Phase = "ready" | "playing" | "ad" | "result";

export const Route = createFileRoute("/games/coin-drop")({
  head: () => ({ meta: [{ title: "Coin Drop — Circle Panda" }] }),
  component: CoinDropPage,
});

function CoinDropPage() {
  const { syncCoins } = useStore();
  const [phase, setPhase] = useState<Phase>("ready");
  const [seconds, setSeconds] = useState(60);
  const [drops, setDrops] = useState(0);
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [adSeconds, setAdSeconds] = useState(5);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          finishGame();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ad") return;
    setAdSeconds(5);
    const timer = window.setInterval(() => {
      setAdSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          setPhase("result");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const finishGame = async () => {
    if (busy || phase !== "playing") return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_timed_daily_activity", { p_slug: "coin_drop", p_action: "finish" });
    if (error) {
      setBusy(false);
      toast.error(error.message ?? "Coin Drop could not be completed");
      return;
    }
    const awarded = Number(data?.bc_awarded ?? 0);
    setResult(awarded);
    setBusy(false);
    await syncCoins();
    setPhase("ad");
  };

  const start = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("play_timed_daily_activity", { p_slug: "coin_drop", p_action: "start" });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Coin Drop could not start"); return; }
    setSeconds(60);
    setDrops(0);
    setPicked(0);
    setResult(null);
    setPhase("playing");
  };

  const dropCoin = (amount: number) => {
    if (phase !== "playing") return;
    setDrops((d) => d + 1);
    setPicked((p) => p + amount);
  };

  const progress = useMemo(() => Math.min(100, (drops / 20) * 100), [drops]);

  return (
    <AppShell title="Coin Drop" subtitle="Catch the coins. Avoid the stones.">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link to="/activities" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ArrowLeft className="size-4" /> Back to activities
        </Link>

        <section className="panda-panel overflow-hidden rounded-3xl">
          <div className="border-b border-border/70 bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">SPONSORED COIN DROP</p>
                <h1 className="mt-1 font-display text-2xl font-black">Catch & collect</h1>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1 text-primary"><Timer className="size-4" /><b>{seconds}s</b></div>
                <p className="text-[10px] text-muted-foreground">remaining</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 rounded-2xl border border-border/70 bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sponsor</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Circle Panda sponsor</span>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">AD</span>
              </div>
            </div>

            <div className="relative grid min-h-[360px] place-items-center overflow-hidden rounded-3xl border border-border/70 bg-secondary/20">
              {phase === "ready" ? (
                <div className="max-w-xs p-6 text-center">
                  <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-5xl">🪙</div>
                  <h2 className="mt-4 font-display text-xl font-bold">60 seconds</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Coins can give 1–2 BC. Stones cost 3 BC. A very rare blink can reveal 500 BC.</p>
                  <Button className="mt-5 w-full" onClick={() => void start()}>Start Coin Drop</Button>
                </div>
              ) : phase === "playing" ? (
                <div className="absolute inset-0 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Collected: <b>{picked} BC</b></span>
                    <span>Drops: {drops}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="grid h-[285px] grid-cols-4 gap-3 p-4">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const isStone = i % 5 === 0;
                      const amount = isStone ? -3 : i % 3 === 0 ? 2 : 1;
                      return (
                        <button key={i} type="button" onClick={() => dropCoin(amount)} className="grid place-items-center rounded-2xl border border-border/60 bg-card text-3xl transition-transform active:scale-90">
                          {isStone ? "🪨" : "🪙"}
                        </button>
                      );
                    })}
                  </div>
                  {busy ? <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="size-8 animate-spin text-primary" /></div> : null}
                </div>
              ) : phase === "ad" ? (
                <div className="max-w-xs p-6 text-center">
                  <div className="mb-4 rounded-2xl border border-border/70 bg-card p-5">
                    <Sparkles className="mx-auto size-8 text-primary" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sponsored result ad</p>
                    <h2 className="mt-1 font-display text-lg font-bold">Your result is ready</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Stay on this card while the sponsor message finishes.</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${((5-adSeconds)/5)*100}%` }} /></div>
                    <p className="mt-2 text-xs text-muted-foreground">{adSeconds}s</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-xs p-6 text-center">
                  <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10"><Gem className="size-10 text-primary" /></div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary">Result revealed</p>
                  <h2 className="mt-1 font-display text-2xl font-black">+{result ?? 0} BC</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Your verified reward has been added to your Circle Panda wallet.</p>
                  <Button className="mt-5 w-full" onClick={() => setPhase("ready")}>Play Again</Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

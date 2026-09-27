import { useEffect, useState } from "react";
import { Armchair, Flame, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

type Presence = {
  enabled: boolean;
  title: string;
  message: string;
};

export function HotSeatFloatingPresence() {
  const navigate = useNavigate();
  const [presence, setPresence] = useState<Presence | null>(null);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("hot_seat_presence_settings")
        .select("enabled,title,message")
        .eq("id", true)
        .maybeSingle();
      if (mounted) setPresence(data ?? null);
    };
    void load();

    const channel = supabase
      .channel("circle-panda-hot-seat-presence")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "hot_seat_presence_settings",
      }, (payload) => {
        const next = payload.new as Presence;
        setPresence(next);
        if (next.enabled) {
          setNotice(true);
          window.setTimeout(() => setNotice(false), 6500);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!presence?.enabled) return null;

  return (
    <>
      {notice && (
        <button
          type="button"
          onClick={() => navigate({ to: "/hot-seat" })}
          className="fixed bottom-24 left-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-orange-400/40 bg-neutral-950/95 px-4 py-3 text-left text-white shadow-[0_12px_50px_rgba(249,115,22,0.35)] backdrop-blur-xl animate-in slide-in-from-left-5 fade-in"
        >
          <Bell className="size-4 shrink-0 text-orange-300" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-orange-300">Hot Seat is ON</div>
            <div className="mt-0.5 text-[11px] text-white/70">Apply to sit and earn 20% of eligible BC transactions during the session.</div>
          </div>
        </button>
      )}

      <button
        type="button"
        aria-label="Hot Seat"
        onClick={() => navigate({ to: "/hot-seat" })}
        className="group fixed bottom-5 left-4 z-[79] flex flex-col items-center gap-1"
      >
        <span className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl animate-pulse" />
          <Flame className="absolute -top-1 left-1/2 size-10 -translate-x-1/2 fill-orange-500 text-amber-300 animate-bounce" />
          <span className="relative grid size-12 place-items-center rounded-2xl border border-orange-300/70 bg-gradient-to-b from-orange-500/25 to-black/80 shadow-[0_0_28px_rgba(249,115,22,0.55)]">
            <Armchair className="size-8 text-white drop-shadow-[0_0_8px_rgba(255,180,80,0.8)]" />
          </span>
          <span className="absolute -bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-orange-500/80 blur-sm animate-pulse" />
        </span>
        <span className="rounded-full border border-orange-400/30 bg-black/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-200 shadow-lg">
          Hot Seat
        </span>
      </button>
    </>
  );
}

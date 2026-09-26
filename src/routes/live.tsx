import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Radio, Users , Square, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { heartbeatLiveStream, joinLiveStream, leaveLiveStream, listLiveStreams } from "@/lib/production/features";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/live")({ component: LivePage });
function LivePage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [joined, setJoined] = useState(false);
  useEffect(() => { void listLiveStreams().then(setStreams); }, []);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    const refreshPresence = async () => {
      try {
        const result:any = await heartbeatLiveStream(active.id);
        if (!cancelled) {
          setJoined(true);
          setActive((current:any) => current ? { ...current, viewer_count:Number(result?.viewer_count ?? current.viewer_count ?? 0) } : current);
        }
      } catch (e:any) {
        if (!cancelled) toast.error(e?.message ?? "Live viewer session expired");
      }
    };
    void joinLiveStream(active.id).then((result:any) => {
      if (!cancelled) {
        setJoined(true);
        setActive((current:any) => current ? { ...current, viewer_count:Number(result?.viewer_count ?? current.viewer_count ?? 0) } : current);
        heartbeatTimer = setInterval(() => void refreshPresence(), 30_000);
      }
    }).catch((e:any) => toast.error(e?.message ?? "Could not join live stream"));
    return () => {
      cancelled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setJoined(false);
      void leaveLiveStream(active.id).catch(() => {});
    };
  }, [active?.id]);
  useEffect(() => {
    const channel = supabase.channel("circle-panda-live-streams").on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => { void listLiveStreams().then(setStreams); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  return <AppShell title="Live" subtitle="Join live Circle Panda broadcasts and watch in real time.">
    {streams.length === 0 ? <div className="panda-panel rounded-2xl p-8 text-center"><Radio className="mx-auto size-10 text-primary"/><h2 className="mt-3 font-display text-xl font-semibold">No live streams right now</h2><p className="mt-1 text-sm text-muted-foreground">When an approved broadcast starts, it will appear here automatically.</p></div> : <div className="grid gap-4 md:grid-cols-2">{streams.map((s) => <article key={s.id} className="panda-panel overflow-hidden rounded-2xl"><div className="aspect-video bg-black">{s.stream_url ? <video src={s.stream_url} controls playsInline className="size-full object-cover"/> : <div className="grid size-full place-items-center text-muted-foreground"><Radio className="size-10"/></div>}</div><div className="p-4"><div className="flex items-center gap-2"><span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-500">LIVE</span><h2 className="font-display text-lg font-semibold">{s.title}</h2></div><p className="mt-1 text-sm text-muted-foreground">{s.description}</p><div className="mt-4 flex gap-2"><Button onClick={() => setActive(s)}>{active?.id === s.id && joined ? "Watching" : "Watch live"}</Button></div></div></article>)}</div>}
    {active ? <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground"><Eye className="size-4"/> Live viewer session active <Users className="ml-3 size-4"/> {active.title} · {Number(active.viewer_count ?? 0)} watching</div> : null}
  </AppShell>;
}

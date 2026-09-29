import { useEffect, useState } from "react";
import { Loader2, Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function AdminHotSeatManager() {
  const [alias, setAlias] = useState("");
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [location, setLocation] = useState("");
  const [provider, setProvider] = useState("youtube");
  const [hosts, setHosts] = useState(5);
  const [duration, setDuration] = useState(24);
  const [startAt, setStartAt] = useState("");
  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [sessionHosts, setSessionHosts] = useState<any[]>([]);
  const [newHostAlias, setNewHostAlias] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hot_seat_hosts")
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) toast.error(error.message);
    setActive(data);
    if (data?.id) {
      const { data: slots } = await supabase.from("hot_seat_session_hosts").select("*").eq("session_id", data.id).eq("is_active", true).order("host_order");
      setSessionHosts(slots ?? []);
    } else setSessionHosts([]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void (async () => {
      const { data } = await supabase
        .from("hot_seat_presence_settings")
        .select("enabled")
        .eq("id", true)
        .maybeSingle();
      setPresenceEnabled(Boolean(data?.enabled));
    })();
  }, []);

  const start = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("admin_hot_seat_start", {
      p_alias: alias,
      p_media_url: url,
      p_media_kind: "video",
      p_provider: provider,
      p_max_hosts: hosts,
      p_topic: topic || null,
      p_location: location || null,
      p_start_at: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
      p_duration_hours: duration,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setActive(data);
    const { data: slots } = await supabase.from("hot_seat_session_hosts").select("*").eq("session_id", data.id).eq("is_active", true).order("host_order");
    setSessionHosts(slots ?? []);
    toast.success(startAt && new Date(startAt).getTime() > Date.now() ? "Hot Seat scheduled" : "Hot Seat is live");
  };

  const end = async () => {
    if (!active) return;
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_hot_seat_end", { p_host_id: active.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    setActive(null);
    toast.success("Hot Seat ended");
  };

  const togglePresence = async () => {
    setPresenceSaving(true);
    const { data, error } = await (supabase as any).rpc("admin_set_hot_seat_presence", {
      p_enabled: !presenceEnabled,
    });
    setPresenceSaving(false);
    if (error) return toast.error(error.message);
    setPresenceEnabled(Boolean(data?.enabled));
    toast.success(data?.enabled ? "Hot Seat icon + notification are ON" : "Hot Seat icon is OFF");
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">Hot Seat Control</h2>
        <p className="text-xs text-muted-foreground">Start and control the worldwide 3-hour live block.</p>
      </div>

      <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b className="text-sm">Hot Seat floating seat</b>
            <p className="mt-1 text-xs text-muted-foreground">
              Show the animated burning seat and notify connected users when Hot Seat is turned on.
            </p>
          </div>
          <button type="button" disabled={presenceSaving} onClick={() => void togglePresence()}
            className={`relative h-7 w-12 rounded-full transition-colors ${presenceEnabled ? "bg-orange-500" : "bg-white/15"}`}
            aria-label="Toggle Hot Seat floating seat">
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${presenceEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : active ? (
        <div className="rounded-2xl border border-orange-500/30 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2"><Radio className="size-4 text-orange-400" /><b>LIVE: {active.alias}</b></div>
          <p className="text-xs text-muted-foreground">
            {active.stream_provider} · {active.max_hosts} host slots · 3h live / 1h water break · {active.session_duration_hours}h session
          </p>
          <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-2">
            <b className="text-sm">Host slots</b>
            <div className="flex flex-wrap gap-2">
              {sessionHosts.map((slot) => (
                <div key={slot.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs">
                  <span>#{slot.host_order} {slot.alias}</span>
                  <button type="button" className="text-red-400" onClick={async () => {
                    const { error } = await (supabase as any).rpc("admin_hot_seat_remove_host", { p_session_host_id: slot.id });
                    if (error) toast.error(error.message); else { setSessionHosts(prev => prev.filter(x => x.id !== slot.id)); toast.success("Host removed"); }
                  }}>Remove</button>
                </div>
              ))}
            </div>
            {sessionHosts.length < Number(active.max_hosts ?? 1) && (
              <div className="flex gap-2">
                <Input placeholder="Additional host Panda name" value={newHostAlias} onChange={e => setNewHostAlias(e.target.value)} />
                <Button disabled={!newHostAlias.trim()} onClick={async () => {
                  const { data, error } = await (supabase as any).rpc("admin_hot_seat_add_host", { p_session_id: active.id, p_alias: newHostAlias.trim() });
                  if (error) toast.error(error.message); else { setSessionHosts(prev => [...prev, data]); setNewHostAlias(""); toast.success("Host added"); }
                }}>Add</Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={async () => {
              const { error } = await (supabase as any).rpc("admin_hot_seat_pause", { p_host_id: active.id, p_minutes: 15 });
              if (error) toast.error(error.message); else { await load(); toast.success("15-minute pause started"); }
            }} disabled={saving}>Pause 15m</Button>
            <Button variant="outline" onClick={async () => {
              const { error } = await (supabase as any).rpc("admin_hot_seat_resume", { p_host_id: active.id });
              if (error) toast.error(error.message); else { await load(); toast.success("Hot Seat resumed"); }
            }} disabled={saving}>Resume</Button>
            <Button variant="destructive" onClick={() => void end()} disabled={saving}>
              <Square className="mr-2 size-4" />End Hot Seat
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Host Panda name" value={alias} onChange={e => setAlias(e.target.value)} />
            <Input placeholder="Live media URL" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <Input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} />
          <Input placeholder="Worldwide location label (optional)" value={location} onChange={e => setLocation(e.target.value)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="youtube">YouTube</option><option value="aws">AWS / Own Stream</option><option value="zegocloud">ZEGOCLOUD</option>
            </select>
            <select value={hosts} onChange={e => setHosts(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {[1, 2, 5, 10, 20].map(n => <option key={n} value={n}>{n} host slots</option>)}
            </select>
            <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} aria-label="Hot Seat start time" />
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {[4, 8, 12, 24, 48, 72].map(n => <option key={n} value={n}>{n}h session</option>)}
            </select>
          </div>
          <Button onClick={() => void start()} disabled={saving || !alias || !url} className="w-full">
            <Radio className="mr-2 size-4" />{saving ? "Saving…" : startAt && new Date(startAt).getTime() > Date.now() ? "Schedule Hot Seat" : "Start Hot Seat"}
          </Button>
        </div>
      )}
    </section>
  );
}

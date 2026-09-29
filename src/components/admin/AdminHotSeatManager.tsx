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
  const [breakContent, setBreakContent] = useState<any[]>([]);
  const [breakTitle, setBreakTitle] = useState("");
  const [breakType, setBreakType] = useState("movie");
  const [breakUrl, setBreakUrl] = useState("");
  const [earnings, setEarnings] = useState({ gross: 0, hostShare: 0 });
  const [providerConfig, setProviderConfig] = useState<any>({});
  const [providerSaving, setProviderSaving] = useState(false);
  const [awsSecret, setAwsSecret] = useState("");
  const [zegoSecret, setZegoSecret] = useState("");
  const [pushJson, setPushJson] = useState("");

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
      const { data: earn } = await supabase.from("hot_seat_host_earnings").select("gross_bc,host_share_bc").eq("host_id", data.id);
      setEarnings((earn ?? []).reduce((a:any,x:any)=>({ gross:a.gross+Number(x.gross_bc||0), hostShare:a.hostShare+Number(x.host_share_bc||0) }), { gross:0, hostShare:0 }));

      const { data: slots } = await supabase.from("hot_seat_session_hosts").select("*").eq("session_id", data.id).eq("is_active", true).order("host_order");
      setSessionHosts(slots ?? []);
    } else setSessionHosts([]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void (async () => {
      const { data } = await (supabase as any).rpc("admin_get_hot_seat_provider_settings");
      if (data) setProviderConfig(data);
    })();
    void (async () => {
      const { data } = await supabase
        .from("hot_seat_presence_settings")
        .select("enabled")
        .eq("id", true)
        .maybeSingle();
      setPresenceEnabled(Boolean(data?.enabled));
    })();
    void (async () => {
      const { data } = await supabase.from("hot_seat_break_content").select("*").order("sort_order", { ascending: true });
      setBreakContent(data ?? []);
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

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div>
          <b className="text-sm">Hot Seat provider & API settings</b>
          <p className="mt-1 text-xs text-muted-foreground">Leave these blank until you have the provider accounts. Secrets are stored securely and are never displayed back.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="YouTube API key (optional)" value={providerConfig.youtube_api_key ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,youtube_api_key:e.target.value}))} />
          <Input placeholder="AWS region" value={providerConfig.aws_region ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,aws_region:e.target.value}))} />
          <Input placeholder="AWS IVS channel ARN" value={providerConfig.aws_channel_arn ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,aws_channel_arn:e.target.value}))} />
          <Input placeholder="AWS playback URL" value={providerConfig.aws_playback_url ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,aws_playback_url:e.target.value}))} />
          <Input placeholder="AWS access key ID" value={providerConfig.aws_access_key_id ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,aws_access_key_id:e.target.value}))} />
          <Input type="password" placeholder={providerConfig.aws_access_key_configured ? "AWS secret already saved — leave blank" : "AWS secret access key"} value={awsSecret} onChange={e=>setAwsSecret(e.target.value)} />
          <Input placeholder="ZEGOCLOUD App ID" value={providerConfig.zegocloud_app_id ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,zegocloud_app_id:e.target.value}))} />
          <Input placeholder="ZEGOCLOUD server URL" value={providerConfig.zegocloud_server_url ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,zegocloud_server_url:e.target.value}))} />
          <Input type="password" placeholder={providerConfig.zegocloud_server_secret_configured ? "ZEGOCLOUD secret already saved — leave blank" : "ZEGOCLOUD server secret"} value={zegoSecret} onChange={e=>setZegoSecret(e.target.value)} />
          <Input placeholder="Push project ID" value={providerConfig.push_project_id ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,push_project_id:e.target.value}))} />
          <Input placeholder="Push client email" value={providerConfig.push_client_email ?? ""} onChange={e=>setProviderConfig((x:any)=>({...x,push_client_email:e.target.value}))} />
          <Input className="sm:col-span-2" type="password" placeholder={providerConfig.push_credentials_configured ? "Push credentials already saved — leave blank" : "Push service credentials JSON"} value={pushJson} onChange={e=>setPushJson(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <label><input type="checkbox" checked={providerConfig.youtube_enabled !== false} onChange={e=>setProviderConfig((x:any)=>({...x,youtube_enabled:e.target.checked}))}/> YouTube</label>
          <label><input type="checkbox" checked={Boolean(providerConfig.aws_enabled)} onChange={e=>setProviderConfig((x:any)=>({...x,aws_enabled:e.target.checked}))}/> AWS</label>
          <label><input type="checkbox" checked={Boolean(providerConfig.zegocloud_enabled)} onChange={e=>setProviderConfig((x:any)=>({...x,zegocloud_enabled:e.target.checked}))}/> ZEGOCLOUD</label>
          <label><input type="checkbox" checked={Boolean(providerConfig.push_enabled)} onChange={e=>setProviderConfig((x:any)=>({...x,push_enabled:e.target.checked}))}/> Push notifications</label>
        </div>
        <Button disabled={providerSaving} onClick={async()=>{
          setProviderSaving(true);
          const {data,error}=await (supabase as any).rpc("admin_save_hot_seat_provider_settings",{
            p_youtube_enabled:providerConfig.youtube_enabled !== false,p_youtube_api_key:providerConfig.youtube_api_key ?? null,
            p_aws_enabled:Boolean(providerConfig.aws_enabled),p_aws_region:providerConfig.aws_region ?? "",p_aws_channel_arn:providerConfig.aws_channel_arn ?? "",p_aws_playback_url:providerConfig.aws_playback_url ?? "",p_aws_access_key_id:providerConfig.aws_access_key_id ?? "",p_aws_secret_access_key:awsSecret || null,
            p_zegocloud_enabled:Boolean(providerConfig.zegocloud_enabled),p_zegocloud_app_id:providerConfig.zegocloud_app_id ?? "",p_zegocloud_server_url:providerConfig.zegocloud_server_url ?? "",p_zegocloud_server_secret:zegoSecret || null,
            p_push_enabled:Boolean(providerConfig.push_enabled),p_push_project_id:providerConfig.push_project_id ?? "",p_push_client_email:providerConfig.push_client_email ?? "",p_push_credentials_json:pushJson || null
          });
          setProviderSaving(false);
          if(error) toast.error(error.message); else { setProviderConfig(data ?? providerConfig); setAwsSecret(""); setZegoSecret(""); setPushJson(""); toast.success("Hot Seat provider settings saved"); }
        }}>Save provider settings</Button>
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

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div>
          <b className="text-sm">Water-break Break Lounge</b>
          <p className="mt-1 text-xs text-muted-foreground">Control the giveaway, movie, comedy, music, poll and investment slots shown during the mandatory break.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input placeholder="Activity title" value={breakTitle} onChange={e => setBreakTitle(e.target.value)} />
          <select value={breakType} onChange={e => setBreakType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="giveaway">Giveaway</option><option value="movie">Movie</option><option value="comedy">Comedy</option><option value="music">Music</option><option value="poll">Poll</option><option value="investment">Investment game</option>
          </select>
          <Input placeholder="Destination URL (optional)" value={breakUrl} onChange={e => setBreakUrl(e.target.value)} />
        </div>
        <Button disabled={!breakTitle.trim()} onClick={async () => {
          const { data, error } = await (supabase as any).rpc("admin_hot_seat_break_content_upsert", {
            p_title: breakTitle.trim(), p_content_type: breakType, p_action_url: breakUrl.trim() || null,
            p_enabled: true, p_sort_order: breakContent.length + 1
          });
          if (error) toast.error(error.message); else { setBreakContent(prev => [...prev, data]); setBreakTitle(""); setBreakUrl(""); toast.success("Break activity added"); }
        }}>Add break activity</Button>
        <div className="grid gap-2">
          {breakContent.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
              <div className="min-w-0"><div className="text-xs font-bold truncate">{item.title}</div><div className="text-[10px] text-muted-foreground">{item.content_type} · {item.enabled ? "enabled" : "off"}</div></div>
              <button type="button" className="text-xs text-red-400" onClick={async () => {
                const { error } = await (supabase as any).rpc("admin_hot_seat_break_content_delete", { p_id: item.id });
                if (error) toast.error(error.message); else { setBreakContent(prev => prev.filter(x => x.id !== item.id)); toast.success("Break activity removed"); }
              }}>Remove</button>
            </div>
          ))}
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
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gift economy</div>
              <div className="mt-1 text-lg font-black">{earnings.gross.toLocaleString()} BC</div>
            </div>
            <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Host 20% share</div>
              <div className="mt-1 text-lg font-black text-orange-300">{earnings.hostShare.toLocaleString()} BC</div>
            </div>
          </div>

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

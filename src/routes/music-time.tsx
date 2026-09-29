import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Music, Play, Square } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/music-time")({ component: MusicTimePage });
function MusicTimePage() {
  const { syncCoins } = useStore();
  const [ready, setReady] = useState(false); const [playing, setPlaying] = useState(false); const [connected, setConnected] = useState(false); const [track, setTrack] = useState<{title?:string;artist?:string;externalId?:string;artworkUrl?:string}|null>(null);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? ""; setReady(Boolean(id));
    const storedToken = sessionStorage.getItem("cp_spotify_token");
    if (storedToken) { tokenRef.current = storedToken; setConnected(true); }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    const returnedState = params.get("state");
    const expectedState = sessionStorage.getItem("cp_spotify_state");
    if (oauthError) { toast.error(`Spotify authorization was not completed: ${oauthError}`); window.history.replaceState({}, "", "/music-time"); return; }
    if (code && (!returnedState || !expectedState || returnedState !== expectedState)) { toast.error("Spotify authorization could not be verified. Please reconnect."); window.history.replaceState({}, "", "/music-time"); return; }
    const verifier = sessionStorage.getItem("cp_spotify_verifier");
    if (!code || !verifier || !id) return;
    void (async () => {
      const body = new URLSearchParams({ client_id: id, grant_type: "authorization_code", code, redirect_uri: `${window.location.origin}/music-time`, code_verifier: verifier });
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!tokenRes.ok) return;
      const token = await tokenRes.json(); sessionStorage.setItem("cp_spotify_token", token.access_token); if (token.refresh_token) sessionStorage.setItem("cp_spotify_refresh_token", token.refresh_token); if (token.expires_in) sessionStorage.setItem("cp_spotify_expires_at", String(Date.now() + Number(token.expires_in) * 1000)); tokenRef.current = token.access_token; setConnected(true); sessionStorage.removeItem("cp_spotify_verifier"); sessionStorage.removeItem("cp_spotify_state");
      window.history.replaceState({}, "", "/music-time");
      const now = await fetch("https://api.spotify.com/v1/me/player", { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (now.ok) { const data = await now.json(); const item = data?.item; if (item) { setTrack({ title: item.name, artist: item.artists?.map((a:any)=>a.name).join(", "), externalId:item.id, artworkUrl:item.album?.images?.[0]?.url }); setPlaying(Boolean(data?.is_playing)); } }
    })().catch(() => {});
  }, []);
  const refreshSpotifyToken = async () => {
    const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
    const refreshToken = sessionStorage.getItem("cp_spotify_refresh_token");
    if (!id || !refreshToken) return null;
    const body = new URLSearchParams({ client_id: id, grant_type: "refresh_token", refresh_token: refreshToken });
    const res = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!res.ok) return null;
    const token = await res.json();
    if (!token.access_token) return null;
    sessionStorage.setItem("cp_spotify_token", token.access_token);
    if (token.refresh_token) sessionStorage.setItem("cp_spotify_refresh_token", token.refresh_token);
    if (token.expires_in) sessionStorage.setItem("cp_spotify_expires_at", String(Date.now() + Number(token.expires_in) * 1000));
    tokenRef.current = token.access_token;
    return token.access_token;
  };
  const getValidToken = async () => {
    const token = tokenRef.current ?? sessionStorage.getItem("cp_spotify_token");
    const expiresAt = Number(sessionStorage.getItem("cp_spotify_expires_at") ?? 0);
    if (token && (!expiresAt || Date.now() < expiresAt - 60000)) return token;
    return await refreshSpotifyToken();
  };
  const connect = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
    if (!clientId) return;
    const verifierBytes = new Uint8Array(32); crypto.getRandomValues(verifierBytes); const verifier = btoa(String.fromCharCode(...verifierBytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    sessionStorage.setItem("cp_spotify_verifier", verifier);
    const stateBytes = new Uint8Array(24); crypto.getRandomValues(stateBytes);
    const state = btoa(String.fromCharCode(...stateBytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    sessionStorage.setItem("cp_spotify_state", state);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const params = new URLSearchParams({ client_id: clientId, response_type: "code", state, redirect_uri: `${window.location.origin}/music-time`, code_challenge_method: "S256", code_challenge: challenge, scope: "user-read-playback-state user-read-currently-playing user-modify-playback-state" });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };
  const disconnect = () => {
    tokenRef.current = null;
    ["cp_spotify_token", "cp_spotify_refresh_token", "cp_spotify_expires_at", "cp_spotify_verifier", "cp_spotify_state"].forEach((key) => sessionStorage.removeItem(key));
    setConnected(false); setPlaying(false); setTrack(null);
    toast.success("Spotify disconnected from this Circle Panda session.");
  };
  const play = async () => {
    let token = await getValidToken();
    if (!token) { if (!import.meta.env.VITE_SPOTIFY_CLIENT_ID) return; await connect(); return; }
    let resume = await fetch("https://api.spotify.com/v1/me/player/play", { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    if (resume.status === 401) { token = await refreshSpotifyToken(); if (token) resume = await fetch("https://api.spotify.com/v1/me/player/play", { method: "PUT", headers: { Authorization: `Bearer ${token}` } }); }
    if (!resume.ok && resume.status !== 204) { toast.error("Spotify could not start playback. Open Spotify on an active device and try again."); return; }
    const { data, error } = await (supabase as any).rpc("start_music_session_secure", { p_provider:"spotify", p_external_id:track?.externalId ?? null, p_title:track?.title ?? null, p_artist:track?.artist ?? null, p_artwork_url:track?.artworkUrl ?? null });
    if (error) { toast.error(error.message ?? "Music session could not start"); return; }
    setPlaying(true);
    toast.success("Music Time started 🎵", { description: "Your Spotify session is being tracked securely." });
    void data;
  };
  const stop = async () => {
    const token = await getValidToken();
    if (token) await fetch("https://api.spotify.com/v1/me/player/pause", { method:"PUT", headers:{Authorization:`Bearer ${token}`} }).catch(()=>{});
    const { data, error } = await (supabase as any).rpc("stop_music_session_secure");
    if (error) { toast.error(error.message ?? "Music session could not stop"); return; }
    setPlaying(false);
    await syncCoins();
    if (Number(data?.duration_seconds ?? 0) >= 60) toast.success("Music Time complete 🎵", { description:`+${Number(data?.reward_xp ?? 0)} XP · +${Number(data?.reward_bc ?? 0)} BC` });
  };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(async () => {
      const token = await getValidToken();
      if (!token) return;
      const res = await fetch("https://api.spotify.com/v1/me/player", { headers:{Authorization:`Bearer ${token}`} }).catch(()=>null);
      if (!res || !res.ok) return;
      const data = await res.json(); const item=data?.item;
      if (item) setTrack({title:item.name,artist:item.artists?.map((a:any)=>a.name).join(", "),externalId:item.id,artworkUrl:item.album?.images?.[0]?.url});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing]);
  return <AppShell title="Music Time" subtitle="Connect Spotify and keep your music session synced with Circle Panda."><div className="mx-auto max-w-xl panda-panel rounded-3xl p-6"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-primary/10"><Music className="size-6 text-primary"/></span><div><h2 className="font-display text-xl font-semibold">Spotify Music Time</h2><p className="text-sm text-muted-foreground">Playback, session timing and rewards are recorded through the production backend.</p></div></div>{!ready ? <div className="mt-5 rounded-xl border border-border p-4"><p className="text-sm font-medium">Spotify is not configured yet.</p><p className="mt-1 text-xs text-muted-foreground">Circle Panda needs its production Spotify client ID configured by deployment before Music Time can connect.</p></div> : <Button className="mt-6 w-full" onClick={connect}>{connected ? "Reconnect Spotify" : "Connect Spotify"}</Button>}<div className="mt-4 rounded-2xl border border-border/70 bg-secondary/30 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Current Spotify track</p><p className="mt-1 font-semibold">{track?.title ?? "Nothing playing"}</p><p className="text-sm text-muted-foreground">{track?.artist ?? "Start playback in Spotify, then start Music Time."}</p></div><Button variant="outline" className="mt-4 w-full gap-2" onClick={play} disabled={playing || !ready}><Play className="size-4"/>{playing ? "Music Time active" : "Start Music Time"}</Button>{playing ? <Button variant="ghost" className="mt-2 w-full gap-2" onClick={stop}><Square className="size-4"/> Stop session & collect rewards</Button> : null}<Button variant="ghost" className="mt-2 w-full" onClick={disconnect} disabled={!connected}>Disconnect Spotify</Button></div><div className="mt-5"><StandardBannerAd variant="feed-card" placement="music_time_inline" /></div></AppShell>;
}

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = { callId: string | null; incoming?: boolean; onClose: () => void };

export function VipPrivateCall({ callId, incoming = false, onClose }: Props) {
  const [accepted, setAccepted] = useState(!incoming);
  const [type, setType] = useState<"voice"|"video">("voice");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [remoteOffer, setRemoteOffer] = useState<any>(null);
  const [remoteAnswer, setRemoteAnswer] = useState<any>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const seenCandidates = useRef(new Set<string>());
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!callId || !accepted) return;
    let dead = false;
    const run = async () => {
      const { data: session } = await (supabase as any).rpc("get_vip_call", { p_call_id: callId });
      if (!session || dead) return;
      setType(session.call_type === "video" ? "video" : "voice");
      const initiator = Boolean(session.caller_id && session.caller_id === (await supabase.auth.getUser()).data.user?.id);
      const connection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.current = connection;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: session.call_type === "video" });
      localStream.current = stream;
      stream.getTracks().forEach(t => connection.addTrack(t, stream));
      connection.ontrack = e => { if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0]; setConnected(true); };
      connection.onicecandidate = e => { if (e.candidate) void (supabase as any).rpc("add_vip_call_candidate", { p_call_id: callId, p_candidate: e.candidate.toJSON() }); };
      if (initiator) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await (supabase as any).rpc("set_vip_call_offer", { p_call_id: callId, p_offer: offer });
      }
      const timer = window.setInterval(async () => {
        const { data: s } = await (supabase as any).rpc("get_vip_call", { p_call_id: callId });
        if (!s || dead) return;
        if (!initiator && s.offer && !remoteOffer) {
          setRemoteOffer(s.offer);
          await connection.setRemoteDescription(s.offer);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await (supabase as any).rpc("set_vip_call_answer", { p_call_id: callId, p_answer: answer });
        }
        if (initiator && s.answer && !remoteAnswer) {
          setRemoteAnswer(s.answer);
          await connection.setRemoteDescription(s.answer);
        }
        const { data: candidates } = await (supabase as any).rpc("get_vip_call_candidates", { p_call_id: callId });
        for (const c of candidates ?? []) {
          const key = JSON.stringify(c.candidate);
          if (c.sender_id === (await supabase.auth.getUser()).data.user?.id || seenCandidates.current.has(key)) continue;
          seenCandidates.current.add(key);
          try { await connection.addIceCandidate(c.candidate); } catch {}
        }
      }, 1000);
      return () => window.clearInterval(timer);
    };
    let cleanup: (()=>void)|undefined;
    void run().then(x=>{cleanup=x;}).catch(e=>{ if(!dead) toast.error(e?.message ?? "Could not start the VIP call"); onClose(); });
    return () => { dead=true; cleanup?.(); localStream.current?.getTracks().forEach(t=>t.stop()); pc.current?.close(); pc.current=null; };
  }, [callId, accepted]);

  if (!callId) return null;
  const end = async () => {
    await (supabase as any).rpc("end_vip_private_call", { p_call_id: callId, p_status: "ended" });
    onClose();
  };
  const accept = async () => setAccepted(true);

  return <Dialog open={!!callId} onOpenChange={open=>{ if(!open) void end(); }}>
    <DialogContent className="max-w-md border-primary/30 bg-background p-0 overflow-hidden">
      <DialogTitle className="sr-only">VIP private call</DialogTitle>
      <div className="relative min-h-[520px] bg-black">
        <video ref={remoteVideo} autoPlay playsInline className={type==="video" ? "absolute inset-0 size-full object-cover" : "hidden"} />
        {!connected && <div className="absolute inset-0 grid place-items-center text-center text-white"><div><div className="mx-auto mb-3 grid size-20 place-items-center rounded-full bg-primary/20 text-4xl">🐼</div><p className="font-bold">{incoming ? "Incoming VIP call" : "Calling VIP…"}</p><p className="mt-1 text-xs text-white/60">Private VIP-to-VIP call</p></div></div>}
        {type==="voice" && connected && <div className="absolute inset-0 grid place-items-center text-white"><div className="text-5xl">🐼</div></div>}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3">
          {incoming && !accepted ? <>
            <Button onClick={accept} className="size-12 rounded-full bg-green-600"><Phone className="size-5"/></Button>
            <Button onClick={()=>void end()} className="size-12 rounded-full bg-red-600"><PhoneOff className="size-5"/></Button>
          </> : <>
            <Button onClick={()=>{localStream.current?.getAudioTracks().forEach(t=>t.enabled=!t.enabled);setMuted(x=>!x)}} className="size-12 rounded-full">{muted?<MicOff/>:<Mic/>}</Button>
            {type==="video" && <Button onClick={()=>{localStream.current?.getVideoTracks().forEach(t=>t.enabled=!t.enabled);setCamera(x=>!x)}} className="size-12 rounded-full">{camera?<Video/>:<VideoOff/>}</Button>}
            <Button onClick={()=>void end()} className="size-12 rounded-full bg-red-600"><PhoneOff/></Button>
          </>}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

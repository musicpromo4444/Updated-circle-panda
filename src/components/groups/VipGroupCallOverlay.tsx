import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayableVideoAd } from "@/components/ads/PlayableVideoAd";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props={type:"voice"|"video";groupId:string;onClose:()=>void};

export function VipGroupCallOverlay({type,groupId,onClose}:Props){
  const [userId,setUserId]=useState<string|null>(null);
  const [muted,setMuted]=useState(false);
  const [cameraOff,setCameraOff]=useState(type==="voice");
  const [remote,setRemote]=useState<Record<string,MediaStream>>({});
  const localRef=useRef<HTMLVideoElement>(null);
  const localStream=useRef<MediaStream|null>(null);
  const peers=useRef(new Map<string,RTCPeerConnection>());
  const channel=useRef<any>(null);
  const pendingCandidates=useRef(new Map<string,RTCIceCandidateInit[]>());
  const [elapsed,setElapsed]=useState(0);
  const [extensionOpen,setExtensionOpen]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [remoteAccepted,setRemoteAccepted]=useState<string[]>([]);
  const [adOpen,setAdOpen]=useState(false);
  const [participants,setParticipants]=useState<string[]>([]);

  useEffect(()=>{
    let cancelled=false;
    const timer=window.setInterval(()=>setElapsed(v=>v+1),1000);
    void (async()=>{
      const uid=(await supabase.auth.getUser()).data.user?.id;
      if(!uid||cancelled){if(!uid)toast.error("Sign in to join the VIP call");return;}
      setUserId(uid);
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});
        localStream.current=stream;
        if(localRef.current){localRef.current.srcObject=stream;localRef.current.muted=true;}
        const ch=supabase.channel("vip-group-call:"+groupId,{config:{broadcast:{self:false},presence:{key:uid}}});
        channel.current=ch;
        const send=(event:string,payload:any)=>void ch.send({type:"broadcast",event,payload:{...payload,from:uid}});
        const makePeer=async(peerId:string,offer:boolean)=>{
          if(peers.current.has(peerId))return peers.current.get(peerId)!;
          const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
          peers.current.set(peerId,pc);
          stream.getTracks().forEach(t=>pc.addTrack(t,stream));
          pc.ontrack=e=>{const s=e.streams[0];if(s)setRemote(v=>({...v,[peerId]:s}));};
          pc.onicecandidate=e=>{if(e.candidate)send("ice",{to:peerId,candidate:e.candidate.toJSON()});};
          pc.onconnectionstatechange=()=>{if(["failed","closed","disconnected"].includes(pc.connectionState)){pc.close();peers.current.delete(peerId);setRemote(v=>{const n={...v};delete n[peerId];return n;});}};
          if(offer){const o=await pc.createOffer();await pc.setLocalDescription(o);send("offer",{to:peerId,description:pc.localDescription});}
          return pc;
        };
        ch.on("broadcast",{event:"offer"},async({payload}:any)=>{
          if(payload.to!==uid)return;
          const pc=await makePeer(payload.from,false);
          await pc.setRemoteDescription(payload.description);
          const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
          send("answer",{to:payload.from,description:pc.localDescription});
          const q=pendingCandidates.current.get(payload.from)||[];for(const x of q)await pc.addIceCandidate(x).catch(()=>{});pendingCandidates.current.delete(payload.from);
        }).on("broadcast",{event:"answer"},async({payload}:any)=>{
          if(payload.to!==uid)return;const pc=peers.current.get(payload.from);if(pc&&!pc.currentRemoteDescription)await pc.setRemoteDescription(payload.description);
        }).on("broadcast",{event:"ice"},async({payload}:any)=>{
          if(payload.to!==uid)return;const pc=peers.current.get(payload.from);if(pc?.remoteDescription)await pc.addIceCandidate(payload.candidate).catch(()=>{});else pendingCandidates.current.set(payload.from,[...(pendingCandidates.current.get(payload.from)||[]),payload.candidate]);
        }).on("presence",{event:"sync"},async()=>{
          const state=ch.presenceState();const ids=Object.keys(state).filter(id=>id!==uid);
          for(const id of ids)if(uid<id)await makePeer(id,true);
        }).on("presence",{event:"join"},async({key}:any)=>{if(key&&uid<key)await makePeer(key,true);})
        .subscribe(async status=>{if(status==="SUBSCRIBED")await ch.track({joined_at:Date.now()});});
      }catch(e:any){toast.error(e?.message??"Could not open the call");onClose();}
    })();
    return()=>{cancelled=true;window.clearInterval(timer);localStream.current?.getTracks().forEach(t=>t.stop());peers.current.forEach(p=>p.close());peers.current.clear();if(channel.current)void supabase.removeChannel(channel.current);};
  },[type,groupId]);

  const acceptContinuation=()=>{
    if(!channel.current||!userId)return;
    setAccepted(true);
    void channel.current.send({type:"broadcast",event:"continue-intent",payload:{from:userId}});
  };
  const otherParticipants=participants.filter(id=>id!==userId);
  const allAccepted=accepted && otherParticipants.every(id=>remoteAccepted.includes(id));
  useEffect(()=>{
    if(elapsed>=1200&&!extensionOpen&&!adOpen){setExtensionOpen(true);toast("20 minutes reached", {description:"Everyone must accept the sponsored continuation before the VIP call continues."});}
  },[elapsed,extensionOpen,adOpen]);
  useEffect(()=>{
    if(extensionOpen&&allAccepted){setExtensionOpen(false);setAdOpen(true);}
  },[extensionOpen,allAccepted]);

  return <div className="fixed inset-0 z-[120] flex flex-col bg-black">
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white"><div><p className="font-bold">VIP {type==="video"?"Video":"Voice"} Call</p><p className="text-xs text-white/60">Private VIP group call</p></div><span className="text-xs text-white/60">{Object.keys(remote).length+1} connected</span></div>
    {extensionOpen?<div className="absolute inset-0 z-[140] grid place-items-center bg-black/80 p-5"><div className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-zinc-950 p-5 text-center text-white shadow-2xl"><div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-500/15 text-2xl">👑</div><h2 className="mt-3 font-bold">Continue VIP call?</h2><p className="mt-2 text-sm text-white/65">The first 20 minutes are complete. All connected VIP members must accept the sponsored continuation.</p><p className="mt-3 text-xs text-amber-300">{accepted?"Waiting for the other VIP member…":"You have not accepted yet."}</p><Button className="mt-4 w-full bg-amber-500 text-black hover:bg-amber-400" disabled={accepted} onClick={acceptContinuation}>{accepted?"Accepted":"Accept & continue"}</Button></div></div>:null}
    {adOpen?<div className="absolute inset-0 z-[150] grid place-items-center bg-black p-4"><div className="w-full max-w-md"><p className="mb-3 text-center text-xs font-semibold text-white/70">Sponsored continuation</p><PlayableVideoAd placement="vip_group_call_continuation" variant="card" onComplete={()=>setAdOpen(false)}/></div></div>:null}
    <div className="min-h-0 flex-1 overflow-auto p-3"><div className={type==="video"?"grid gap-3 sm:grid-cols-2":""}>
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900">{type==="video"?<video ref={localRef} autoPlay playsInline className="aspect-video w-full object-cover"/>:<div className="grid aspect-video place-items-center"><span className="text-5xl">🐼</span></div>}<span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">You</span></div>
      {Object.entries(remote).map(([id,stream])=><Remote key={id} id={id} stream={stream} video={type==="video"}/>)}
    </div></div>
    <div className="flex justify-center gap-3 border-t border-white/10 bg-black/90 p-4">
      <Button variant="secondary" size="icon" onClick={()=>{localStream.current?.getAudioTracks().forEach(t=>t.enabled=muted);setMuted(v=>!v)}}>{muted?<MicOff/>:<Mic/>}</Button>
      {type==="video"?<Button variant="secondary" size="icon" onClick={()=>{localStream.current?.getVideoTracks().forEach(t=>t.enabled=cameraOff);setCameraOff(v=>!v)}}>{cameraOff?<VideoOff/>:<Video/>}</Button>:null}
      <Button variant="destructive" size="icon" onClick={onClose}><PhoneOff/></Button>
    </div>
  </div>;
}
function Remote({id,stream,video}:{id:string;stream:MediaStream;video:boolean}){
  const ref=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(ref.current)ref.current.srcObject=stream},[stream]);
  return <div className="relative overflow-hidden rounded-3xl bg-zinc-900"><video ref={ref} autoPlay playsInline className={video?"aspect-video w-full object-cover":"hidden"}/>{!video?<div className="grid aspect-video place-items-center"><span className="text-4xl">🐼</span></div>:null}<span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">{id.slice(0,8)}</span></div>;
}

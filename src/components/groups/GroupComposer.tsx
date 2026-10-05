import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Mic, Send, Square, Video, X, Pause, Play, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type OutgoingGroupMedia = {
  type: "image" | "video" | "audio";
  file: File;
  durationSeconds?: number;
  viewOnce?: boolean;
};

export function GroupComposer({
  disabled,
  placeholder = "Message…",
  onSendText,
  onSendMedia,
  allowViewOnce = false,
}: {
  disabled?: boolean;
  placeholder?: string;
  onSendText: (body: string) => Promise<void> | void;
  onSendMedia: (media: OutgoingGroupMedia) => Promise<void>;
  allowViewOnce?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{ type: "image" | "video"; file: File; previewUrl: string } | null>(null);
  const [pendingViewOnce, setPendingViewOnce] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const clearVoice = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setVoiceBlob(null);
    setRecording(false);
    setPaused(false);
    setStopped(false);
    setSeconds(0);
    startedAtRef.current = null;
    elapsedBeforePauseRef.current = 0;
  };

  useEffect(() => () => clearVoice(), []);

  const pick = async (file: File | undefined, type: "image" | "video") => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Media must be 25 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPendingMedia({ type, file, previewUrl: url });
    setPendingViewOnce(allowViewOnce ? false : false);
  };

  const clearPendingMedia = () => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
    setPendingViewOnce(false);
  };

  const sendPendingMedia = async () => {
    if (!pendingMedia || disabled) return;
    const media = pendingMedia;
    try {
      await onSendMedia({ type: media.type, file: media.file, viewOnce: allowViewOnce && pendingViewOnce });
      clearPendingMedia();
    } catch {
      // Keep the preview available if the upload/send fails so the user can retry.
    }
  };

  const startRecording = async () => {
    if (disabled || recording || voiceBlob) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Voice recording is not supported on this device/browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => MediaRecorder.isTypeSupported(x));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { clearVoice(); return; }
        setVoiceBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
        setPaused(false);
        setStopped(true);
        recorderRef.current = null;
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start(250);
      startedAtRef.current = Date.now();
      elapsedBeforePauseRef.current = 0;
      setSeconds(0);
      setRecording(true);
      setPaused(false);
      setStopped(false);
      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current !== null) {
          setSeconds(elapsedBeforePauseRef.current + Math.floor((Date.now() - startedAtRef.current) / 1000));
        }
      }, 250);
    } catch {
      toast.error("Microphone permission is required for voice notes.");
    }
  };

  const pauseResume = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      elapsedBeforePauseRef.current = seconds;
      startedAtRef.current = null;
      setPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      startedAtRef.current = Date.now();
      setPaused(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recorder.state === "recording") elapsedBeforePauseRef.current = seconds;
    recorder.stop();
  };

  const sendVoice = async () => {
    if (!voiceBlob || disabled) return;
    const file = new File([voiceBlob], `voice-${Date.now()}.${voiceBlob.type.includes("mp4") ? "m4a" : "webm"}`, { type: voiceBlob.type || "audio/webm" });
    await onSendMedia({ type: "audio", file, durationSeconds: seconds });
    clearVoice();
  };

  const cancelVoice = () => clearVoice();

  useEffect(() => () => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
  }, [pendingMedia?.previewUrl]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); const text = draft.trim(); if (!text || disabled || recording || voiceBlob) return; setDraft(""); void onSendText(text); }} className="flex items-end gap-2">
      <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0], "image"); e.currentTarget.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0], "video"); e.currentTarget.value = ""; }} />

      {pendingMedia ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <button type="button" onClick={clearPendingMedia} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-black" aria-label="Remove selected media">
            {pendingMedia.type === "image" ? <img src={pendingMedia.previewUrl} alt="Selected photo" className="size-full object-cover" /> : <video src={pendingMedia.previewUrl} muted playsInline className="size-full object-cover" />}
            <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-white"><X className="size-3" /></span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{pendingMedia.type === "image" ? "Photo ready" : "Video ready"}</p>
            {allowViewOnce ? (
              <button type="button" onClick={() => setPendingViewOnce((v) => !v)} className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-[11px] font-semibold">
                {pendingViewOnce ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                {pendingViewOnce ? "View once" : "Reusable"}
              </button>
            ) : <span className="mt-1 block text-[11px] text-muted-foreground">Ready to send</span>}
          </div>
          <Button type="button" size="icon" onClick={() => void sendPendingMedia()} aria-label="Send selected media"><Send className="size-4" /></Button>
        </div>
      ) : recording || voiceBlob ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-2 py-1.5">
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={cancelVoice} aria-label="Delete voice recording"><X className="size-5" /></Button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">{recording ? (paused ? "Paused" : "Recording") : "Voice note ready"}</div>
            <div className="text-[11px] text-muted-foreground">00:{String(seconds).padStart(2, "0")}</div>
            {previewUrl ? <audio src={previewUrl} controls className="mt-1 h-8 w-full" /> : null}
          </div>
          {recording ? <Button type="button" variant="secondary" size="icon" onClick={pauseResume} aria-label={paused ? "Resume voice recording" : "Pause voice recording"}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button> : null}
          <Button type="button" variant="secondary" size="icon" onClick={stopRecording} disabled={!recording} aria-label="Stop voice recording"><Square className="size-4 fill-current" /></Button>
          <Button type="button" size="icon" onClick={() => void sendVoice()} disabled={!voiceBlob} aria-label="Send voice note"><Send className="size-4" /></Button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => imageInput.current?.click()} title="Photo"><ImageIcon className="size-5" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => videoInput.current?.click()} title="Video"><Video className="size-5" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => void startRecording()} title="Voice note"><Mic className="size-5" /></Button>
          </div>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled} placeholder={placeholder} maxLength={2000} className="min-w-0 flex-1 rounded-2xl" />
          <Button type="submit" size="icon" disabled={disabled || !draft.trim()} className="shrink-0 rounded-full"><Send className="size-4" /></Button>
        </>
      )}
    </form>
  );
}

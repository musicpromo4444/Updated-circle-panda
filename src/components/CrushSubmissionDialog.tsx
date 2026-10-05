import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Video, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CrushKind } from "@/lib/store";

export function CrushSubmissionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [pendingGender, setPendingGender] = useState<"male" | "female">("female");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [emoji, setEmoji] = useState("🐼");
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<"uploading" | "publishing" | "deleting" | null>(null);
  const [mySubmission, setMySubmission] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;
    void (supabase as any).rpc("get_my_profile_gender").then(({ data }: any) => {
      setGender(data === "male" || data === "female" ? data : null);
    });
    void loadMySubmission();
  }, [open]);

  const loadMySubmission = async () => {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const weekStart = new Date();
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
    const { data } = await (supabase as any).from("crush_nominees").select("id,media_url,media_type,kind,display_name,blurb").eq("user_id",uid).eq("week_start",weekStart.toISOString().slice(0,10)).maybeSingle();
    setMySubmission(data ?? null);
  };

  const kind: CrushKind = gender === "male" ? "mcm" : "wcw";

  const saveGender = async () => {
    const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender: pendingGender });
    if (error) { toast.error(error.message ?? "Gender could not be saved"); return; }
    setGender(data === "male" ? "male" : "female");
  };

  const deleteSubmission = async () => {
    if (!mySubmission || saving) return;
    if (!window.confirm("Delete your MCM/WCW submission and its uploaded media?")) return;
    setSaving(true); setStage("deleting");
    try {
      const { data, error } = await (supabase as any).rpc("delete_crush_submission", { p_nominee_id: mySubmission.id });
      if (error) throw error;
      const mediaUrl = String(data?.media_url ?? mySubmission.media_url ?? "");
      const marker = "/storage/v1/object/public/circle-panda-crush/";
      const at = mediaUrl.indexOf(marker);
      if (at >= 0) {
        const path = decodeURIComponent(mediaUrl.slice(at + marker.length).split("?")[0]);
        if (path) {
          const { error: storageError } = await supabase.storage.from("circle-panda-crush").remove([path]);
          if (storageError) toast.warning("Submission deleted, but its stored media could not be cleaned up automatically.");
        }
      }
      setMySubmission(null);
      toast.success("MCM/WCW submission deleted");
      onOpenChange(false);
      window.dispatchEvent(new Event("circle-panda-crush-refresh"));
    } catch (e:any) {
      toast.error(e?.message ?? "Submission could not be deleted");
    } finally {
      setSaving(false); setStage(null);
    }
  };

  const submit = async () => {
    if (!file) { toast.error("Choose a photo or video first"); return; }
    if (!gender) { toast.error("Choose your account gender first"); return; }
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) { toast.error("Please sign in first"); return; }

    setSaving(true);
    setStage("uploading");
    let path = "";
    try {
      let uploadFile = file;

      // Large phone-camera photos can be unnecessarily heavy. Compress only
      // large images before upload so mobile publishing does not stall.
      if (file.type.startsWith("image/") && file.size > 3 * 1024 * 1024) {
        try {
          const bitmap = await createImageBitmap(file);
          const maxSide = 1800;
          const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
            if (blob) uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
          }
          bitmap.close();
        } catch {
          // Keep the original file if this browser cannot compress it.
        }
      }

      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      path = uid + "/" + crypto.randomUUID() + "-" + safeName;
      const { error: uploadError } = await supabase.storage
        .from("circle-panda-crush")
        .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      setStage("publishing");
      const { data: publicData } = supabase.storage.from("circle-panda-crush").getPublicUrl(path);
      const mediaType = uploadFile.type.startsWith("video/") ? "video" : "image";
      const { error } = await (supabase as any).rpc("submit_crush_media_secure", {
        p_media_url: publicData.publicUrl,
        p_media_type: mediaType,
        p_caption: caption.trim(),
        p_emoji: emoji,
      });
      if (error) throw error;

      toast.success("Posted to " + (kind === "mcm" ? "Man Crush Monday" : "Woman Crush Wednesday") + " 💫");
      setFile(null);
      setCaption("");
      setEmoji("🐼");
      onOpenChange(false);
      window.dispatchEvent(new Event("circle-panda-crush-refresh"));
    } catch (e: any) {
      if (path) void supabase.storage.from("circle-panda-crush").remove([path]);
      toast.error(e?.message ?? "Your Crush post could not be published");
    } finally {
      setSaving(false);
      setStage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-display text-xl">Post to MCM / WCW</DialogTitle>
        <DialogDescription>
          Circle Panda automatically places your submission in the correct section from the gender on your account.
        </DialogDescription>

        {!gender ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Choose your account gender</p>
            <p className="mt-1 text-xs text-muted-foreground">Male posts go to MCM. Female posts go to WCW. This controls the destination automatically.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant={pendingGender === "female" ? "default" : "outline"} onClick={() => setPendingGender("female")}>Female → WCW</Button>
              <Button variant={pendingGender === "male" ? "default" : "outline"} onClick={() => setPendingGender("male")}>Male → MCM</Button>
            </div>
            <Button className="mt-3 w-full" onClick={() => void saveGender()}>Save & Continue</Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold">
              Posting destination: {kind === "mcm" ? "Man Crush Monday" : "Woman Crush Wednesday"}
            </div>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-secondary/30 p-4 text-center hover:bg-secondary/50">
              <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <>
                  <ImagePlus className="size-7 text-primary" />
                  <span className="mt-2 max-w-full truncate text-sm font-semibold">{file.name}</span>
                  <span className="text-[11px] text-muted-foreground">{file.type.startsWith("video/") ? "Video" : "Photo"} selected</span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-7 text-primary" />
                  <span className="mt-2 text-sm font-semibold">Choose a photo or video</span>
                  <span className="text-[11px] text-muted-foreground">Your personal Panda avatar remains separate.</span>
                </>
              )}
            </label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a short caption (optional)" className="min-h-20 resize-none" />
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Mood badge</p>
              <div className="flex gap-2">
                {["🐼","❤️","🔥","✨","😍","🌸"].map((e) => (
                  <button key={e} type="button" onClick={() => setEmoji(e)} className={`grid size-10 place-items-center rounded-full border text-lg ${emoji === e ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}>{e}</button>
                ))}
              </div>
            </div>
            {mySubmission ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-semibold">Your current {mySubmission.kind === "mcm" ? "MCM" : "WCW"} submission</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{mySubmission.display_name}</p>
                <Button type="button" variant="outline" disabled={saving} className="mt-2 w-full gap-2 text-destructive hover:bg-destructive/10" onClick={() => void deleteSubmission()}>
                  <Trash2 className="size-4" /> Delete my submission
                </Button>
              </div>
            ) : null}
            <Button disabled={saving || !file} className="w-full" onClick={() => void submit()}>
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> {stage === "uploading" ? "Uploading…" : stage === "deleting" ? "Deleting…" : "Publishing…"}</> : <><Video className="mr-2 size-4" /> Publish to {kind.toUpperCase()}</>}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

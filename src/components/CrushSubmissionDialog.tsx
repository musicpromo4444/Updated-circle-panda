import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Video } from "lucide-react";
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
  const [emoji, setEmoji] = useState("ð¼");
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<"uploading" | "publishing" | null>(null);

  useEffect(() => {
    if (!open) return;
    void (supabase as any).rpc("get_my_profile_gender").then(({ data }: any) => {
      setGender(data === "male" || data === "female" ? data : null);
    });
  }, [open]);

  const kind: CrushKind = gender === "male" ? "mcm" : "wcw";
  const saveGender = async () => {
    const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender: pendingGender });
    if (error) { toast.error(error.message ?? "Gender could not be saved"); return; }
    setGender(data === "male" ? "male" : "female");
  };

  const submit = async () => {
    if (!file) { toast.error("Choose a photo or video first"); return; }
    if (!gender) { toast.error("Choose your account gender first"); return; }
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) { toast.error("Please sign in first"); return; }
    setSaving(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${uid}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("circle-panda-crush").upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("circle-panda-crush").getPublicUrl(path);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { error } = await (supabase as any).rpc("submit_crush_media_secure", {
        p_media_url: publicData.publicUrl,
        p_media_type: mediaType,
        p_caption: caption.trim(),
        p_emoji: emoji,
      });
      if (error) throw error;
      toast.success(`Posted to ${kind === "mcm" ? "Man Crush Monday" : "Woman Crush Wednesday"} ð«`);
      setFile(null); setCaption(""); setEmoji("ð¼"); onOpenChange(false);
      window.dispatchEvent(new Event("circle-panda-crush-refresh"));
    } catch (e: any) {
      toast.error(e?.message ?? "Your Crush post could not be published");
    } finally { setSaving(false); setStage(null); }
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
              <Button variant={pendingGender === "female" ? "default" : "outline"} onClick={() => setPendingGender("female")}>Female â WCW</Button>
              <Button variant={pendingGender === "male" ? "default" : "outline"} onClick={() => setPendingGender("male")}>Male â MCM</Button>
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
              {file ? <><ImagePlus className="size-7 text-primary" /><span className="mt-2 max-w-full truncate text-sm font-semibold">{file.name}</span><span className="text-[11px] text-muted-foreground">{file.type.startsWith("video/") ? "Video" : "Photo"} selected</span></> : <><ImagePlus className="size-7 text-primary" /><span className="mt-2 text-sm font-semibold">Choose a photo or video</span><span className="text-[11px] text-muted-foreground">Your personal Panda avatar remains separate.</span></>}
            </label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a short caption (optional)" className="min-h-20 resize-none" />
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Mood badge</p>
              <div className="flex gap-2">{["ð¼","â¤ï¸","ð¥","â¨","ð","ð¸"].map((e)=><button key={e} type="button" onClick={()=>setEmoji(e)} className={`grid size-10 place-items-center rounded-full border text-lg ${emoji===e?"border-primary bg-primary/10":"border-border bg-secondary/40"}`}>{e}</button>)}</div>
            </div>
            <Button disabled={saving || !file} className="w-full" onClick={() => void submit()}>{saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Publishingâ¦</> : <><Video className="mr-2 size-4" /> Publish to {kind.toUpperCase()}</>}</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

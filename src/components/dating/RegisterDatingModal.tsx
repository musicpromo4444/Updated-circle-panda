import { useEffect, useState } from "react";
import { Heart, Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type DatingProfile } from "@/lib/store";

const PANDA_AVATARS = ["🐼", "🎋🐼", "🌙🐼", "✨🐼", "🎧🐼", "🕶️🐼", "❤️🐼", "🔥🐼", "🌸🐼", "🎨🐼", "🍫🐼", "☀️🐼"];
const INTERESTS = ["Books", "Late walks", "Vinyl", "Matcha", "Gaming", "Memes", "Baking", "Photography", "Live music", "Coffee", "Night drives", "Art galleries", "Football", "Travel", "Food", "Fitness"];
const LOOKING_FOR = ["Long-term relationship", "Something casual", "Friendship first", "Dating / getting to know people", "Not sure yet"];
const LIFESTYLE = ["Early bird", "Night owl", "Homebody", "Social butterfly", "Adventurous", "Work-focused", "Fitness-minded", "Creative"];
const PERSONALITY = ["Funny", "Romantic", "Quiet", "Confident", "Spontaneous", "Caring", "Ambitious", "Flirty", "Introverted", "Outgoing"];
const SEXUAL_EXPERIENCE = ["Novice", "Some experience", "Experienced", "Good in bed", "Prefer not to say"];
const INTIMACY = ["Take it slow", "Affectionate", "Open to exploring", "Prefer to discuss privately", "Prefer not to say"];

const emptyProfile: Omit<DatingProfile, "registeredAt" | "userId"> = {
  name: "Anonymous Panda", age: 24, vibe: "", emoji: "🐼", bio: "", interests: [], location: "", country: "", gender: "",
  relationshipGoal: "", lookingFor: [], lifestyle: [], personality: [], loveLanguage: "",
  smoking: "", drinking: "", children: "", education: "", occupation: "", sexualExperience: "",
  intimacyPreference: "", relationshipStatus: "single", heightCm: null, zodiac: "", favoriteDate: "", photoPath: "", blurredPhotoPath: "",
};

function Chips({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{values.map(v => <button key={v} type="button" onClick={() => onToggle(v)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected.includes(v) ? "bg-[var(--dating)] text-white" : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>{v}</button>)}</div>;
}

export function RegisterDatingModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { datingProfile, registerDatingProfile } = useStore();
  const [p, setP] = useState(emptyProfile);
  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (datingProfile) {
      const { registeredAt: _registeredAt, userId: _userId, ...rest } = datingProfile;
      setP({ ...emptyProfile, ...rest });
      setPhotoPreview(rest.blurredPhotoPath ? supabase.storage.from("dating-photo-blur").getPublicUrl(rest.blurredPhotoPath).data.publicUrl : null);
    } else { setP(emptyProfile); setPhotoPreview(null); }
    setPhotoFile(null);
  }, [datingProfile, open]);

  const toggle = (key: "interests" | "lookingFor" | "lifestyle" | "personality", value: string) => setP(s => ({ ...s, [key]: s[key].includes(value) ? s[key].filter(x => x !== value) : [...s[key], value] }));
  const set = (key: keyof typeof p, value: string | number | null) => setP(s => ({ ...s, [key]: value }));

  const makeBlurredCopy = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const size = 720;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare photo");
    const scale = Math.max(size / bitmap.width, size / bitmap.height) * 1.08;
    const w = bitmap.width * scale, h = bitmap.height * scale;
    ctx.filter = "blur(18px)";
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not blur photo")), "image/jpeg", 0.72));
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Photo must be 10MB or smaller"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p.age < 18 || !p.bio.trim() || !p.country.trim() || !p.gender.trim()) { toast.error("Choose your country and gender, confirm you are 18+, and write a short About."); return; }
    if (!photoFile && !p.photoPath) { toast.error("Upload a Dating photo"); return; }
    setUploadingPhoto(true);
    try {
      const { data: userRes } = await (supabase as any).auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("Sign in to upload your Dating photo");
      let photoPath = p.photoPath || "";
      let blurredPhotoPath = p.blurredPhotoPath || "";
      if (photoFile) {
        const ext = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
        const base = crypto.randomUUID();
        photoPath = uid + "/" + base + "." + ext;
        blurredPhotoPath = uid + "/" + base + ".jpg";
        const blurred = await makeBlurredCopy(photoFile);
        const originalUpload = await supabase.storage.from("dating-photos").upload(photoPath, photoFile, { contentType: photoFile.type, upsert: true });
        if (originalUpload.error) throw originalUpload.error;
        const blurUpload = await supabase.storage.from("dating-photo-blur").upload(blurredPhotoPath, blurred, { contentType: "image/jpeg", upsert: true });
        if (blurUpload.error) throw blurUpload.error;
      }
      registerDatingProfile({
        ...p, photoPath, blurredPhotoPath,
        name:p.name.trim(), bio:p.bio.trim(), vibe:p.vibe.trim(), location:p.country.trim(), country:p.country.trim(),
        gender:p.gender.trim(), occupation:p.occupation.trim(), education:p.education.trim(), favoriteDate:p.favoriteDate.trim()
      });
      toast.success(datingProfile ? "Dating profile updated 💗" : "🎉 Dating profile is live!");
      onOpenChange(false);
    } catch (err:any) {
      toast.error(err?.message ?? "Could not upload Dating photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl rounded-2xl p-6">
      <DialogHeader>
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--dating)_20%,transparent)] text-[var(--dating)]"><Heart className="size-5 fill-current" /></span><div><DialogTitle className="font-display text-xl font-bold">{datingProfile ? "Edit Dating Profile" : "Register for Dating"}</DialogTitle><DialogDescription className="text-xs">Adult-only anonymous dating. Your Circle Panda identity stays a generated Panda avatar — no personal profile photos.</DialogDescription></div></div>
      </DialogHeader>
      <div className="mb-3 flex gap-1">{["About", "Lifestyle", "Dating", "SEXUAL EXPERIENCE", "Finish"].map((x,i)=><button key={x} type="button" onClick={()=>setStep(i)} className={`h-1.5 flex-1 rounded-full ${i<=step ? "bg-[var(--dating)]" : "bg-secondary"}`} aria-label={`Step ${i+1}: ${x}`} />)}</div>
      <form onSubmit={submit} className="space-y-5">
        {step === 0 && <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--dating)]/25 bg-[var(--dating)]/5 p-4">
  <label className="mb-2 block text-sm font-black uppercase tracking-wide text-[var(--dating)]">Dating photo</label>
  <p className="mb-3 text-xs text-muted-foreground">Your photo is blurred for matches until both people complete the 72-hour confirmation. It is not your Circle Panda avatar.</p>
  <div className="flex items-center gap-3">
    <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-secondary/60">
      {photoPreview ? <img src={photoPreview} alt="Dating photo preview" className="size-full object-cover blur-md" /> : <ImageIcon className="size-8 text-muted-foreground" />}
    </div>
    <div className="flex-1">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--dating)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--dating)]/90">
        <Upload className="size-4" /> {photoFile ? "Change photo" : "Upload photo"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void choosePhoto(e.target.files?.[0])} />
      </label>
      <p className="mt-2 text-[10px] text-muted-foreground">JPG, PNG or WEBP · max 10MB</p>
    </div>
  </div>
</div><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panda Avatar</label><div className="flex flex-wrap gap-2">{PANDA_AVATARS.map(a=><button key={a} type="button" onClick={()=>set("emoji",a)} className={`grid size-12 place-items-center rounded-xl text-xl ${p.emoji===a ? "bg-[var(--dating)] text-white ring-2 ring-[var(--dating)]/40" : "bg-secondary/60"}`}>{a}</button>)}</div></div>
          <div className="grid grid-cols-3 gap-3"><div className="col-span-2"><label className="mb-1 block text-xs font-semibold">Panda name</label><Input value={p.name} readOnly disabled className="opacity-80" /><p className="mt-1 text-[10px] text-muted-foreground">Your Circle Panda name is permanent.</p></div><div><label className="mb-1 block text-xs font-semibold">Age</label><Input type="number" min={18} max={99} value={p.age} onChange={e=>set("age",Number(e.target.value))} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-semibold">Country</label><Input value={p.country} onChange={e=>{set("country",e.target.value);set("location",e.target.value)}} placeholder="Country" /></div><div><label className="mb-1 block text-xs font-semibold">Gender</label><select value={p.gender} onChange={e=>set("gender",e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Select</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Prefer not to say</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-semibold">Occupation</label><Input value={p.occupation} onChange={e=>set("occupation",e.target.value)} placeholder="What you do" /></div></div>
          <div><label className="mb-1 block text-xs font-semibold">About you</label><Textarea rows={4} value={p.bio} onChange={e=>set("bio",e.target.value)} placeholder="Tell people what you are like, what you enjoy, and what makes a good conversation." /></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Interests</label><Chips values={INTERESTS} selected={p.interests} onToggle={v=>toggle("interests",v)} /></div>
        </section>}
        {step === 1 && <section className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold">Your vibe</label><Input value={p.vibe} onChange={e=>set("vibe",e.target.value)} placeholder="Night owl · soft heart · football addict" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Personality</label><Chips values={PERSONALITY} selected={p.personality} onToggle={v=>toggle("personality",v)} /></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Lifestyle</label><Chips values={LIFESTYLE} selected={p.lifestyle} onToggle={v=>toggle("lifestyle",v)} /></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Smoking<select value={p.smoking} onChange={e=>set("smoking",e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Prefer not to say</option><option>Never</option><option>Sometimes</option><option>Yes</option></select></label><label className="text-xs font-semibold">Drinking<select value={p.drinking} onChange={e=>set("drinking",e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Prefer not to say</option><option>Never</option><option>Sometimes</option><option>Yes</option></select></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Children<select value={p.children} onChange={e=>set("children",e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Prefer not to say</option><option>No children</option><option>Have children</option><option>Want children</option><option>Don't want children</option></select></label><label className="text-xs font-semibold">Education<Input value={p.education} onChange={e=>set("education",e.target.value)} placeholder="Optional" /></label></div>
        </section>}
        {step === 2 && <section className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold">Relationship status</label><select value={p.relationshipStatus} onChange={e=>set("relationshipStatus",e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="single">Single</option><option value="complicated">It's complicated</option><option value="separated">Separated</option><option value="prefer_not_to_say">Prefer not to say</option></select></div>
          <div><label className="mb-1.5 block text-xs font-semibold">What are you looking for?</label><Chips values={LOOKING_FOR} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)} /></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Relationship goal</label><Input value={p.relationshipGoal} onChange={e=>set("relationshipGoal",e.target.value)} placeholder="e.g. serious relationship, see where it goes" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Love language</label><select value={p.loveLanguage} onChange={e=>set("loveLanguage",e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Prefer not to say</option><option>Words of affirmation</option><option>Quality time</option><option>Acts of service</option><option>Gifts</option><option>Physical touch</option></select></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Ideal first date</label><Input value={p.favoriteDate} onChange={e=>set("favoriteDate",e.target.value)} placeholder="Coffee, beach walk, game night…" /></div>
        </section>}
        {step === 3 && <section className="space-y-5">
          <div className="rounded-2xl border border-[var(--dating)]/20 bg-[var(--dating)]/5 p-4"><p className="font-black uppercase tracking-wide">SEXUAL EXPERIENCE</p><p className="mt-1 text-xs text-muted-foreground">Optional adult profile information. You control what you share on your card.</p></div>
          <div><label className="mb-1.5 block text-sm font-black uppercase tracking-wide">SEXUAL EXPERIENCE</label><div className="grid gap-2 sm:grid-cols-2">{SEXUAL_EXPERIENCE.map(v=><button type="button" key={v} onClick={()=>set("sexualExperience",v)} className={`rounded-xl border px-3 py-3 text-left text-sm ${p.sexualExperience===v ? "border-[var(--dating)] bg-[var(--dating)]/10 text-[var(--dating)]" : "border-border bg-background"}`}>{v}</button>)}</div></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Intimacy preference</label><Chips values={INTIMACY} selected={p.intimacyPreference ? [p.intimacyPreference] : []} onToggle={v=>set("intimacyPreference",v)} /></div>
        </section>}
        {step === 4 && <section className="space-y-4"><div className="rounded-2xl bg-secondary/50 p-4"><p className="font-display font-bold">Your dating card is ready</p><p className="mt-1 text-sm text-muted-foreground">Review your answers before publishing. You can update your answers, but your Panda name and country stay fixed.</p></div><div className="grid grid-cols-2 gap-2 text-sm">{[["Panda name",p.name],["Age",String(p.age)],["Country",p.country||"—"],["Gender",p.gender||"—"],["Vibe",p.vibe||"—"],["Looking for",p.relationshipGoal||p.lookingFor[0]||"—"],["Experience",p.sexualExperience||"Prefer not to say"],["Ideal date",p.favoriteDate||"—"]].map(([k,v])=><div key={k} className="rounded-xl border border-border p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-1 font-medium">{v}</p></div>)}</div></section>}
        <DialogFooter className="flex-row justify-between gap-2 pt-2"><Button type="button" variant="outline" onClick={()=>step===0?onOpenChange(false):setStep(step-1)}>{step===0?"Cancel":"Back"}</Button>{step<4?<Button type="button" onClick={()=>setStep(step+1)} className="bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90">Continue</Button>:<Button type="submit" disabled={uploadingPhoto} className="gap-1.5 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90"><Sparkles className="size-4" />{datingProfile?"Save Profile":"Publish Dating Profile"}</Button>}</DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

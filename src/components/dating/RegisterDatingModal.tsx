import { useEffect, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
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
  intimacyPreference: "", relationshipStatus: "single", heightCm: null, zodiac: "", favoriteDate: "",
};

function Chips({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{values.map(v => <button key={v} type="button" onClick={() => onToggle(v)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected.includes(v) ? "bg-[var(--dating)] text-white" : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>{v}</button>)}</div>;
}

export function RegisterDatingModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { datingProfile, registerDatingProfile } = useStore();
  const [p, setP] = useState(emptyProfile);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (datingProfile) {
      const { registeredAt: _registeredAt, userId: _userId, ...rest } = datingProfile;
      setP({ ...emptyProfile, ...rest });
    } else setP(emptyProfile);
  }, [datingProfile, open]);

  const toggle = (key: "interests" | "lookingFor" | "lifestyle" | "personality", value: string) => setP(s => ({ ...s, [key]: s[key].includes(value) ? s[key].filter(x => x !== value) : [...s[key], value] }));
  const set = (key: keyof typeof p, value: string | number | null) => setP(s => ({ ...s, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p.age < 18 || !p.bio.trim() || !p.country.trim() || !p.gender.trim()) { toast.error("Choose your country and gender, confirm you are 18+, and write a short About."); return; }
    registerDatingProfile({ ...p, name:p.name.trim(), bio:p.bio.trim(), vibe:p.vibe.trim(), location:p.country.trim(), country:p.country.trim(), gender:p.gender.trim(), occupation:p.occupation.trim(), education:p.education.trim(), favoriteDate:p.favoriteDate.trim() });
    toast.success(datingProfile ? "Dating profile updated 💗" : "🎉 Dating profile is live!");
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl rounded-2xl p-6">
      <DialogHeader>
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--dating)_20%,transparent)] text-[var(--dating)]"><Heart className="size-5 fill-current" /></span><div><DialogTitle className="font-display text-xl font-bold">{datingProfile ? "Edit Dating Profile" : "Register for Dating"}</DialogTitle><DialogDescription className="text-xs">Adult-only anonymous dating. Your Circle Panda identity stays a generated Panda avatar — no personal profile photos.</DialogDescription></div></div>
      </DialogHeader>
      <div className="mb-3 flex gap-1">{["About", "Lifestyle", "Dating", "Intimacy", "Finish"].map((x,i)=><button key={x} type="button" onClick={()=>setStep(i)} className={`h-1.5 flex-1 rounded-full ${i<=step ? "bg-[var(--dating)]" : "bg-secondary"}`} aria-label={`Step ${i+1}: ${x}`} />)}</div>
      <form onSubmit={submit} className="space-y-5">
        {step === 0 && <section className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panda Avatar</label><div className="flex flex-wrap gap-2">{PANDA_AVATARS.map(a=><button key={a} type="button" onClick={()=>set("emoji",a)} className={`grid size-12 place-items-center rounded-xl text-xl ${p.emoji===a ? "bg-[var(--dating)] text-white ring-2 ring-[var(--dating)]/40" : "bg-secondary/60"}`}>{a}</button>)}</div></div>
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
          <div className="rounded-2xl border border-[var(--dating)]/20 bg-[var(--dating)]/5 p-4"><p className="font-semibold">Intimacy & experience</p><p className="mt-1 text-xs text-muted-foreground">Optional adult profile information. You control what you share on your card.</p></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Sexual experience</label><div className="grid gap-2 sm:grid-cols-2">{SEXUAL_EXPERIENCE.map(v=><button type="button" key={v} onClick={()=>set("sexualExperience",v)} className={`rounded-xl border px-3 py-3 text-left text-sm ${p.sexualExperience===v ? "border-[var(--dating)] bg-[var(--dating)]/10 text-[var(--dating)]" : "border-border bg-background"}`}>{v}</button>)}</div></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Intimacy preference</label><Chips values={INTIMACY} selected={p.intimacyPreference ? [p.intimacyPreference] : []} onToggle={v=>set("intimacyPreference",v)} /></div>
        </section>}
        {step === 4 && <section className="space-y-4"><div className="rounded-2xl bg-secondary/50 p-4"><p className="font-display font-bold">Your dating card is ready</p><p className="mt-1 text-sm text-muted-foreground">Review your answers before publishing. You can update your answers, but your Panda name and country stay fixed.</p></div><div className="grid grid-cols-2 gap-2 text-sm">{[["Panda name",p.name],["Age",String(p.age)],["Country",p.country||"—"],["Gender",p.gender||"—"],["Vibe",p.vibe||"—"],["Looking for",p.relationshipGoal||p.lookingFor[0]||"—"],["Experience",p.sexualExperience||"Prefer not to say"],["Ideal date",p.favoriteDate||"—"]].map(([k,v])=><div key={k} className="rounded-xl border border-border p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-1 font-medium">{v}</p></div>)}</div></section>}
        <DialogFooter className="flex-row justify-between gap-2 pt-2"><Button type="button" variant="outline" onClick={()=>step===0?onOpenChange(false):setStep(step-1)}>{step===0?"Cancel":"Back"}</Button>{step<4?<Button type="button" onClick={()=>setStep(step+1)} className="bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90">Continue</Button>:<Button type="submit" className="gap-1.5 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90"><Sparkles className="size-4" />{datingProfile?"Save Profile":"Publish Dating Profile"}</Button>}</DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

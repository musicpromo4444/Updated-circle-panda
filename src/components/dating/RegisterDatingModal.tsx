import { useEffect, useState } from "react";
import { Heart, Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore, type DatingProfile } from "@/lib/store";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";

const PANDA_AVATARS = ["🐼","🎋🐼","🌙🐼","✨🐼","🎧🐼","🕶️🐼","❤️🐼","🔥🐼","🌸🐼","🎨🐼","🍫🐼","☀️🐼"];

const INTERESTS = [
  "Social media","Content creation","Comedy","Movies & TV","Music","TikTok / Reels","Gaming","Memes",
  "Football","Sports","Travel","Food","Fitness","Photography","Dancing","Fashion","Podcasts","Live music",
  "Cooking","Coffee","Books","Late walks","Night drives","Art galleries"
];

const LIFESTYLE = [
  "Playful","Adventurous","Social","Social-media person","Office type","Inside type","Romantic",
  "Funny","Ambitious","Party person","Quiet/private","Family-oriented","Spontaneous","Jealous","Easygoing"
];

const PERSONALITY = ["Funny","Romantic","Quiet","Confident","Spontaneous","Caring","Ambitious","Flirty","Introverted","Outgoing"];
const SEXUAL_EXPERIENCE = ["Virgin","Novice","Expert","Good in bed","Pro","Prefer not to say"];
const RELATIONSHIP_TYPES = [
  "Long-distance relationship","Something casual","Long-term relationship","Something that leads to marriage",
  "Just for fun","Just exploring","Friendship first","Dating / getting to know someone"
];
const MEET_PLACES = ["My house","Public place","Restaurant / Eatery","Hotel","Beach / Outdoor place","Cafe / Coffee shop"];
const SMOKING = ["Never","Occasionally","Regularly","Prefer not to say"];
const DRINKING = ["Never","Occasionally","Socially","Regularly","Prefer not to say"];
const CHILDREN = ["No children","Have children","Want children","Don't want children","Prefer not to say"];
const EDUCATION = ["Secondary school","College / Polytechnic","University","Postgraduate","Prefer not to say"];

const MALE_TRAITS = [
  "Very fair skin","Fair skin","Light brown skin","Brown skin","Dark brown skin","Deep dark skin",
  "Short","Average height","Tall","Very tall","Slim","Average build","Athletic","Muscular","Broad shoulders","Broad chest","Chubby","Plus-size",
  "Black hair","Brown hair","Blonde hair","Bald","Short hair","Long hair","Dreads","Braids","Curly hair",
  "Brown eyes","Black eyes","Hazel eyes","Blue eyes","Green eyes","Bearded","Clean-shaven","Mustache","Goatee",
  "Casual style","Smart style","Streetwear style","Sexy style","Masculine style"
];

const FEMALE_TRAITS = [
  "Very fair skin","Fair skin","Light brown skin","Brown skin","Dark brown skin","Deep dark skin",
  "Short","Average height","Tall","Slim","Petite","Average build","Athletic","Curvy","Chubby","Plus-size","Figure-eight",
  "Small waist","Average waist","Wide waist","Small hips","Average hips","Wide hips","Small butt","Average butt","Big butt",
  "Small chest","Average chest","Big chest","Black hair","Brown hair","Blonde hair","Short hair","Long hair","Dreads","Braids","Curly hair","Straight hair",
  "Brown eyes","Black eyes","Hazel eyes","Blue eyes","Green eyes","Casual style","Glamorous style","Feminine style","Sexy style"
];

const emptyProfile: Omit<DatingProfile,"registeredAt"|"userId"> = {
  name:"Anonymous Panda",age:18,vibe:"",emoji:"🐼",bio:"",interests:[],location:"",country:"",gender:"",
  relationshipGoal:"",lookingFor:[],aboutTraits:[],lifestyle:[],personality:[],loveLanguage:"",
  smoking:"Prefer not to say",drinking:"Prefer not to say",children:"Prefer not to say",education:"",
  occupation:"",sexualExperience:"",intimacyPreference:"",relationshipStatus:"single",heightCm:null,zodiac:"",
  favoriteDate:"",photoPath:"",blurredPhotoPath:""
};

function Chips({values,selected,onToggle}:{values:string[];selected:string[];onToggle:(v:string)=>void}) {
  return <div className="flex flex-wrap gap-1.5">{values.map(v=><button key={v} type="button" onClick={()=>onToggle(v)}
    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected.includes(v)?"bg-[var(--dating)] text-white":"border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>{v}</button>)}</div>;
}
function SingleChoice({values,value,onChange}:{values:string[];value:string;onChange:(v:string)=>void}) {
  return <div className="grid gap-2 sm:grid-cols-2">{values.map(v=><button type="button" key={v} onClick={()=>onChange(v)}
    className={`rounded-xl border px-3 py-3 text-left text-sm ${value===v?"border-[var(--dating)] bg-[var(--dating)]/10 text-[var(--dating)]":"border-border bg-background"}`}>{v}</button>)}</div>;
}

export function RegisterDatingModal({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}) {
  const {datingProfile,registerDatingProfile}=useStore();
  const [p,setP]=useState(emptyProfile);
  const [step,setStep]=useState(0);
  const [photoFile,setPhotoFile]=useState<File|null>(null);
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [uploadingPhoto,setUploadingPhoto]=useState(false);
  const [accountReady,setAccountReady]=useState(false);
  const [traits,setTraits]=useState<string[]>([]);
  const targetTraits=p.gender==="male"?FEMALE_TRAITS:MALE_TRAITS;

  useEffect(()=>{
    if(!open) return;
    void (async()=>{
      const {data:userRes}=await (supabase as any).auth.getUser();
      const uid=userRes?.user?.id;
      if(!uid || userRes?.user?.is_anonymous){requestLogin("register for Dating");onOpenChange(false);return;}
      const {data:profile,error}=await (supabase as any).from("profiles")
        .select("display_name,avatar_url,age,gender,country,city,area").eq("id",uid).maybeSingle();
      if(error){toast.error(error.message??"Could not load your Circle Panda profile");onOpenChange(false);return;}
      if(!profile?.age || profile.age<18 || !profile.gender || !profile.country){
        toast.error("Complete your Circle Panda profile first — age, gender and country are required for Dating.");
        onOpenChange(false); window.location.href="/profile"; return;
      }
      const base={...emptyProfile,name:profile.display_name||"Anonymous Panda",age:Number(profile.age),gender:profile.gender,country:profile.country,
        location:profile.city||profile.area||profile.country,emoji:"🐼"};
      if(datingProfile){
        const {registeredAt:_r,userId:_u,...rest}=datingProfile;
        setP({...base,...rest,name:profile.display_name||rest.name,age:Number(profile.age),gender:profile.gender,country:profile.country,location:profile.city||profile.area||profile.country});
        setTraits(rest.aboutTraits??[]);
        setPhotoPreview(rest.blurredPhotoPath?supabase.storage.from("dating-photo-blur").getPublicUrl(rest.blurredPhotoPath).data.publicUrl:null);
      } else {
        setP(base); setTraits([]); setPhotoPreview(null);
      }
      setPhotoFile(null); setStep(0); setAccountReady(true);
    })();
  },[open,datingProfile,onOpenChange]);

  const toggle=(key:"interests"|"lookingFor"|"aboutTraits"|"lifestyle"|"personality",value:string)=>
    setP(s=>({...s,[key]:s[key].includes(value)?s[key].filter(x=>x!==value):[...s[key],value]}));
  const set=(key:keyof typeof p,value:string|number|null)=>setP(s=>({...s,[key]:value}));

  const makeBlurredCopy=async(file:File):Promise<Blob>=>{
    const bitmap=await createImageBitmap(file); const size=720; const canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
    const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Could not prepare photo");
    const scale=Math.max(size/bitmap.width,size/bitmap.height)*1.08; const w=bitmap.width*scale,h=bitmap.height*scale;
    ctx.filter="blur(18px)"; ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h); bitmap.close();
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not blur photo")),"image/jpeg",.72));
  };
  const choosePhoto=async(file:File|undefined)=>{
    if(!file)return; if(!file.type.startsWith("image/")){toast.error("Choose an image");return;}
    if(file.size>10*1024*1024){toast.error("Photo must be 10MB or smaller");return;}
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  };
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!accountReady)return;
    if(!p.occupation.trim()){toast.error("Add your occupation");return;}
    if(!p.aboutTraits.length){toast.error("Pick at least one About You trait");setStep(1);return;}
    if(!p.relationshipGoal){toast.error("Choose your relationship type");setStep(3);return;}
    if(!p.favoriteDate){toast.error("Choose where you can meet first");setStep(3);return;}
    if(!p.sexualExperience){toast.error("Choose your Sexual Experience option");setStep(4);return;}
    if(!photoFile && !p.photoPath){toast.error("Upload your Dating photo");return;}
    setUploadingPhoto(true);
    try{
      const {data:userRes}=await (supabase as any).auth.getUser(); const uid=userRes?.user?.id;
      if(!uid||userRes?.user?.is_anonymous){requestLogin("register for Dating");return;}
      let photoPath=p.photoPath||"",blurredPhotoPath=p.blurredPhotoPath||"";
      if(photoFile){
        const ext=photoFile.type==="image/png"?"png":photoFile.type==="image/webp"?"webp":"jpg"; const base=crypto.randomUUID();
        photoPath=uid+"/"+base+"."+ext; blurredPhotoPath=uid+"/"+base+".jpg";
        const blurred=await makeBlurredCopy(photoFile);
        const originalUpload=await supabase.storage.from("dating-photos").upload(photoPath,photoFile,{contentType:photoFile.type,upsert:true});
        if(originalUpload.error)throw originalUpload.error;
        const blurUpload=await supabase.storage.from("dating-photo-blur").upload(blurredPhotoPath,blurred,{contentType:"image/jpeg",upsert:true});
        if(blurUpload.error)throw blurUpload.error;
      }
      await registerDatingProfile({...p,aboutTraits:p.aboutTraits,photoPath,blurredPhotoPath,name:p.name.trim(),country:p.country.trim(),location:p.location.trim(),bio:""});
      toast.success(datingProfile?"Dating profile updated 💗":"🎉 Dating profile is live!");
      onOpenChange(false);
    }catch(err:any){toast.error(err?.message??"Could not save Dating profile");}
    finally{setUploadingPhoto(false);}
  };

  if(!accountReady && open)return null;

  const progress=["Circle Panda","About You","Lifestyle","Dating","SEXUAL EXPERIENCE","Dating photo"];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--dating)_20%,transparent)] text-[var(--dating)]"><Heart className="size-5 fill-current"/></span>
          <div><DialogTitle className="font-display text-xl font-bold">{datingProfile?"Edit Dating Profile":"Register for Dating"}</DialogTitle>
          <DialogDescription className="text-xs">Adult-only Dating. Your Panda identity comes directly from your Circle Panda account. Dating photos remain blurred until the normal 72-hour mutual confirmation is complete.</DialogDescription></div>
        </div>
      </DialogHeader>
      <div className="mb-3 flex gap-1">{progress.map((x,i)=><button key={x} type="button" onClick={()=>i<=step&&setStep(i)} className={`h-1.5 flex-1 rounded-full ${i<=step?"bg-[var(--dating)]":"bg-secondary"}`} aria-label={`Step ${i+1}: ${x}`}/>)}</div>

      <form onSubmit={submit} className="space-y-5">
        {step===0&&<section className="space-y-4">
          <div className="rounded-2xl border border-[var(--dating)]/25 bg-[var(--dating)]/5 p-4">
            <p className="font-black uppercase tracking-wide text-[var(--dating)]">Your Circle Panda profile</p>
            <p className="mt-1 text-xs text-muted-foreground">These details are read-only. Dating uses your main account as the source of truth.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Panda avatar</p><p className="mt-1 text-4xl">{p.emoji}</p></div>
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Panda name</p><p className="mt-1 font-semibold">{p.name}</p></div>
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Age</p><p className="mt-1 font-semibold">{p.age}</p></div>
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Gender</p><p className="mt-1 font-semibold capitalize">{p.gender}</p></div>
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Country</p><p className="mt-1 font-semibold">{p.country}</p></div>
              <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">City / Area</p><p className="mt-1 font-semibold">{p.location}</p></div>
            </div>
          </div>
          <Button type="button" onClick={()=>setStep(1)} className="w-full bg-[var(--dating)] text-white">Next</Button>
        </section>}

        {step===1&&<section className="space-y-5">
          <div><label className="mb-1.5 block text-sm font-black">Occupation</label><Input value={p.occupation} onChange={e=>set("occupation",e.target.value)} placeholder="What you do"/></div>
          <div><p className="mb-1 text-sm font-black">About You</p><p className="mb-3 text-xs text-muted-foreground">Pick more than one. Describe yourself using the traits that fit you.</p><Chips values={p.gender==="male"?MALE_TRAITS:FEMALE_TRAITS} selected={p.aboutTraits} onToggle={v=>toggle("aboutTraits",v)}/></div>
          <div><p className="mb-1 text-sm font-black">Interests</p><p className="mb-3 text-xs text-muted-foreground">Pick the things you actually enjoy doing these days.</p><Chips values={INTERESTS} selected={p.interests} onToggle={v=>toggle("interests",v)}/></div>
        </section>}

        {step===2&&<section className="space-y-5">
          <div><p className="mb-1 text-sm font-black">General lifestyle</p><p className="mb-3 text-xs text-muted-foreground">Pick more than one that describes your everyday lifestyle.</p><Chips values={LIFESTYLE} selected={p.lifestyle} onToggle={v=>toggle("lifestyle",v)}/></div>
          <div><p className="mb-1.5 text-sm font-black">Personality</p><Chips values={PERSONALITY} selected={p.personality} onToggle={v=>toggle("personality",v)}/></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1.5 text-xs font-bold">Smoking</p><SingleChoice values={SMOKING} value={p.smoking} onChange={v=>set("smoking",v)}/></div>
            <div><p className="mb-1.5 text-xs font-bold">Drinking</p><SingleChoice values={DRINKING} value={p.drinking} onChange={v=>set("drinking",v)}/></div>
            <div><p className="mb-1.5 text-xs font-bold">Children</p><SingleChoice values={CHILDREN} value={p.children} onChange={v=>set("children",v)}/></div>
            <div><p className="mb-1.5 text-xs font-bold">Education <span className="font-normal text-muted-foreground">· optional</span></p><SingleChoice values={EDUCATION} value={p.education} onChange={v=>set("education",v)}/></div>
          </div>
        </section>}

        {step===3&&<section className="space-y-5">
          <div><p className="mb-1 text-sm font-black">What are you looking for?</p><p className="mb-3 text-xs text-muted-foreground">Pick more than one. Describe the person you’re looking for — the type of person you want to date.</p><Chips values={targetTraits} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-1 text-sm font-black">Relationship type</p><p className="mb-3 text-xs text-muted-foreground">Choose one.</p><SingleChoice values={RELATIONSHIP_TYPES} value={p.relationshipGoal} onChange={v=>set("relationshipGoal",v)}/></div>
          <div><p className="mb-1 text-sm font-black">Where can we meet first?</p><p className="mb-3 text-xs text-muted-foreground">Choose one.</p><SingleChoice values={MEET_PLACES} value={p.favoriteDate} onChange={v=>set("favoriteDate",v)}/></div>
        </section>}

        {step===4&&<section className="space-y-5">
          <div className="rounded-2xl border border-[var(--dating)]/20 bg-[var(--dating)]/5 p-4"><p className="font-black uppercase tracking-wide">SEXUAL EXPERIENCE</p><p className="mt-1 text-xs text-muted-foreground">Optional adult profile information.</p></div>
          <SingleChoice values={SEXUAL_EXPERIENCE} value={p.sexualExperience} onChange={v=>set("sexualExperience",v)}/>
        </section>}

        {step===5&&<section className="space-y-5">
          <div className="rounded-2xl border border-[var(--dating)]/25 bg-[var(--dating)]/5 p-4">
            <p className="font-black uppercase tracking-wide text-[var(--dating)]">Dating photo · final step</p>
            <p className="mt-1 text-xs text-muted-foreground">This is separate from your Panda avatar. The Dating photo is stored with a blurred version and stays blurred until the normal mutual 72-hour confirmation/reveal rules are satisfied.</p>
            <div className="mt-4 grid place-items-center overflow-hidden rounded-2xl border border-border bg-secondary/60 h-64">
              {photoPreview?<img src={photoPreview} alt="Dating photo preview" className="size-full object-cover blur-md"/>:<ImageIcon className="size-10 text-muted-foreground"/>}
            </div>
            <label className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--dating)] px-4 py-3 text-sm font-bold text-white"><Upload className="size-4"/> {photoFile?"Change photo":"Upload Dating photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void choosePhoto(e.target.files?.[0])}/></label>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">Your Circle Panda name, age, gender, country and city/area above cannot be changed from this Dating form. They always come from your main account.</div>
        </section>}

        <DialogFooter className="flex-row justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={()=>step===0?onOpenChange(false):setStep(step-1)}>{step===0?"Cancel":"Back"}</Button>
          {step<5?<Button type="button" onClick={()=>{if(step===1&&!p.aboutTraits.length){toast.error("Pick at least one About You trait");return;} if(step===1&&!p.occupation.trim()){toast.error("Add your occupation");return;} if(step===3&&!p.relationshipGoal){toast.error("Choose your relationship type");return;} if(step===3&&!p.favoriteDate){toast.error("Choose where you can meet first");return;} if(step===4&&!p.sexualExperience){toast.error("Choose your Sexual Experience option");return;} setStep(step+1)}} className="bg-[var(--dating)] text-white">Next</Button>
            :<Button type="submit" disabled={uploadingPhoto||!photoFile&&!p.photoPath} className="gap-1.5 bg-[var(--dating)] text-white">{uploadingPhoto?"Publishing…":datingProfile?"Save Dating Profile":"Publish Dating Profile"} <Sparkles className="size-4"/></Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

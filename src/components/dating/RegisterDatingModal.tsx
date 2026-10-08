import { useEffect, useState } from "react";
import { Heart, Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore, type DatingProfile } from "@/lib/store";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";
import { CirclePandaLoader } from "@/components/CirclePandaLoader";

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

const SKIN_COLORS = ["Very fair","Fair","Light brown","Brown","Dark brown","Deep dark"];
const BODY_TYPES = ["Slim","Petite","Average build","Athletic","Muscular","Chubby","Curvy","Plus-size","Broad shoulders","Figure-eight"];
const HEIGHT_TYPES = ["Short","Average height","Tall","Very tall"];
const HAIR_COLORS = ["Black hair","Brown hair","Blonde hair","Red hair","Grey hair","Other"];
const HAIR_STYLES = ["Short hair","Long hair","Dreads","Braids","Curly hair","Straight hair","Bald"];
const EYE_COLORS = ["Black eyes","Brown eyes","Hazel eyes","Blue eyes","Green eyes","Grey eyes"];
const STYLE_TYPES = ["Casual","Smart","Streetwear","Glamorous","Feminine","Masculine","Sexy"];
const TARGET_TRAITS = [...SKIN_COLORS,...BODY_TYPES,...HEIGHT_TYPES,...HAIR_COLORS,...HAIR_STYLES,...EYE_COLORS,...STYLE_TYPES];

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
  const [publishing,setPublishing]=useState(false);

  useEffect(()=>{
    if(!open) return;
    setAccountReady(false);
    setPublishing(false);
    void (async()=>{
      try {
        const {data:userRes,error:userError}=await (supabase as any).auth.getUser();
        if(userError) throw userError;
        const uid=userRes?.user?.id;
        if(!uid || userRes?.user?.is_anonymous){
          requestLogin("register for Dating");
          onOpenChange(false);
          return;
        }

        // Open the real registration card as soon as authentication is confirmed.
        // Profile hydration happens inside the card and must never silently close it.
        const currentDating=datingProfile;
        if(currentDating){
          const {registeredAt:_r,userId:_u,...rest}=currentDating;
          setP(s=>({...s,...rest}));
        }
        setPhotoFile(null);
        setStep(0);
        setAccountReady(true);

        const {data:profile,error}=await (supabase as any).from("profiles")
          .select("display_name,avatar_url,age,gender,country,state,area").eq("id",uid).maybeSingle();

        if(error){
          toast.error(error.message??"Could not load your Circle Panda profile");
          return;
        }
        if(!profile){
          toast.error("Your Circle Panda profile could not be found. Complete your main profile before publishing Dating.");
          return;
        }

        const base={...emptyProfile,name:profile.display_name||"Anonymous Panda",
          age:Number(profile.age||0),gender:profile.gender||"",country:profile.country||"",
          location:profile.area||profile.state||profile.country||"",emoji:String(profile.avatar_url||"🐼")};

        setP(s=>({...base,
          ...(currentDating?(()=>{const {registeredAt:_r,userId:_u,...rest}=currentDating;return rest;})():{}),
          name:profile.display_name||s.name||"Anonymous Panda",
          age:Number(profile.age||s.age||0),gender:profile.gender||s.gender||"",
          country:profile.country||s.country||"",location:profile.area||profile.state||profile.country||s.location||"",
          emoji:String(profile.avatar_url||s.emoji||"🐼")
        }));

        if(currentDating?.blurredPhotoPath){
          setPhotoPreview(supabase.storage.from("dating-photo-blur").getPublicUrl(currentDating.blurredPhotoPath).data.publicUrl);
        } else {
          setPhotoPreview(null);
        }

        if(!profile.age || Number(profile.age)<18 || !profile.gender || !profile.country){
          toast.error("Your main Circle Panda profile needs age, gender and country before you can publish a Dating card.");
        }
      } catch(err:any) {
        toast.error(err?.message ?? "Could not open Dating registration. Please try again.");
        setAccountReady(true);
      }
    })();
  },[open,onOpenChange]);

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
    if(!p.age || Number(p.age)<18 || !p.gender || !p.country){
      toast.error("Complete your Circle Panda profile with age, gender and country before publishing Dating.");
      return;
    }
    if(!p.relationshipGoal){toast.error("Choose the type of relationship you're looking for");setStep(1);return;}
    if(!photoFile && !p.photoPath){toast.error("Upload your Dating photo");return;}
    setUploadingPhoto(true);
    setPublishing(true);
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
      const saved = await registerDatingProfile({...p,aboutTraits:p.aboutTraits,photoPath,blurredPhotoPath,name:p.name.trim(),country:p.country.trim(),location:p.location.trim(),bio:""});
      if (!saved) return;
      toast.success(datingProfile?"Dating profile updated 💗":"🎉 Dating profile is live!");
      onOpenChange(false);
      setPublishing(false);
    }catch(err:any){
      toast.error(err?.message??"Could not save Dating profile");
      setPublishing(false);
    }finally{setUploadingPhoto(false);}
  };

  if(!accountReady && open)return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Opening Dating</DialogTitle>
        <DialogDescription>Checking your Circle Panda profile and preparing your Dating card…</DialogDescription>
        <div className="flex justify-center py-5"><CirclePandaLoader /></div>
      </DialogContent>
    </Dialog>
  );

  const progress=["Circle Panda","Relationship","What are you looking for?","Your details","Dating photo"];
  return <>
    {publishing ? <CirclePandaLoader /> : null}
    <Dialog open={open && !publishing} onOpenChange={onOpenChange}>
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
          <div>
            <p className="mb-1 text-sm font-black">What type of relationship are you looking for?</p>
            <p className="mb-3 text-xs text-muted-foreground">Choose the option that best describes what you want.</p>
            <SingleChoice values={RELATIONSHIP_TYPES} value={p.relationshipGoal} onChange={v=>set("relationshipGoal",v)}/>
          </div>
        </section>}

        {step===2&&<section className="space-y-5">
          <div>
            <p className="mb-1 text-sm font-black">What are you looking for?</p>
            <p className="mb-3 text-xs text-muted-foreground">Choose the traits you would like in the person you want to date.</p>
          </div>
          <div><p className="mb-2 text-sm font-black">Skin color</p><Chips values={SKIN_COLORS} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Size / body type</p><Chips values={BODY_TYPES} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Height</p><Chips values={HEIGHT_TYPES} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Hair color</p><Chips values={HAIR_COLORS} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Hair style</p><Chips values={HAIR_STYLES} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Eye color</p><Chips values={EYE_COLORS} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Style</p><Chips values={STYLE_TYPES} selected={p.lookingFor} onToggle={v=>toggle("lookingFor",v)}/></div>
        </section>}

        {step===3&&<section className="space-y-5">
          <div>
            <p className="mb-1 text-sm font-black">Your details</p>
            <p className="mb-3 text-xs text-muted-foreground">Keep it simple. These help people understand you.</p>
          </div>
          <div><label className="mb-1.5 block text-sm font-black">Occupation</label><Input value={p.occupation} onChange={e=>set("occupation",e.target.value)} placeholder="What you do"/></div>
          <div>
            <p className="mb-2 text-sm font-black">Children</p>
            <SingleChoice values={["No children","Have children","Prefer not to say"]} value={p.children} onChange={v=>set("children",v)}/>
          </div>
          <div>
            <p className="mb-2 text-sm font-black">Smoking</p>
            <SingleChoice values={["Non-smoker","Smoker","Occasionally","Prefer not to say"]} value={p.smoking} onChange={v=>set("smoking",v)}/>
          </div>
          <div>
            <p className="mb-2 text-sm font-black">Drinking</p>
            <SingleChoice values={["Non-drinker","Drinker","Occasionally","Prefer not to say"]} value={p.drinking} onChange={v=>set("drinking",v)}/>
          </div>
          <div><p className="mb-2 text-sm font-black">Your interests</p><Chips values={INTERESTS} selected={p.interests} onToggle={v=>toggle("interests",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Your lifestyle</p><Chips values={LIFESTYLE} selected={p.lifestyle} onToggle={v=>toggle("lifestyle",v)}/></div>
          <div><p className="mb-2 text-sm font-black">Your personality</p><Chips values={PERSONALITY} selected={p.personality} onToggle={v=>toggle("personality",v)}/></div>
          <div><label className="mb-1.5 block text-sm font-black">Love language</label><Input value={p.loveLanguage} onChange={e=>set("loveLanguage",e.target.value)} placeholder="Optional"/></div>
          <div><label className="mb-1.5 block text-sm font-black">Intimacy preference</label><Input value={p.intimacyPreference} onChange={e=>set("intimacyPreference",e.target.value)} placeholder="Optional"/></div>
          <div><label className="mb-1.5 block text-sm font-black">Favorite date</label><Input value={p.favoriteDate} onChange={e=>set("favoriteDate",e.target.value)} placeholder="Optional"/></div>
          <div>
            <p className="mb-2 text-sm font-black">Sexual Experience</p>
            <SingleChoice values={SEXUAL_EXPERIENCE} value={p.sexualExperience} onChange={v=>set("sexualExperience",v)}/>
          </div>
        </section>}

        {step===4&&<section className="space-y-5">
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
          {step<4?<Button type="button" onClick={()=>{if(step===1&&!p.relationshipGoal){toast.error("Choose the type of relationship you're looking for");return;} setStep(step+1)}} className="bg-[var(--dating)] text-white">Next</Button>
            :<Button type="submit" disabled={uploadingPhoto||!photoFile&&!p.photoPath} className="gap-1.5 bg-[var(--dating)] text-white">{uploadingPhoto?"Publishing…":datingProfile?"Save Dating Profile":"Publish Dating Profile"} <Sparkles className="size-4"/></Button>}
        </DialogFooter>
      </form>
    </DialogContent>
    </Dialog>
  </>;
}

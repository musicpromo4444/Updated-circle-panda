import { useMemo, useState } from "react";
import { Gift, CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COUNTRIES = ["Nigeria","Ghana","Kenya","South Africa","United States","United Kingdom","Canada","Australia","India","Tanzania","Uganda","Rwanda","Zambia","Zimbabwe","Cameroon","Ethiopia","Egypt","France","Germany","Italy","Spain","United Arab Emirates","Saudi Arabia","Brazil","Other"];
const STATES: Record<string,string[]> = {
  Nigeria:["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Federal Capital Territory"],
  Ghana:["Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"],
  Kenya:["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"],
  "South Africa":["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"],
  "United States":["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],
  "United Kingdom":["England","Scotland","Wales","Northern Ireland"],
  Canada:["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"],
  Australia:["Australian Capital Territory","New South Wales","Northern Territory","Queensland","South Australia","Tasmania","Victoria","Western Australia"],
  India:["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi"]
};

export function NewUserOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step,setStep]=useState<"welcome"|"location"|"reward"|"ready">("welcome");
  const [busy,setBusy]=useState(false);
  const [reward,setReward]=useState<number|null>(null);
  const [error,setError]=useState("");
  const [country,setCountry]=useState("");
  const [state,setState]=useState("");
  const [area,setArea]=useState("");
  const [address,setAddress]=useState("");
  const stateOptions=useMemo(()=>STATES[country]??[],[country]);

  async function saveLocation() {
    if(!country){setError("Please select your country.");return;}
    if(!state){setError("Please select your state/province.");return;}
    if(!area.trim()){setError("Please enter your area.");return;}
    setBusy(true);setError("");
    try {
      const {error:e}=await supabase.rpc("update_profile_completion_secure",{p_country:country,p_state_province:state,p_city:null,p_area:area.trim(),p_address_line:address.trim()||null,p_date_of_birth:null});
      if(e) throw e;
      await claimReward();
    } catch(e) { setError(e instanceof Error?e.message:"Could not save your location.");setBusy(false); }
  }
  async function claimReward(){
    try {
      const {data,error:e}=await supabase.rpc("claim_new_member_onboarding");
      if(e) throw e;
      setReward(Number((data as any)?.welcome_bc??0));setStep("reward");
    } catch(e){setError(e instanceof Error?e.message:"Could not complete onboarding.");}
    finally{setBusy(false);}
  }
  async function finish(){try{await supabase.rpc("mark_member_intro_seen");}catch{}setStep("ready");}

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[2rem] border border-amber-300/25 bg-[#0b1d18] p-6 text-white shadow-[0_0_45px_rgba(245,158,11,.12)]">
      {step==="welcome" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15 text-5xl">🐼</div><h2 className="mt-5 text-center text-2xl font-black">You have created an account! 🎉</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Welcome to Circle Panda. Before entering, tell us where you are so we can show your correct Country VIP group.</p><button onClick={()=>setStep("location")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f]">Continue <ArrowRight className="h-5 w-5"/></button></>}
      {step==="location" && <><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-400/15"><MapPin className="size-8 text-amber-300"/></div><h2 className="mt-4 text-center text-xl font-black">Your location</h2><p className="mt-1 text-center text-xs text-white/60">Country and state are required. Area helps local features. Address is optional.</p><div className="mt-5 space-y-3">
        <select value={country} onChange={e=>{setCountry(e.target.value);setState("");}} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"><option value="" className="text-black">Select country</option>{COUNTRIES.map(c=><option key={c} value={c} className="text-black">{c}</option>)}</select>
        {stateOptions.length ? <select value={state} onChange={e=>setState(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"><option value="" className="text-black">Select state / province</option>{stateOptions.map(s=><option key={s} value={s} className="text-black">{s}</option>)}</select> : <input value={state} onChange={e=>setState(e.target.value)} placeholder="State / province" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35" />}
        <input value={area} onChange={e=>setArea(e.target.value)} placeholder="Area / city" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35"/>
        <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Address (optional)" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35"/>
      </div>{error&&<p className="mt-3 rounded-xl bg-red-400/10 p-3 text-center text-xs text-red-200">{error}</p>}<button onClick={()=>void saveLocation()} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f] disabled:opacity-60">{busy?"Saving…":"Save location & continue"} <ArrowRight className="h-5 w-5"/></button></>}
      {step==="reward" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15"><Gift className="h-10 w-10 text-emerald-300"/></div><h2 className="mt-5 text-center text-2xl font-black">{reward?String(reward)+" BC added to your wallet! 🎁":"Welcome gift checked"}</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Your welcome BC has been added to your Circle Panda wallet.</p><button onClick={()=>void finish()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f]">Continue to your Panda <ArrowRight className="h-5 w-5"/></button></>}
      {step==="ready" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15"><CheckCircle2 className="h-10 w-10 text-emerald-300"/></div><h2 className="mt-5 text-center text-2xl font-black">You’re ready! 🐼</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Your location is saved. Circle Panda can now show your correct Country VIP group.</p><button onClick={onComplete} className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f]">Enter Circle Panda</button></>}
    </div>
  </div>;
}

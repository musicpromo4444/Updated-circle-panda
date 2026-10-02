import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovingPandaLogo } from "@/components/auth/MovingPandaLogo";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Circle Panda — Create your Panda" }] }),
  component: RegisterPage,
});

const looks = Array.from({length: 12}, (_, i) => i);

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:"", identifier:"", password:"", confirmPassword:"", country:"", state:"", city:"", area:"", addressLine:"", gender:"", dob:"", avatar:"0" });
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  useEffect(() => {
    setLoadingLocations(true);
    void fetch("https://countriesnow.space/api/v0.1/countries/positions").then(r=>r.json()).then(j=>setCountries(Array.isArray(j?.data)?j.data:[])).catch(()=>setCountries([])).finally(()=>setLoadingLocations(false));
  }, []);
  useEffect(() => { const ua=navigator.userAgent||""; const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); const android=/Android/i.test(ua); setPlatform(ios?"ios":android?"android":"other"); }, []);
  const age = useMemo(() => form.dob ? Math.floor((Date.now()-new Date(form.dob+"T00:00:00").getTime())/31557600000) : 0,[form.dob]);
  const set=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));
  const loadStates = async (country:string) => {
    set("state",""); set("city",""); set("area",""); setCities([]); setAreas([]);
    if (!country) { setStates([]); return; }
    try { const r=await fetch("https://countriesnow.space/api/v0.1/countries/states",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country})}); const j=await r.json(); setStates(Array.isArray(j?.data?.states)?j.data.states.map((s:any)=>s.name).filter(Boolean):[]); } catch { setStates([]); }
  };
  const loadCities = async (country:string,state:string) => {
    set("city",""); set("area",""); setAreas([]);
    if (!country || !state) { setCities([]); return; }
    try { const r=await fetch("https://countriesnow.space/api/v0.1/countries/state/cities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country,state})}); const j=await r.json(); setCities(Array.isArray(j?.data)?j.data.filter(Boolean):[]); } catch { setCities([]); }
  };
  const loadAreas = async (country:string,state:string,city:string) => {
    set("area","");
    if (!country || !state || !city) { setAreas([]); return; }
    try { const q=encodeURIComponent(city+", "+state+", "+country); const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&q="+q); const j=await r.json(); const a=Array.isArray(j)?j.map((x:any)=>x?.address?.suburb||x?.address?.neighbourhood||x?.address?.quarter||x?.address?.district).filter(Boolean):[]; setAreas(Array.from(new Set(a))); } catch { setAreas([]); }
  };

  async function signInWithProvider(provider: "google" | "apple") {
    setError(""); setNotice("");
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) setError(error.message);
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (age < 18) { setError("Circle Panda is 18+."); return; }
    if (!form.name.trim() || !form.identifier.trim() || form.password.length < 8 || !form.country || !form.state || !form.city || !form.area || !form.gender) { setError("Please complete all required fields."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const metadata = { name: form.name.trim(), country: form.country.trim(), state_province: form.state.trim(), city: form.city.trim(), area: form.area.trim(), address_line: form.addressLine.trim(), gender: form.gender, date_of_birth: form.dob, avatar_style: form.avatar, age };
      const value=form.identifier.trim();
      const result = value.includes("@")
        ? await supabase.auth.signUp({ email:value, password:form.password, options:{data:metadata, emailRedirectTo: window.location.origin + "/auth/callback"} })
        : await supabase.auth.signUp({ phone:value, password:form.password, options:{data:metadata} });
      if (result.error) throw result.error;
      setNotice(result.data.session ? "Your Panda is ready. Welcome to the Circle 🐼" : "Account created. Complete the verification step, then log in.");
      if (result.data.session) setTimeout(()=>navigate({to:"/"}),500);
    } catch(err) { setError(err instanceof Error ? err.message : "Registration failed. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#071714] px-5 py-7 text-white">
      <div className="mx-auto max-w-2xl">
        <MovingPandaLogo />
        <div className="mt-7 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Create your Panda</p>
          <h1 className="mt-2 text-3xl font-black">Tell the Circle where you are 🐼</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">Your registration location powers nearby-first Dating and Groups. Public profiles only show your country.</p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Panda name<input required value={form.name} onChange={e=>set("name",e.target.value)} className="cp-input" placeholder="Panda Amanda" /></label>
              <label className="text-sm font-bold">Phone number or email<input required value={form.identifier} onChange={e=>set("identifier",e.target.value)} className="cp-input" placeholder="+234… or email" /></label>
              <label className="text-sm font-bold">Password<input required minLength={8} type="password" value={form.password} onChange={e=>set("password",e.target.value)} className="cp-input" placeholder="At least 8 characters" /></label>
              <label className="text-sm font-bold">Re-enter password<input required minLength={8} type="password" value={form.confirmPassword} onChange={e=>set("confirmPassword",e.target.value)} className="cp-input" placeholder="Enter your password again" /></label>
              <label className="text-sm font-bold">Country<select required disabled={loadingLocations} value={form.country} onChange={e=>{set("country",e.target.value); void loadStates(e.target.value);}} className="cp-input"><option value="">Choose country</option>{countries.map((c:any)=><option key={c.name} value={c.name}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>)}</select></label>
              <label className="text-sm font-bold">State / region<select required disabled={!form.country || states.length===0} value={form.state} onChange={e=>{set("state",e.target.value); void loadCities(form.country,e.target.value);}} className="cp-input"><option value="">Choose state / region</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
              <label className="text-sm font-bold">City / location<select required disabled={!form.state || cities.length===0} value={form.city} onChange={e=>{set("city",e.target.value); void loadAreas(form.country,form.state,e.target.value);}} className="cp-input"><option value="">Choose city / location</option>{cities.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
              <label className="text-sm font-bold">Area / neighbourhood<input required list="register-area-options" value={form.area} onChange={e=>set("area",e.target.value)} className="cp-input" placeholder="Type or choose an area" /><datalist id="register-area-options">{areas.map(s=><option key={s} value={s}/>)}</datalist></label>
              <label className="text-sm font-bold">Street / Address <span className="font-normal text-white/40">· optional</span><input value={form.addressLine} onChange={e=>set("addressLine",e.target.value)} className="cp-input" placeholder="Optional street, house or address" /></label>
              <label className="text-sm font-bold">Gender<select required value={form.gender} onChange={e=>set("gender",e.target.value)} className="cp-input"><option value="">Choose</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
              <label className="text-sm font-bold">Date of birth
                <div className="grid grid-cols-3 gap-2">
                  <select required aria-label="Birth year" value={form.dob.slice(0,4)} onChange={e=>{const y=e.target.value,m=form.dob.slice(5,7),d=form.dob.slice(8,10);set("dob",y&&m&&d?`${y}-${m}-${d}`:y?`${y}-01-01`:"");}} className="cp-input"><option value="">Year</option>{Array.from({length:123},(_,i)=>new Date().getFullYear()-18-i).map(y=><option key={y} value={y}>{y}</option>)}</select>
                  <select required aria-label="Birth month" value={form.dob.slice(5,7)} onChange={e=>{const y=form.dob.slice(0,4),m=e.target.value,d=form.dob.slice(8,10);set("dob",y&&m&&d?`${y}-${m}-${d}`:y&&m?`${y}-${m}-01`:"");}} className="cp-input"><option value="">Month</option>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m).padStart(2,"0")}>{new Date(2000,m-1,1).toLocaleString(undefined,{month:"long"})}</option>)}</select>
                  <select required aria-label="Birth day" value={form.dob.slice(8,10)} onChange={e=>{const y=form.dob.slice(0,4),m=form.dob.slice(5,7),d=e.target.value;set("dob",y&&m&&d?`${y}-${m}-${d}`:"");}} className="cp-input"><option value="">Day</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={String(d).padStart(2,"0")}>{d}</option>)}</select>
                </div>
                {age>0 ? <span className="mt-1 block text-[10px] text-white/45">Age: {age}</span> : null}
              </label>
            </div>
            <div>
              <div className="mb-2 text-sm font-bold">Choose your Panda look</div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                {looks.map(i=><button type="button" key={i} onClick={()=>set("avatar",String(i))} className={"flex aspect-square items-center justify-center rounded-2xl border text-2xl transition " + (form.avatar===String(i) ? "border-emerald-400 bg-emerald-400/15 scale-105" : "border-white/10 bg-black/20 hover:bg-white/10")}><span className={"cp-mini-panda cp-mini-panda-" + (i%4)}>🐼</span></button>)}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-sm text-white/65">
              <div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><span>Location is collected once during registration and reused automatically for nearby discovery. You won't need to keep entering it for Groups.</span></div>
              <div className="mt-3 flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><span>No profile photo upload. Circle Panda uses built-in Panda looks.</span></div>
            </div>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
            {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</div>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f] disabled:opacity-60">{busy && <Loader2 className="h-5 w-5 animate-spin" />} Join the Circle</button>
            <div className="relative my-2">
              <div className="border-t border-white/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111f1b] px-3 text-xs font-bold text-white/40">OR</span>
            </div>
            <div className="space-y-3">{platform === "ios" ? <button type="button" onClick={()=>signInWithProvider("apple")} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 font-black text-white">Continue with Apple</button> : platform === "android" ? <button type="button" onClick={()=>signInWithProvider("google")} className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black text-[#111]">Continue with Google</button> : <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>signInWithProvider("google")} className="rounded-2xl border border-white/10 bg-white px-4 py-3 font-black text-[#111]">Continue with Google</button><button type="button" onClick={()=>signInWithProvider("apple")} className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-black text-white">Continue with Apple</button></div>}</div>
          </form>
          <p className="mt-6 text-center text-sm text-white/55">Already a Panda? <Link to="/login" className="font-black text-emerald-300">Log in</Link></p>
        </div>
      </div>
    </main>
  );
}

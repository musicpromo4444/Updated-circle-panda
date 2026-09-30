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
  const [form, setForm] = useState({ name:"", identifier:"", password:"", confirmPassword:"", country:"", state:"", city:"", area:"", gender:"", dob:"", avatar:"0" });
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  useEffect(() => { const ua=navigator.userAgent||""; const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); const android=/Android/i.test(ua); setPlatform(ios?"ios":android?"android":"other"); }, []);
  const age = useMemo(() => form.dob ? Math.floor((Date.now()-new Date(form.dob).getTime())/31557600000) : 0,[form.dob]);
  const set=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));

  async function signInWithProvider(provider: "google" | "apple") {\n    setError(""); setNotice("");\n    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });\n    if (error) setError(error.message);\n  }\n\n  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (age < 18) { setError("Circle Panda is 18+."); return; }
    if (!form.name.trim() || !form.identifier.trim() || form.password.length < 8 || !form.country || !form.state || !form.city || !form.area || !form.gender) { setError("Please complete all required fields."); return; }\n    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const metadata = { name: form.name.trim(), country: form.country.trim(), state_province: form.state.trim(), city: form.city.trim(), area: form.area.trim(), gender: form.gender, date_of_birth: form.dob, avatar_style: form.avatar, age };
      const value=form.identifier.trim();
      const result = value.includes("@")
        ? await supabase.auth.signUp({ email:value, password:form.password, options:{data:metadata} })
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
              <label className="text-sm font-bold">Password<input required minLength={8} type="password" value={form.password} onChange={e=>set("password",e.target.value)} className="cp-input" placeholder="At least 8 characters" /></label>\n              <label className="text-sm font-bold">Re-enter password<input required minLength={8} type="password" value={form.confirmPassword} onChange={e=>set("confirmPassword",e.target.value)} className="cp-input" placeholder="Enter your password again" /></label>
              <label className="text-sm font-bold">Country<input required value={form.country} onChange={e=>set("country",e.target.value)} className="cp-input" placeholder="Nigeria" /></label>
              <label className="text-sm font-bold">State / region<input required value={form.state} onChange={e=>set("state",e.target.value)} className="cp-input" placeholder="Rivers" /></label>
              <label className="text-sm font-bold">City<input required value={form.city} onChange={e=>set("city",e.target.value)} className="cp-input" placeholder="Port Harcourt" /></label>
              <label className="text-sm font-bold">Area / location<input required value={form.area} onChange={e=>set("area",e.target.value)} className="cp-input" placeholder="GRA, Rumuola…" /></label>
              <label className="text-sm font-bold">Gender<select required value={form.gender} onChange={e=>set("gender",e.target.value)} className="cp-input"><option value="">Choose</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
              <label className="text-sm font-bold">Date of birth<input required type="date" value={form.dob} onChange={e=>set("dob",e.target.value)} className="cp-input" /></label>
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

import { FormEvent, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovingPandaLogo } from "@/components/auth/MovingPandaLogo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Circle Panda — Log in" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function signInWithProvider(provider: "google" | "apple") {\n    setError(""); setNotice("");\n    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });\n    if (error) setError(error.message);\n  }\n\n  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const value = identifier.trim();
      const result = value.includes("@")
        ? await supabase.auth.signInWithPassword({ email: value, password })
        : await supabase.auth.signInWithPassword({ phone: value, password });
      if (result.error) throw result.error;
      setNotice("Welcome back to the Circle 🐼");
      setTimeout(() => navigate({ to: "/" }), 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your details and try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#071714] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <MovingPandaLogo />
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Welcome back</p>
          <h1 className="mt-2 text-3xl font-black">Log in to your Circle</h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-bold">Phone number or email<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} className="cp-input" placeholder="+234… or panda@email.com" /></label>
            <label className="block text-sm font-bold">Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="cp-input" placeholder="Your password" /></label>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
            {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</div>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />} Enter the Circle</button>\n            <div className="relative my-2"><div className="border-t border-white/10" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111f1b] px-3 text-xs font-bold text-white/40">OR</span></div>\n            <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>signInWithProvider("google")} className="rounded-2xl border border-white/10 bg-white px-4 py-3 font-black text-[#111]">Continue with Google</button><button type="button" onClick={()=>signInWithProvider("apple")} className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-black text-white">Continue with Apple</button></div>
          </form>
          <p className="mt-6 text-center text-sm text-white/55">New here? <Link to="/register" className="font-black text-emerald-300">Create your Panda</Link></p>
        </div>
      </div>
    </main>
  );
}

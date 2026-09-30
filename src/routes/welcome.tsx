import { Link, createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles, Zap, Heart, MessageCircle, Play } from "lucide-react";
import { MovingPandaLogo } from "@/components/auth/MovingPandaLogo";

const pandas = ["🐼","🐼","🐼","🐼","🐼","🐼","🐼","🐼"];
const gifts = ["🎁","💎","🎟️","🪙","👑","🎮","🎁","💎"];

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Circle Panda — Welcome" },
      { name: "description", content: "Welcome to the Circle Panda community." },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071714] text-white">
      <div className="relative min-h-screen">
        <div className="cp-glow cp-glow-a" />
        <div className="cp-glow cp-glow-b" />
        <div className="pointer-events-none absolute inset-0">
          {pandas.map((p, i) => (
            <div key={i} className="cp-floating-panda" style={{ left: (5 + i * 12) + "%", animationDelay: (i * -1.7) + "s" }}>
              {p}
            </div>
          ))}
          {gifts.map((g, i) => (
            <div key={i} className="cp-floating-gift" style={{ left: (8 + i * 12) + "%", animationDelay: (i * -1.1) + "s" }}>
              {g}
            </div>
          ))}
        </div>
        <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-8"><MovingPandaLogo link={false} /></div>
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-emerald-200 backdrop-blur"><Sparkles className="h-4 w-4" /> Welcome to the circle</div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">Come in. Have a seat.<span className="block text-emerald-300">Find your people. 🐼</span></h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg">A playful anonymous community for conversations, groups, dating, games, events, gifts and surprises.</p>
          </div>
          <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[[MessageCircle,"Chat"],[Heart,"Dating"],[Gift,"Gifts"],[Play,"Games"]].map(([Icon,label]) => {
              const C = Icon as typeof MessageCircle;
              return <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur transition-transform hover:-translate-y-1"><C className="mx-auto mb-2 h-5 w-5 text-emerald-300" /><span className="text-sm font-bold">{label as string}</span></div>;
            })}
          </div>
          <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Link to="/register" className="flex-1 rounded-2xl bg-emerald-400 px-6 py-4 text-center font-black text-[#06120f] shadow-[0_12px_45px_rgba(52,211,153,.22)] transition hover:scale-[1.02]">Create my Panda</Link>
            <Link to="/login" className="flex-1 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-center font-black backdrop-blur transition hover:bg-white/10">Log in</Link>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/45"><Zap className="h-3.5 w-3.5" /> Built for the Circle • no followers • no profile photos</div>
        </section>
      </div>
    </main>
  );
}

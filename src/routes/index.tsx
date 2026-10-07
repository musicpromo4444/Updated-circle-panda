import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthModal } from "@/components/auth/AuthModal";
import { supabase } from "@/integrations/supabase/client";

function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user;
      if (user && !user.is_anonymous) {
        await navigate({ to: "/home", replace: true });
      }
    };
    void checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user;
      if (user && !user.is_anonymous) {
        void navigate({ to: "/home", replace: true });
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const openAuth = (tab: "signin" | "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071412] text-white">
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 42 }).map((_, i) => (
          <span
            key={i}
            className="absolute animate-pulse text-[10px] text-emerald-200/70"
            style={{
              left: `${(i * 29) % 100}%`,
              top: `${(i * 47) % 100}%`,
              animationDelay: `${(i % 8) * 220}ms`,
            }}
          >✦</span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52">
        <div className="absolute bottom-8 left-[7%] animate-bounce text-6xl" style={{ animationDuration: "3.2s" }}>🐼</div>
        <div className="absolute bottom-4 left-[43%] animate-bounce text-7xl" style={{ animationDuration: "4s", animationDelay: "500ms" }}>🐼</div>
        <div className="absolute bottom-10 right-[7%] animate-bounce text-6xl" style={{ animationDuration: "3.5s", animationDelay: "900ms" }}>🐼</div>
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 animate-pulse text-8xl drop-shadow-[0_0_28px_rgba(110,231,183,.35)]">🐼</div>
        <div className="mb-2 text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">Circle Panda</div>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          Your people. Your circle. Your Panda.
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-white/65">
          Confessions, conversations, dating, groups, games and Panda moments — all in one circle.
        </p>

        <div className="mt-9 grid w-full max-w-sm gap-3">
          <button type="button" onClick={() => openAuth("signin")}
            className="rounded-2xl bg-emerald-400 px-6 py-4 font-bold text-[#071412] shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02]">
            Login
          </button>
          <button type="button" onClick={() => openAuth("signup")}
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold backdrop-blur transition hover:bg-white/10">
            Sign Up
          </button>
        </div>

        <div className="mt-12 flex items-center gap-4 text-2xl opacity-70">
          <span>🌙</span><span>✨</span><span>⭐</span><span>🐼</span><span>💫</span>
        </div>
      </section>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
        onAuthenticated={() => void navigate({ to: "/home", replace: true })}
      />
    </main>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Circle Panda" },
      { name: "description", content: "Enter Circle Panda." },
    ],
  }),
  component: LandingPage,
});

export default LandingPage;

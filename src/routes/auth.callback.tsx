import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Circle Panda — Confirming account" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your Panda account…");

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const url = new URL(window.location.href);
      const errorDescription = url.searchParams.get("error_description");
      if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        return;
      }

      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        if (!cancelled) setMessage("Account confirmed. Taking you into the Circle…");
        window.setTimeout(() => {
          if (!cancelled) void navigate({ to: "/" });
        }, 350);
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setMessage(error.message);
          return;
        }
        if (!cancelled) setMessage("Account confirmed. Taking you into the Circle…");
        window.setTimeout(() => {
          if (!cancelled) void navigate({ to: "/" });
        }, 350);
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as "signup" | "email" | "recovery" | "invite" | null;
      if (tokenHash && (type === "signup" || type === "email")) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          if (!cancelled) setMessage(error.message);
          return;
        }
        if (!cancelled) setMessage("Account confirmed. Taking you into the Circle…");
        window.setTimeout(() => {
          if (!cancelled) void navigate({ to: "/" });
        }, 350);
        return;
      }

      if (!cancelled) {
        setMessage("The confirmation link is missing or has expired. Please request a new email and try again.");
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071714] px-5 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.055] p-7 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-4xl">🐼</div>
        <h1 className="mt-5 text-2xl font-black">Circle Panda</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">{message}</p>
      </section>
    </main>
  );
}

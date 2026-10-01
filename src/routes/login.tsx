import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthModal } from "@/components/auth/AuthModal";

export default function LoginPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl border border-primary/25 bg-primary/15 text-4xl">🐼</div>
          <h1 className="font-display text-2xl font-bold">Welcome to Circle Panda</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in or create your Panda account.</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Sign in / Sign up
          </button>
        </div>
      </div>
      <AuthModal
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) void navigate({ to: "/" });
        }}
        onAuthenticated={() => void navigate({ to: "/" })}
      />
    </main>
  );
}

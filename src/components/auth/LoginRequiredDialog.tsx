import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

export const LOGIN_REQUIRED_EVENT = "circle-panda:login-required";

export function requestLogin(reason?: string) {
  window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT, { detail: { reason } }));
}

export function LoginRequiredDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      setReason(detail?.reason ?? "");
      setOpen(true);
    };
    window.addEventListener(LOGIN_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(LOGIN_REQUIRED_EVENT, handler);
  }, []);
  return (
    <AuthModal
      open={open}
      onOpenChange={setOpen}
      defaultTab="signin"
    />
  );
}

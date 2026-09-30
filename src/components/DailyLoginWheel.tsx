import { useEffect, useState } from "react";
import { SpinWheel } from "@/components/SpinWheel";
import { useStore } from "@/lib/store";

/**
 * Daily login entry point.
 * Reward selection, cooldowns, fulfilment and qualification are handled by
 * the server-authoritative Supabase reward engine.
 */
export function DailyLoginWheel() {
  const { canSpin } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (canSpin) setOpen(true);
  }, [canSpin]);

  return <SpinWheel open={open} onOpenChange={setOpen} />;
}

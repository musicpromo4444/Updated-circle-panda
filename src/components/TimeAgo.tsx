import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/store";

/** Renders relative time only after hydration to avoid SSR/client mismatch. */
export function TimeAgo({ at, className }: { at: number; className?: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(timeAgo(at));
    const i = setInterval(() => setLabel(timeAgo(at)), 30000);
    return () => clearInterval(i);
  }, [at]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}

import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { PandaAvatar } from "@/components/PandaAvatar";

type VipIdentityProps = {
  isVip?: boolean;
  seed?: string;
  avatar?: ReactNode;
  name?: string;
  compact?: boolean;
  className?: string;
};

/** Shared VIP identity treatment. Use this anywhere a Panda identity is rendered. */
export function VipIdentity({ isVip = false, seed = "panda", avatar = "🐼", name, compact = false, className }: VipIdentityProps) {
  const colors = ["gold", "emerald", "cyan", "violet", "rose"] as const;
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = colors[hash % colors.length];

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className={cn("vip-avatar-ring relative grid shrink-0 place-items-center rounded-full", `vip-ring-${color}`, compact ? "size-8 text-base" : "size-11 text-xl")} data-vip={isVip ? "true" : "false"}>
        {isVip ? <><span className="vip-ring-spark vip-ring-spark-a">✦</span><span className="vip-ring-spark vip-ring-spark-b">✧</span></> : null}
        <span className="relative z-10 grid size-[calc(100%-5px)] place-items-center rounded-full bg-secondary shadow-inner"><PandaAvatar avatar={avatar} size={compact ? "sm" : "md"} /></span>
      </span>
      {name ? <span className="min-w-0 truncate font-semibold">{name}</span> : null}
      {isVip ? <span className={cn("vip-chip shrink-0", compact && "vip-chip-compact")}><Crown className="size-3" /> VIP <Sparkles className="size-3" /></span> : null}
    </div>
  );
}

export function vipContentClass(isVip?: boolean) {
  return isVip ? "vip-content-card" : "";
}

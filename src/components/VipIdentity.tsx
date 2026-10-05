import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PandaAvatar } from "@/components/PandaAvatar";

type VipIdentityProps = {
  isVip?: boolean;
  seed?: string;
  avatar?: ReactNode;
  name?: string;
  compact?: boolean;
  className?: string;
};

const VIP_EFFECTS = [
  "fire",
  "thunder",
  "sparkles",
  "lightning",
  "sparks",
  "aura",
  "chi",
  "bubbles",
  "comet",
  "prism",
] as const;

/**
 * Shared VIP identity treatment.
 * The panda face is always centered in a fixed core. VIP effects live in
 * a separate outer layer so particles can move without moving or resizing
 * the avatar, its circle, its name, or fixed navigation.
 */
export function VipIdentity({
  isVip = false,
  seed = "panda",
  avatar = "🐼",
  name,
  compact = false,
  className,
}: VipIdentityProps) {
  const [effect, setEffect] = useState<(typeof VIP_EFFECTS)[number]>("sparkles");

  useEffect(() => {
    if (!isVip) return;
    let hash = 0;
    for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const seededIndex = hash % VIP_EFFECTS.length;
    const randomOffset = Math.floor(Math.random() * VIP_EFFECTS.length);
    setEffect(VIP_EFFECTS[(seededIndex + randomOffset) % VIP_EFFECTS.length]);
  }, [isVip, seed]);

  const size = compact ? "size-8 text-base" : "size-11 text-xl";

  return (
    <div className={cn("vip-avatar-identity flex min-w-0 gap-2", className)}>
      <span className="vip-avatar-stack">
        <span
          className={cn(
            "vip-avatar-ring relative grid shrink-0 place-items-center rounded-full",
            size,
          )}
          data-vip={isVip ? "true" : "false"}
          data-vip-effect={isVip ? effect : "none"}
          aria-label={isVip ? "VIP panda" : "Panda avatar"}
        >
          {isVip ? (
            <span className="vip-effect-layer" data-effect={effect} aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="vip-effect-particle" />
              ))}
            </span>
          ) : null}

          <span className="vip-avatar-core">
            <PandaAvatar avatar={avatar} size={compact ? "sm" : "md"} />
          </span>
        </span>

        {isVip ? (
          <span className="vip-stamp" data-compact={compact ? "true" : "false"}>
            VIP
          </span>
        ) : null}
      </span>

      {name ? <span className="min-w-0 self-center truncate font-semibold">{name}</span> : null}
    </div>
  );
}

export function vipContentClass(isVip?: boolean) {
  return isVip ? "vip-content-card" : "";
}

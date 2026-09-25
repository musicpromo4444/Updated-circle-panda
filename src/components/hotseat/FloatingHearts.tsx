import { useEffect, useState } from "react";

export type FloatingHeartItem = {
  id: string;
  x: number;
  y: number;
  color: string;
  emoji: string;
  rotation: number;
};

export function FloatingHearts({ hearts }: { hearts: FloatingHeartItem[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="animate-float-heart absolute text-3xl select-none"
          style={
            {
              left: `${heart.x}px`,
              top: `${heart.y}px`,
              color: heart.color,
              filter: `drop-shadow(0 0 10px ${heart.color})`,
              "--rot": `${heart.rotation}deg`,
            } as React.CSSProperties
          }
        >
          {heart.emoji}
        </div>
      ))}
    </div>
  );
}

export function useFloatingHearts() {
  const [hearts, setHearts] = useState<FloatingHeartItem[]>([]);

  const spawnHeart = (x?: number, y?: number) => {
    const emojis = ["❤️", "💖", "🔥", "✨", "🧡", "🐼"];
    const colors = ["#ef4444", "#ec4899", "#f97316", "#eab308", "#8b5cf6"];

    const targetX = x ?? window.innerWidth - 65 + (Math.random() * 30 - 15);
    const targetY = y ?? window.innerHeight - 280 + (Math.random() * 20 - 10);

    const newHeart: FloatingHeartItem = {
      id: `${Date.now()}-${Math.random()}`,
      x: targetX,
      y: targetY,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.floor(Math.random() * 30) - 15,
    };

    setHearts((prev) => [...prev.slice(-25), newHeart]);
  };

  useEffect(() => {
    if (hearts.length === 0) return;
    const timeout = setTimeout(() => {
      setHearts((prev) => prev.slice(1));
    }, 1400);
    return () => clearTimeout(timeout);
  }, [hearts]);

  return { hearts, spawnHeart };
}

import { useEffect, useState } from "react";

export function CirclePandaLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="Circle Panda loading"
      className={fullScreen
        ? "fixed inset-0 z-[9999] grid place-items-center bg-background/95 backdrop-blur-md"
        : "grid min-h-[180px] place-items-center"}
    >
      <div className="relative grid size-28 place-items-center">
        <span className="absolute inset-1 rounded-full border-[5px] border-transparent"
          style={{
            borderTopColor: "#22c55e",
            borderRightColor: "#06b6d4",
            borderBottomColor: "#8b5cf6",
            borderLeftColor: "#f43f5e",
            animation: "circle-panda-loader-spin 1.15s linear infinite",
          }}
        />
        <span className="absolute inset-3 rounded-full border border-white/10" />
        <span
          className="relative grid size-16 place-items-center rounded-full bg-card text-4xl shadow-[0_0_30px_rgba(34,197,94,.22)]"
          style={{ animation: "circle-panda-loader-pulse 1.2s ease-in-out infinite" }}
        >
          🐼
        </span>
      </div>
      <span className="sr-only">Loading Circle Panda…</span>
    </div>
  );
}

import { Link } from "@tanstack/react-router";

export function MovingPandaLogo({ link = true }: { link?: boolean }) {
  const logo = (
    <div className="cp-panda-logo-wrap" aria-label="Circle Panda">
      <div className="cp-panda-logo">🐼</div>
      <div className="mt-1 text-center text-[11px] font-black tracking-[0.22em] text-white/80">CIRCLE PANDA</div>
    </div>
  );
  return link ? <Link to="/welcome" className="block">{logo}</Link> : logo;
}

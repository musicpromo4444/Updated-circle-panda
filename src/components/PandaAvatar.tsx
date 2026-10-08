import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PandaAvatarProps = { avatar?: ReactNode; size?: "sm"|"md"|"lg"; className?: string };

const HEADS = ["🎩","🧢","👑","🎧","🎀","🪖","🤠","🧑‍🚀"];
const GLASSES = ["🕶️","👓","🥽"];
const FACES = ["😊","🙂","😎","😴","😏","😠","😮"];
const COSMETICS = ["✨","🔥","🌸","💎","⚡","🦋","🌈","❤️","💫"];

function pick(text:string,values:string[]){return values.find(value=>text.includes(value))??""}

export function PandaAvatar({avatar="🐼",size="md",className}:PandaAvatarProps){
 const text=typeof avatar==="string"?avatar:"🐼";
 const head=pick(text,HEADS), glasses=pick(text,GLASSES), face=pick(text,FACES), cosmetic=pick(text,COSMETICS);
 const sizes={
  sm:{box:"size-8",panda:"text-lg",head:"text-sm",glasses:"text-[10px]",face:"text-[8px]",cosmetic:"text-[8px]"},
  md:{box:"size-11",panda:"text-2xl",head:"text-lg",glasses:"text-sm",face:"text-[9px]",cosmetic:"text-[10px]"},
  lg:{box:"size-20",panda:"text-5xl",head:"text-3xl",glasses:"text-2xl",face:"text-lg",cosmetic:"text-base"},
 }[size];
 return <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden aspect-square rounded-xl bg-secondary/70",sizes.box,className)} aria-label="Panda avatar">
   <span className="absolute inset-0 grid place-items-center">
     <span className={cn("relative z-10 block origin-center leading-none text-center",sizes.panda)}>🐼</span>
   </span>
   {head?<span className={cn("pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 leading-none",sizes.head)} style={{top:"8%"}}>{head}</span>:null}
   {glasses?<span className={cn("pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 leading-none",sizes.glasses)} style={{top:"42%"}}>{glasses}</span>:null}
   
   {cosmetic?<span className={cn("pointer-events-none absolute right-0 top-0 z-40 leading-none",sizes.cosmetic)}>{cosmetic}</span>:null}
 </span>;
}

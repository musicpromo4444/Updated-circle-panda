import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type LedgerRow = { id:string; amount:number; reason:string; reference_type:string; created_at:string };

export function WalletHistory() {
  const [rows,setRows]=useState<LedgerRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true); setError("");
      const { data, error } = await (supabase as any)
        .from("bc_ledger")
        .select("id,amount,reason,reference_type,created_at")
        .order("created_at",{ascending:false})
        .limit(12);
      if(cancelled) return;
      if(error){ setError("Wallet history is temporarily unavailable."); setRows([]); }
      else setRows((data??[]) as LedgerRow[]);
      setLoading(false);
    })();
    return ()=>{cancelled=true};
  },[]);

  return <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><History className="size-4"/></span>
        <div><h3 className="font-display text-base font-bold">Wallet Activity</h3><p className="text-[11px] text-muted-foreground">Your latest Panda Coin credits and charges.</p></div>
      </div>
    </div>
    {loading ? <div className="py-6 flex justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin"/></div>
    : error ? <p className="text-xs text-muted-foreground py-3">{error}</p>
    : rows.length===0 ? <p className="text-xs text-muted-foreground py-3">No wallet transactions yet.</p>
    : <div className="divide-y divide-border/70">{rows.map(r=>{
      const positive=r.amount>=0;
      return <div key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${positive?"bg-emerald-500/10 text-emerald-600":"bg-red-500/10 text-red-600"}`}>{positive?<ArrowDownLeft className="size-4"/>:<ArrowUpRight className="size-4"/>}</span>
          <div className="min-w-0"><p className="text-xs font-semibold truncate">{r.reason}</p><p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></div>
        </div>
        <span className={`text-xs font-black tabular-nums ${positive?"text-emerald-600":"text-red-600"}`}>{positive?"+":""}{Number(r.amount).toLocaleString()} BC</span>
      </div>
    })}</div>}
  </section>;
}

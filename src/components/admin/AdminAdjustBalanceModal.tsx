import { useState } from "react";
import { Coins, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminUser } from "./adminTypes";

interface AdminAdjustBalanceModalProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (userId: string, amount: number, reason: string) => void;
}

export function AdminAdjustBalanceModal({
  user,
  open,
  onClose,
  onConfirm,
}: AdminAdjustBalanceModalProps) {
  const [operation, setOperation] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState<number>(50);
  const [reason, setReason] = useState<string>("Community event bonus");

  if (!user) return null;

  const effectiveAmount = operation === "add" ? Math.abs(amount) : -Math.abs(amount);
  const projectedBalance = Math.max(0, user.coins + effectiveAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    onConfirm(user.id, effectiveAmount, reason.trim() || "Admin manual adjustment");
    onClose();
  };

  const PRESETS = [50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-2xl">
              {user.avatar}
            </span>
            <div>
              <DialogTitle className="font-display text-lg font-bold">
                Adjust BC Balance
              </DialogTitle>
              <DialogDescription className="text-xs">
                Modifying Virtual Coins for <strong>{user.username}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* CURRENT & PROJECTED BALANCE SUMMARY */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/80 bg-secondary/30 p-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Current Balance</span>
              <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                🪙 {user.coins} BC
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Projected Balance
              </span>
              <p
                className={`mt-0.5 font-display text-lg font-bold ${
                  operation === "add" ? "text-emerald-500" : "text-destructive"
                }`}
              >
                🪙 {projectedBalance} BC
              </p>
            </div>
          </div>

          {/* ADD OR DEDUCT TOGGLE */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Adjustment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperation("add")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  operation === "add"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-500 shadow-xs"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="size-3.5" />
                <span>Credit (+ Add)</span>
              </button>

              <button
                type="button"
                onClick={() => setOperation("deduct")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  operation === "deduct"
                    ? "border-destructive bg-destructive/15 text-destructive shadow-xs"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Minus className="size-3.5" />
                <span>Debit (- Deduct)</span>
              </button>
            </div>
          </div>

          {/* AMOUNT INPUT */}
          <div className="space-y-1.5">
            <Label htmlFor="bc-amount" className="text-xs font-semibold">
              Amount (BC)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🪙</span>
              <Input
                id="bc-amount"
                type="number"
                min={1}
                max={50000}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="pl-8 font-display font-semibold"
              />
            </div>

            {/* PRESET CHIPS */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className="rounded-lg border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary"
                >
                  {operation === "add" ? `+${p}` : `-${p}`} BC
                </button>
              ))}
            </div>
          </div>

          {/* REASON / AUDIT NOTE */}
          <div className="space-y-1.5">
            <Label htmlFor="reason-note" className="text-xs font-semibold">
              Reason / Transaction Note
            </Label>
            <Input
              id="reason-note"
              type="text"
              placeholder="e.g. Bug bounty reward, Community host bonus, Refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className={
                operation === "add"
                  ? "bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                  : "bg-destructive font-semibold text-white hover:bg-destructive/90"
              }
            >
              <Coins className="mr-1.5 size-4" />
              <span>Confirm {operation === "add" ? `+${amount}` : `-${amount}`} BC</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

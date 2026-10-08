import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const PROFILE_REQUIRED_EVENT = "circle-panda:profile-required";

export function requestProfileCompletion(reason?: string) {
  window.dispatchEvent(new CustomEvent(PROFILE_REQUIRED_EVENT, { detail: { reason } }));
}

export function ProfileRequiredDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      setReason(detail?.reason ?? "");
      setOpen(true);
    };
    window.addEventListener(PROFILE_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(PROFILE_REQUIRED_EVENT, handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            {reason ? "Complete your profile to " + reason + "." : "Complete your profile to continue."}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => { setOpen(false); void navigate({ to: "/profile" }); }}>
          Complete Profile
        </Button>
      </DialogContent>
    </Dialog>
  );
}

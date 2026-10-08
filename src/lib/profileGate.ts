import { supabase } from "@/integrations/supabase/client";
import { requestProfileCompletion } from "@/components/auth/ProfileRequiredDialog";

export async function isProfileComplete(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid || auth.user?.is_anonymous) return false;
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("date_of_birth,country")
    .eq("id", uid)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.date_of_birth && String(data?.country ?? "").trim());
}

export async function requireCompleteProfile(action: string): Promise<boolean> {
  const complete = await isProfileComplete();
  if (complete) return true;
  requestProfileCompletion(action);
  return false;
}

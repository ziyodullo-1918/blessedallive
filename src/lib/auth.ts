import { supabase } from "@/integrations/supabase/client";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

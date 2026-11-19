import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getOwnerPageAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "unauthenticated" };
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError) return { status: "unavailable" };
  if (role?.role !== "owner") return { status: "forbidden" };
  return { status: "owner", user: userData.user };
}

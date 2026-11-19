import "server-only";
import { AppError } from "@/server/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
  }
  return { supabase, user: data.user };
}

export async function requireOwner() {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: role, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new AppError(503, "AUTHORIZATION_UNAVAILABLE", "No fue posible verificar tus permisos.");
  }
  if (role?.role !== "owner") {
    throw new AppError(403, "FORBIDDEN", "Esta función requiere el rol propietario.");
  }

  return { supabase, user };
}

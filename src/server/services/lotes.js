import "server-only";
import { AppError, mapSupabaseError } from "@/server/errors";
import {
  createLote,
  getAdminLote,
  getPublicLote,
  listAdminLotes,
  listManzanos,
  listPublicManzanos,
  listPublicLotes,
  updateLote,
} from "@/server/repositories/lotes";

function throwOnDatabaseError(error) {
  if (!error) return;
  const mapped = mapSupabaseError(error);
  if (mapped) throw mapped;
  throw new AppError(503, "DATA_UNAVAILABLE", "No fue posible consultar los lotes.");
}

export async function queryAdminLotes(supabase, query) {
  const result = await listAdminLotes(supabase, query);
  throwOnDatabaseError(result.error);
  return result;
}

export async function queryAdminLote(supabase, id) {
  const result = await getAdminLote(supabase, id);
  throwOnDatabaseError(result.error);
  if (!result.data) throw new AppError(404, "NOT_FOUND", "No se encontró el lote solicitado.");
  return result.data;
}

export async function registerLote(supabase, input) {
  const result = await createLote(supabase, input);
  throwOnDatabaseError(result.error);
  return queryAdminLote(supabase, result.data);
}

export async function editLote(supabase, id, version, fields) {
  const result = await updateLote(supabase, id, version, fields);
  throwOnDatabaseError(result.error);
  return queryAdminLote(supabase, id);
}

export async function queryManzanos(supabase) {
  const result = await listManzanos(supabase);
  throwOnDatabaseError(result.error);
  return result.data ?? [];
}

export async function queryPublicManzanos(supabase) {
  const result = await listPublicManzanos(supabase);
  throwOnDatabaseError(result.error);
  return result.data ?? [];
}

export async function queryPublicLotes(supabase, query) {
  const result = await listPublicLotes(supabase, query);
  throwOnDatabaseError(result.error);
  return result;
}

export async function queryPublicLote(supabase, id) {
  const result = await getPublicLote(supabase, id);
  throwOnDatabaseError(result.error);
  if (!result.data) throw new AppError(404, "NOT_FOUND", "No se encontró un lote disponible.");
  return result.data;
}

import "server-only";
import { AppError, mapSupabaseError } from "@/server/errors";
import {
  createSaleClient,
  getPaymentReceipt,
  getSale,
  insertSale,
  insertSalePayment,
  listSaleClients,
  listSales,
} from "@/server/repositories/ventas";

function throwOnDatabaseError(error) {
  if (!error) return;
  const mapped = mapSupabaseError(error);
  if (mapped) throw mapped;
  throw new AppError(503, "DATA_UNAVAILABLE", "No fue posible consultar la operación.");
}

export async function querySaleClients(supabase, query) {
  const result = await listSaleClients(supabase, query);
  throwOnDatabaseError(result.error);
  return result.data;
}

export async function registerSaleClient(supabase, input) {
  const result = await createSaleClient(supabase, input);
  throwOnDatabaseError(result.error);
  return { id: result.data, ...input };
}

export async function querySales(supabase, query) {
  const result = await listSales(supabase, query);
  throwOnDatabaseError(result.error);
  return result;
}

export async function querySale(supabase, id) {
  const result = await getSale(supabase, id);
  throwOnDatabaseError(result.error);
  if (!result.data) throw new AppError(404, "NOT_FOUND", "No se encontró la venta solicitada.");
  return result.data;
}

export async function registerSale(supabase, input) {
  const result = await insertSale(supabase, input);
  throwOnDatabaseError(result.error);
  return querySale(supabase, result.data);
}

export async function querySaleBalance(supabase, id) {
  const sale = await querySale(supabase, id);
  return {
    venta_id: sale.id,
    precio_final: sale.precio_final,
    total_pagado: sale.total_pagado,
    saldo_pendiente: sale.saldo_pendiente,
    moneda: sale.moneda,
    pagos: sale.pagos,
  };
}

export async function registerSalePayment(supabase, saleId, input) {
  const result = await insertSalePayment(supabase, saleId, input);
  throwOnDatabaseError(result.error);
  const [sale, receipt] = await Promise.all([
    querySale(supabase, saleId),
    queryPaymentReceipt(supabase, result.data),
  ]);
  return { sale, recibo: receipt };
}

export async function queryPaymentReceipt(supabase, id) {
  const result = await getPaymentReceipt(supabase, id);
  throwOnDatabaseError(result.error);
  if (!result.data) throw new AppError(404, "NOT_FOUND", "No se encontró el recibo solicitado.");
  return result.data;
}

import "server-only";
import { unstable_rethrow } from "next/navigation";

export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiErrorResponse(error) {
  unstable_rethrow(error);
  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error("API request failed:", error?.message ?? "Unknown error");
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." } },
    { status: 500 },
  );
}

export function mapSupabaseError(error) {
  if (error?.code === "23505") {
    if (error.constraint === "clientes_identificacion_uidx") {
      return new AppError(409, "CLIENT_CONFLICT", "Ya existe un cliente con esa identificación.");
    }
    if (error.constraint === "una_venta_vigente_por_lote") {
      return new AppError(409, "SALE_CONFLICT", "El lote ya tiene una venta vigente.");
    }
    if (error.message?.includes("IDEMPOTENCY_KEY_REUSED")) {
      return new AppError(409, "IDEMPOTENCY_CONFLICT", "La clave de reintento ya se usó con otros datos.");
    }
    return new AppError(409, "LOT_CONFLICT", "Ya existe ese número de lote en el manzano.");
  }
  if (error?.code === "23503") {
    return new AppError(422, "INVALID_REFERENCE", "Uno de los registros relacionados ya no existe.");
  }
  if (error?.code === "40001") {
    return new AppError(409, "CONCURRENT_UPDATE", "El lote cambió desde que abriste el formulario. Recarga para ver la versión actual.");
  }
  if (error?.code === "P0002") {
    return new AppError(404, "NOT_FOUND", "No se encontró el recurso solicitado.");
  }
  if (error?.code === "42501") {
    return new AppError(403, "FORBIDDEN", "No tienes permisos para realizar esta operación.");
  }
  if (error?.code === "22023") {
    return new AppError(422, "INVALID_INPUT", "Los datos enviados no son válidos.");
  }
  if (error?.code === "P0001") {
    if (error.message === "LOT_NOT_AVAILABLE") {
      return new AppError(409, "LOT_NOT_AVAILABLE", "El lote ya no está habilitado y disponible para la venta.");
    }
    if (error.message === "PAYMENT_EXCEEDS_BALANCE") {
      return new AppError(409, "PAYMENT_EXCEEDS_BALANCE", "El importe supera el saldo pendiente de la venta.");
    }
    if (error.message === "PAYMENT_CURRENCY_MISMATCH") {
      return new AppError(422, "PAYMENT_CURRENCY_MISMATCH", "La moneda del pago debe coincidir con la moneda de la venta.");
    }
    if (error.message === "SALE_NOT_PAYABLE") {
      return new AppError(409, "SALE_NOT_PAYABLE", "La venta no admite nuevos pagos.");
    }
    if (error.message === "SALE_PAYMENT_DATA_INCONSISTENT" || error.message === "SALE_BALANCE_INCONSISTENT") {
      return new AppError(409, "SALE_DATA_INCONSISTENT", "Los datos de pago de la venta requieren revisión.");
    }
  }
  return null;
}

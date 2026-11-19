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
    return new AppError(409, "LOT_CONFLICT", "Ya existe ese número de lote en el manzano.");
  }
  if (error?.code === "23503") {
    return new AppError(422, "INVALID_REFERENCE", "El manzano seleccionado ya no existe.");
  }
  if (error?.code === "40001") {
    return new AppError(409, "CONCURRENT_UPDATE", "El lote cambió desde que abriste el formulario. Recarga para ver la versión actual.");
  }
  if (error?.code === "P0002") {
    return new AppError(404, "NOT_FOUND", "No se encontró el lote solicitado.");
  }
  if (error?.code === "42501") {
    return new AppError(403, "FORBIDDEN", "No tienes permisos para realizar esta operación.");
  }
  if (error?.code === "22023") {
    return new AppError(422, "INVALID_INPUT", "Los datos enviados no son válidos.");
  }
  return null;
}

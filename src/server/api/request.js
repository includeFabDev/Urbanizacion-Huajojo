import "server-only";
import { AppError } from "@/server/errors";

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "El cuerpo de la solicitud debe ser JSON válido.");
  }
}

export function queryValidationError(issues) {
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "Revisa los filtros enviados.",
    issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  );
}

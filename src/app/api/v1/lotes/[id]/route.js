import { NextResponse } from "next/server";
import { z } from "zod";
import { updateLoteSchema } from "@/features/lotes/schemas";
import { requireOwner } from "@/server/auth/authorization";
import { apiErrorResponse, AppError } from "@/server/errors";
import { readJsonBody, queryValidationError } from "@/server/api/request";
import {
  editLote,
  queryAdminLote,
} from "@/server/services/lotes";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw new AppError(400, "INVALID_ID", "El identificador del lote no es válido.");
    }

    const data = await queryAdminLote(supabase, id);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw new AppError(400, "INVALID_ID", "El identificador del lote no es válido.");
    }

    const body = await readJsonBody(request);
    const parsed = updateLoteSchema.safeParse(body);
    if (!parsed.success) throw queryValidationError(parsed.error.issues);

    const data = await editLote(
      supabase,
      id,
      parsed.data.version,
      parsed.data.fields,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

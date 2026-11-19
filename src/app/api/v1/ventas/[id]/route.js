import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/server/auth/authorization";
import { queryValidationError } from "@/server/api/request";
import { apiErrorResponse, AppError } from "@/server/errors";
import { querySale } from "@/server/services/ventas";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw queryValidationError([{ path: ["id"], message: "El identificador no es válido." }]);
    }
    const data = await querySale(supabase, id);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

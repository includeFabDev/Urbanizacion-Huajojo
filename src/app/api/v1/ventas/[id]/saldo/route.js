import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/server/auth/authorization";
import { queryValidationError } from "@/server/api/request";
import { apiErrorResponse } from "@/server/errors";
import { querySaleBalance } from "@/server/services/ventas";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw queryValidationError([{ path: ["id"], message: "El identificador no es válido." }]);
    }
    const data = await querySaleBalance(supabase, id);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

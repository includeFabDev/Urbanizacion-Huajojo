import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { apiErrorResponse, AppError } from "@/server/errors";
import { queryPublicLote } from "@/server/services/lotes";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw new AppError(400, "INVALID_ID", "El identificador del lote no es válido.");
    }

    const supabase = createSupabasePublicServerClient();
    const data = await queryPublicLote(supabase, id);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

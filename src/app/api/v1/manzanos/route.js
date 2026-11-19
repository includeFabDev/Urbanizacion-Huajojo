import { NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/authorization";
import { apiErrorResponse } from "@/server/errors";
import { queryManzanos } from "@/server/services/lotes";

export async function GET() {
  try {
    const { supabase } = await requireOwner();
    const data = await queryManzanos(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { apiErrorResponse } from "@/server/errors";
import { queryPublicManzanos } from "@/server/services/lotes";

export async function GET() {
  try {
    const data = await queryPublicManzanos(createSupabasePublicServerClient());
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { publicListQuerySchema } from "@/features/lotes/schemas";
import { apiErrorResponse } from "@/server/errors";
import { queryValidationError } from "@/server/api/request";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { queryPublicLotes } from "@/server/services/lotes";

export async function GET(request) {
  try {
    const parsed = publicListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) throw queryValidationError(parsed.error.issues);

    const supabase = createSupabasePublicServerClient();
    const result = await queryPublicLotes(supabase, parsed.data);
    return NextResponse.json({
      data: result.items,
      meta: {
        page: parsed.data.page,
        page_size: parsed.data.page_size,
        total: result.total,
        total_pages: Math.ceil(result.total / parsed.data.page_size),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import {
  adminListQuerySchema,
  createLoteSchema,
} from "@/features/lotes/schemas";
import { requireOwner } from "@/server/auth/authorization";
import { apiErrorResponse, AppError } from "@/server/errors";
import { readJsonBody, queryValidationError } from "@/server/api/request";
import { queryAdminLotes, registerLote } from "@/server/services/lotes";

export async function GET(request) {
  try {
    const { supabase } = await requireOwner();
    const parsed = adminListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) throw queryValidationError(parsed.error.issues);

    const result = await queryAdminLotes(supabase, parsed.data);
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

export async function POST(request) {
  try {
    const { supabase } = await requireOwner();
    const body = await readJsonBody(request);
    const parsed = createLoteSchema.safeParse(body);
    if (!parsed.success) throw queryValidationError(parsed.error.issues);

    const data = await registerLote(supabase, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

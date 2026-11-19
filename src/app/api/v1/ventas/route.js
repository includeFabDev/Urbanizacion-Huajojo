import { NextResponse } from "next/server";
import { createSaleSchema, saleListQuerySchema } from "@/features/ventas/schemas";
import { requireOwner } from "@/server/auth/authorization";
import { readJsonBody, queryValidationError } from "@/server/api/request";
import { apiErrorResponse } from "@/server/errors";
import { querySales, registerSale } from "@/server/services/ventas";

export async function GET(request) {
  try {
    const { supabase } = await requireOwner();
    const parsed = saleListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) throw queryValidationError(parsed.error.issues);
    const result = await querySales(supabase, parsed.data);
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
    const parsed = createSaleSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw queryValidationError(parsed.error.issues);
    const data = await registerSale(supabase, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

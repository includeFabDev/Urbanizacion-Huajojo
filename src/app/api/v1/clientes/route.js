import { NextResponse } from "next/server";
import { customerQuerySchema, customerSchema } from "@/features/ventas/schemas";
import { requireOwner } from "@/server/auth/authorization";
import { readJsonBody, queryValidationError } from "@/server/api/request";
import { apiErrorResponse } from "@/server/errors";
import { querySaleClients, registerSaleClient } from "@/server/services/ventas";

export async function GET(request) {
  try {
    const { supabase } = await requireOwner();
    const parsed = customerQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) throw queryValidationError(parsed.error.issues);
    const data = await querySaleClients(supabase, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const { supabase } = await requireOwner();
    const parsed = customerSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw queryValidationError(parsed.error.issues);
    const data = await registerSaleClient(supabase, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentSchema } from "@/features/ventas/schemas";
import { requireOwner } from "@/server/auth/authorization";
import { readJsonBody, queryValidationError } from "@/server/api/request";
import { apiErrorResponse } from "@/server/errors";
import { querySale, registerSalePayment } from "@/server/services/ventas";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw queryValidationError([{ path: ["id"], message: "El identificador no es válido." }]);
    }
    const sale = await querySale(supabase, id);
    return NextResponse.json({ data: sale.pagos });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw queryValidationError([{ path: ["id"], message: "El identificador no es válido." }]);
    }
    const parsed = createPaymentSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw queryValidationError(parsed.error.issues);
    const data = await registerSalePayment(supabase, id, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

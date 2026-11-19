import { z } from "zod";

const moneyPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const moneyString = z.string().regex(moneyPattern, "Usa un importe con hasta dos decimales.");
const positiveMoney = moneyString.refine(
  (value) => /[1-9]/.test(value),
  "El importe debe ser mayor que cero.",
);
const currency = z.string().regex(/^[A-Z]{3}$/, "Usa un código de moneda de tres letras.");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.").refine(
  (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  },
  "Selecciona una fecha válida.",
);
const optionalText = (max) => z.string().trim().max(max).optional().transform((value) => value || null);
const customerFields = {
  nombre: z.string().trim().min(1, "El nombre del cliente es obligatorio.").max(160),
  identificacion: optionalText(80),
  telefono: optionalText(40),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional().transform((value) => value || null),
  direccion: optionalText(240),
};

export const customerSchema = z.object(customerFields).strict();

export const customerQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const createSaleSchema = z.object({
  lote_id: z.string().uuid(),
  cliente_id: z.string().uuid().optional(),
  cliente: customerSchema.optional(),
  tipo: z.enum(["contado", "cuotas"]),
  precio_final: positiveMoney,
  moneda: currency,
  forma_pago: z.string().trim().min(1).max(120),
  fecha_venta: dateOnly,
}).strict().refine(
  (value) => Boolean(value.cliente_id) !== Boolean(value.cliente),
  {
    path: ["cliente_id"],
    message: "Selecciona un cliente existente o registra uno nuevo.",
  },
);

export const saleListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const createPaymentSchema = z.object({
  idempotency_key: z.string().uuid(),
  monto: positiveMoney,
  moneda: currency,
  medio_pago: z.string().trim().min(1).max(80),
  fecha_pago: dateOnly,
}).strict();

export const paymentIdSchema = z.string().uuid();

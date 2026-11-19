import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const decimalPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const decimalString = z.string().regex(decimalPattern, "Usa un número con hasta dos decimales.");
const positiveDecimalString = decimalString.refine(
  (value) => /[1-9]/.test(value),
  "El valor debe ser mayor que cero.",
);
const nonNegativeDecimalString = decimalString;
const lotNumber = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,5}$/, "Ingresa un número de lote entero positivo.");
const currency = z.string().regex(/^[A-Z]{3}$/, "Usa un código de moneda de tres letras.");
const category = z.enum(["REGULAR", "VIS"]);
const compareDecimals = (left, right) => {
  const toMinorUnits = (value) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(2, "0")}`);
  };
  return toMinorUnits(left) <= toMinorUnits(right);
};

const sideSchema = z
  .object({
    orden: z.number().int().min(1).max(4),
    longitud_m: positiveDecimalString,
  })
  .strict();

const sideArray = z
  .array(sideSchema)
  .max(4)
  .refine(
    (sides) =>
      sides.length === 0 ||
      (sides.length === 4 &&
        new Set(sides.map((side) => side.orden)).size === 4 &&
        sides.every((side, index) => side.orden === index + 1)),
    "Registra las cuatro longitudes en orden, o deja todas vacías.",
  )
  .optional();

export const createLoteSchema = z
  .object({
    manzano_id: z.string().uuid("Selecciona un manzano válido."),
    numero: lotNumber,
    categoria: category.nullable().optional(),
    superficie_m2: positiveDecimalString.nullable().optional(),
    precio_por_m2: nonNegativeDecimalString.nullable().optional(),
    precio_referencia_total: nonNegativeDecimalString.nullable().optional(),
    moneda_referencia: currency.nullable().optional(),
    habilitado_para_venta: z.boolean().nullable().optional(),
    observaciones: optionalText(1000),
    lados: sideArray,
  })
  .strict()
  .refine(
    (value) =>
      (!value.precio_por_m2 && !value.precio_referencia_total) ||
      Boolean(value.moneda_referencia),
    {
      path: ["moneda_referencia"],
      message: "Indica la moneda cuando registras un precio.",
    },
  );

export const updateLoteFieldsSchema = z
  .object({
    manzano_id: z.string().uuid().optional(),
    numero: lotNumber.optional(),
    categoria: category.nullable().optional(),
    superficie_verificada_m2: positiveDecimalString.nullable().optional(),
    precio_por_m2: nonNegativeDecimalString.nullable().optional(),
    precio_referencia_total: nonNegativeDecimalString.nullable().optional(),
    moneda_referencia: currency.nullable().optional(),
    habilitado_para_venta: z.boolean().nullable().optional(),
    observaciones: optionalText(1000),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Indica al menos un campo para actualizar.");

export const updateLoteSchema = z
  .object({
    version: z.number().int().positive(),
    fields: updateLoteFieldsSchema,
  })
  .strict();

const optionalFilterDecimal = z
  .string()
  .regex(decimalPattern, "Filtro numérico no válido.")
  .optional();

const listQueryShape = {
  q: z.string().trim().max(80).optional(),
  manzano_id: z.string().uuid().optional(),
  categoria: category.optional(),
  area_min: optionalFilterDecimal,
  area_max: optionalFilterDecimal,
  precio_min: optionalFilterDecimal,
  precio_max: optionalFilterDecimal,
  order_by: z.enum(["manzano", "numero", "area", "precio"]).default("manzano"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
};

function withValidRanges(schema) {
  return schema
    .refine(
    (query) =>
      query.area_min === undefined ||
      query.area_max === undefined ||
      compareDecimals(query.area_min, query.area_max),
    { path: ["area_max"], message: "El área máxima no puede ser menor que la mínima." },
    )
    .refine(
    (query) =>
      query.precio_min === undefined ||
      query.precio_max === undefined ||
      compareDecimals(query.precio_min, query.precio_max),
    { path: ["precio_max"], message: "El precio máximo no puede ser menor que el mínimo." },
    );
}

export const adminListQuerySchema = withValidRanges(
  z.object({
    ...listQueryShape,
    disponibilidad: z
      .enum(["disponible", "vendido", "reservado", "no_habilitado", "sin_confirmar"])
      .optional(),
  }).strict(),
);

export const publicListQuerySchema = withValidRanges(z.object(listQueryShape).strict());

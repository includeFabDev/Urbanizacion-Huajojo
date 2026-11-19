import { describe, expect, it } from "vitest";
import {
  createLoteSchema,
  publicListQuerySchema,
  updateLoteSchema,
} from "../../src/features/lotes/schemas.js";

const manzanoId = "8f83a783-b74d-4425-b8e9-75f44303bf2f";

describe("contratos de lotes", () => {
  it("preserva la habilitación comercial desconocida y acepta superficies opcionales", () => {
    const result = createLoteSchema.safeParse({
      manzano_id: manzanoId,
      numero: "12",
      habilitado_para_venta: null,
      superficie_m2: null,
      precio_por_m2: null,
      precio_referencia_total: null,
      moneda_referencia: null,
    });

    expect(result.success).toBe(true);
    expect(result.data.habilitado_para_venta).toBeNull();
    expect(result.data.superficie_m2).toBeNull();
  });

  it("exige moneda si se informa un precio", () => {
    const result = createLoteSchema.safeParse({
      manzano_id: manzanoId,
      numero: "12",
      precio_referencia_total: "15000.00",
      moneda_referencia: null,
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(["moneda_referencia"]);
  });

  it("solo acepta los cuatro lados consecutivos o ninguno", () => {
    const result = createLoteSchema.safeParse({
      manzano_id: manzanoId,
      numero: "12",
      lados: [{ orden: 1, longitud_m: "10.25" }],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza filtros con rango invertido", () => {
    const result = publicListQuerySchema.safeParse({
      area_min: "120.00",
      area_max: "99.99",
    });

    expect(result.success).toBe(false);
  });

  it("requiere al menos un campo al actualizar", () => {
    const result = updateLoteSchema.safeParse({ version: 1, fields: {} });

    expect(result.success).toBe(false);
  });
});

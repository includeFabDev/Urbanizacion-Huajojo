import { describe, expect, it } from "vitest";
import {
  createPaymentSchema,
  createSaleSchema,
  customerSchema,
} from "../../src/features/ventas/schemas.js";

const lotId = "8f83a783-b74d-4425-b8e9-75f44303bf2f";
const customerId = "f1394ac8-0e61-4d15-9b71-c9af8e8f4d28";

describe("contratos de ventas y pagos", () => {
  it("acepta venta existente sin cambiar precisión monetaria", () => {
    const result = createSaleSchema.safeParse({
      lote_id: lotId,
      cliente_id: customerId,
      tipo: "cuotas",
      precio_final: "1234.50",
      moneda: "BOB",
      forma_pago: "Acuerdo directo",
      fecha_venta: "2026-11-19",
    });

    expect(result.success).toBe(true);
    expect(result.data.precio_final).toBe("1234.50");
    expect(result.data.tipo).toBe("cuotas");
  });

  it("exige elegir exactamente un cliente existente o nuevo", () => {
    const common = {
      lote_id: lotId,
      tipo: "contado",
      precio_final: "100.00",
      moneda: "USD",
      forma_pago: "Contado",
      fecha_venta: "2026-11-19",
    };

    expect(createSaleSchema.safeParse({
      ...common,
      cliente_id: customerId,
      cliente: { nombre: "Ana" },
    }).success).toBe(false);
    expect(createSaleSchema.safeParse(common).success).toBe(false);
  });

  it("rechaza valores monetarios no positivos o con precisión mayor a centavos", () => {
    expect(customerSchema.safeParse({ nombre: "Ana" }).success).toBe(true);
    for (const monto of ["0.00", "0", "-1.00", "1.001", "1000000000000.00"]) {
      expect(createPaymentSchema.safeParse({
        idempotency_key: "fd2e09b5-ade6-44e1-9af0-994a6e2d17e7",
        monto,
        moneda: "USD",
        medio_pago: "Efectivo",
        fecha_pago: "2026-11-19",
      }).success).toBe(false);
    }
  });

  it("rechaza fechas inexistentes y exige clave de idempotencia UUID", () => {
    const result = createPaymentSchema.safeParse({
      idempotency_key: "intento-no-idempotente",
      monto: "1.25",
      moneda: "USD",
      medio_pago: "Efectivo",
      fecha_pago: "2026-02-30",
    });
    expect(result.success).toBe(false);
  });
});

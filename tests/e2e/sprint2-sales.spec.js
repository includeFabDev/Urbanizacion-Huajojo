import { expect, request, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;
const captureDesign = process.env.E2E_CAPTURE_DESIGN === "1";

test("owner can register sales, calculate balances, and retry/download receipts", async ({ page }) => {
  test.setTimeout(captureDesign ? 120_000 : 30_000);
  test.skip(!email || !password, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD in .env.local.");
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("SUPABASE_DB_URL is required for safe QA cleanup.");
  }

  const marker = `SPRINT2-QA-DO-NOT-IMPORT-${randomUUID()}`;
  const api = page.context().request;
  const anonymousApi = await request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3031",
  });
  let createdLotCount = 0;

  async function createLot(manzanoId, number, enabled) {
    const response = await api.post("/api/v1/lotes", {
      data: {
        manzano_id: manzanoId,
        numero: String(number),
        categoria: "REGULAR",
        superficie_m2: "100.00",
        precio_por_m2: "250.00",
        precio_referencia_total: "25000.00",
        moneda_referencia: "USD",
        habilitado_para_venta: enabled,
        observaciones: marker,
      },
    });
    expect(response.status()).toBe(201);
    createdLotCount += 1;
    return (await response.json()).data;
  }

  async function createSale(lotId, customerName) {
    return api.post("/api/v1/ventas", {
      data: {
        lote_id: lotId,
        cliente: { nombre: customerName },
        tipo: "cuotas",
        precio_final: "1000.00",
        moneda: "USD",
        forma_pago: "Acuerdo de prueba QA",
        fecha_venta: "2026-11-19",
      },
    });
  }

  try {
    await page.goto("/login");
    await captureResponsive(page, "/login", "login");
    if (captureDesign) {
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: /Urbanización Guajojó/ })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Correo electrónico")).toBeFocused();
    }
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/panel\/lotes$/);
    await captureResponsive(page, "/lotes", "public-catalog");
    await captureResponsive(page, "/panel/lotes", "admin-lots-filters");
    await captureResponsive(page, "/panel/lotes/nuevo", "lot-create");
    await captureResponsive(page, "/panel/ventas", "sales-search");
    await captureResponsive(page, "/panel/ventas/nueva", "sale-create");

    const manzanosResponse = await api.get("/api/v1/manzanos");
    expect(manzanosResponse.status()).toBe(200);
    const { data: manzanos } = await manzanosResponse.json();
    const existing = await api.get(`/api/v1/lotes?manzano_id=${manzanos[0].id}&page=1&page_size=100`);
    const existingData = (await existing.json()).data;
    const existingNumbers = new Set(existingData.map((lot) => Number(lot.numero)));
    if (existingData[0]) {
      await captureResponsive(page, `/panel/lotes/${existingData[0].id}/editar`, "lot-edit");
    }
    const baseNumber = 900000 + Math.floor(Math.random() * 90000);
    let number = baseNumber;
    while (existingNumbers.has(number)) number += 1;

    const payableLot = await createLot(manzanos[0].id, number++, true);
    const raceLot = await createLot(manzanos[0].id, number++, true);
    const disabledLot = await createLot(manzanos[0].id, number, null);
    const publicLotResponse = await api.get(
      `/api/v1/public/lotes?q=${payableLot.numero}&page=1&page_size=100`,
    );
    expect((await publicLotResponse.json()).data.some((lot) => lot.id === payableLot.id)).toBe(true);
    const unknownLotResponse = await api.get(
      `/api/v1/public/lotes?q=${disabledLot.numero}&page=1&page_size=100`,
    );
    expect((await unknownLotResponse.json()).data.some((lot) => lot.id === disabledLot.id)).toBe(false);

    const unauthorized = await anonymousApi.get("/api/v1/ventas");
    expect(unauthorized.status()).toBe(401);
    const rejectedSale = await createSale(disabledLot.id, `${marker}-disabled`);
    expect(rejectedSale.status()).toBe(409);
    expect((await rejectedSale.json()).error.code).toBe("LOT_NOT_AVAILABLE");

    const saleResponse = await createSale(payableLot.id, `${marker}-customer`);
    expect(saleResponse.status()).toBe(201);
    const sale = (await saleResponse.json()).data;
    expect(sale.lote.id).toBe(payableLot.id);
    expect(sale.cliente.nombre).toBe(`${marker}-customer`);
    expect(sale.saldo_pendiente).toBe("1000.00");

    await captureResponsive(page, `/panel/ventas/${sale.id}`, "payment-entry");
    await expect(page.getByText("Precio final").locator("..").getByText("1000.00 USD")).toBeVisible();
    await expect(
      page.getByText("Saldo pendiente").first().locator("..").getByText("1000.00 USD"),
    ).toBeVisible();
    await expect(page.getByText("Esta venta aún no tiene pagos registrados.")).toBeVisible();

    await page.getByLabel(/Importe a recibir \(USD\)/).fill("100.00");
    await page.getByLabel("Fecha de recepción").fill("2026-11-19");
    await page.getByLabel("Medio de pago").selectOption({ label: "Efectivo" });
    await page.getByRole("button", { name: "Revisar pago" }).click();
    const paymentRequestPromise = page.waitForRequest((request) =>
      request.method() === "POST" && request.url().endsWith(`/api/v1/ventas/${sale.id}/pagos`),
    );
    await page.getByRole("button", { name: "Confirmar pago recibido" }).click();
    const paymentRequest = await paymentRequestPromise;
    const firstPayment = JSON.parse(paymentRequest.postData());
    await expect(page.getByText(/Pago confirmado\. Recibo/)).toBeVisible();
    const paymentResponse = await api.post(`/api/v1/ventas/${sale.id}/pagos`, { data: firstPayment });
    expect(paymentResponse.status()).toBe(201);
    const payment = (await paymentResponse.json()).data;
    expect(payment.sale.total_pagado).toBe("100.00");
    expect(payment.sale.saldo_pendiente).toBe("900.00");
    expect(payment.recibo.numero).toBeTruthy();
    expect(payment.recibo.cliente).toBe(`${marker}-customer`);
    expect(payment.recibo.lote).toBe(payableLot.numero);
    expect(payment.recibo.monto).toBe("100.00");
    expect(payment.recibo.moneda).toBe("USD");
    expect(payment.recibo.copia_firmada).toBe(false);
    const retryResponse = await api.post(`/api/v1/ventas/${sale.id}/pagos`, { data: firstPayment });
    expect(retryResponse.status()).toBe(201);
    const retry = (await retryResponse.json()).data;
    expect(retry.recibo.id).toBe(payment.recibo.id);
    expect(retry.recibo.numero).toBe(payment.recibo.numero);

    const overpayment = await api.post(`/api/v1/ventas/${sale.id}/pagos`, {
      data: { ...firstPayment, idempotency_key: randomUUID(), monto: "900.01" },
    });

    async function captureResponsive(page, path, name) {
      if (!captureDesign) return;
      for (const width of [1280, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(path);
        await expect(page.locator("form").first()).toBeVisible();
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="status"]'))
          .some((element) => element.textContent?.includes("Cargando")));
        await expect.poll(() => page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);
        await page.screenshot({
          path: `test-results/ui-${name}-${width}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    expect(overpayment.status()).toBe(409);

    const concurrentPayments = await Promise.all(["a", "b"].map((suffix) =>
      api.post(`/api/v1/ventas/${sale.id}/pagos`, {
        data: {
          ...firstPayment,
          idempotency_key: randomUUID(),
          monto: "600.00",
          medio_pago: `QA ${suffix}`,
        },
      }),
    ));
    expect(concurrentPayments.map((response) => response.status()).sort()).toEqual([201, 409]);

    const afterConcurrentPayments = await api.get(`/api/v1/ventas/${sale.id}/saldo`);
    const afterConcurrent = (await afterConcurrentPayments.json()).data;
    expect(afterConcurrent.total_pagado).toBe("700.00");
    expect(afterConcurrent.saldo_pendiente).toBe("300.00");

    const finalPayment = await api.post(`/api/v1/ventas/${sale.id}/pagos`, {
      data: {
        ...firstPayment,
        idempotency_key: randomUUID(),
        monto: "300.00",
        medio_pago: "Transferencia",
      },
    });
    expect(finalPayment.status()).toBe(201);
    const settled = (await finalPayment.json()).data;
    expect(settled.sale.total_pagado).toBe("1000.00");
    expect(settled.sale.saldo_pendiente).toBe("0.00");
    expect(settled.sale.estado).toBe("totalmente_pagada");
    const noLongerPublic = await api.get(
      `/api/v1/public/lotes?q=${payableLot.numero}&page=1&page_size=100`,
    );
    expect((await noLongerPublic.json()).data.some((lot) => lot.id === payableLot.id)).toBe(false);

    const duplicateSales = await Promise.all(["a", "b"].map((suffix) =>
      createSale(raceLot.id, `${marker}-race-${suffix}`),
    ));
    expect(duplicateSales.map((response) => response.status()).sort()).toEqual([201, 409]);
    const winningSale = (await duplicateSales.find((response) => response.status() === 201).json()).data;
    expect(winningSale.lote.id).toBe(raceLot.id);

    await page.reload();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Ver / descargar PDF" }).first().click();
    const download = await downloadPromise;
    const pdfPath = await download.path();
    expect(pdfPath).toBeTruthy();
    const pdfBytes = await readFile(pdfPath);
    expect(pdfBytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(download.suggestedFilename()).toMatch(/^REC-.*\.pdf$/);
  } finally {
    await anonymousApi.dispose();
    const client = new Client({
      connectionString: process.env.SUPABASE_DB_URL,
      application_name: "urbanizacion-huajojo-sprint2-e2e-cleanup",
    });
    await client.connect();
    let transactionActive = false;
    let transactionCommitted = false;
    try {
      await client.query("begin");
      transactionActive = true;
      const { rows: qaLots } = await client.query(
        `select l.id, v.id as sale_id, v.cliente_id, c.nombre as cliente_nombre
         from public.lotes l
         left join public.ventas v on v.lote_id = l.id
         left join public.clientes c on c.id = v.cliente_id
         where l.observaciones = $1 and l.legacy_sqlite_id is null`,
        [marker],
      );
      if (qaLots.some((row) => row.cliente_nombre && !row.cliente_nombre.startsWith(`${marker}-`))) {
        throw new Error("A QA lot is linked to a sale not owned by this test marker; refusing cleanup.");
      }

      const saleIds = [...new Set(qaLots.map((row) => row.sale_id).filter(Boolean))];
      const clientIds = [...new Set(qaLots.map((row) => row.cliente_id).filter(Boolean))];
      if (saleIds.length) {
        await client.query("delete from public.pagos where venta_id = any($1::uuid[])", [saleIds]);
        await client.query("delete from public.ventas where id = any($1::uuid[])", [saleIds]);
      }
      if (clientIds.length) {
        await client.query(
          "delete from public.clientes where id = any($1::uuid[]) and nombre like $2",
          [clientIds, `${marker}-%`],
        );
      }
      await client.query(
        "delete from public.lotes where observaciones = $1 and legacy_sqlite_id is null",
        [marker],
      );
      if (createdLotCount && qaLots.length === 0) {
        throw new Error("Created QA lots were not found during cleanup.");
      }
      await client.query("commit");
      transactionActive = false;
      transactionCommitted = true;
    } catch (error) {
      if (transactionActive && !transactionCommitted) {
        await client.query("rollback");
        transactionActive = false;
      }
      throw error;
    } finally {
      await client.end();
    }
  }
});

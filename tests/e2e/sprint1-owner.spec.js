import { expect, request, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;

test("owner can administer a tagged test lot without changing imported lots", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD in .env.local.");
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("SUPABASE_DB_URL is required for safe test-lot cleanup.");
  }

  const marker = `SPRINT1-QA-DO-NOT-IMPORT-${randomUUID()}`;
  let createdLotId = null;
  let createdLotNumber = null;
  let manzanoId = null;
  const api = page.context().request;
  const anonymousApi = await request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3031",
  });

  try {
    const anonymousList = await anonymousApi.get("/api/v1/lotes");
    expect(anonymousList.status()).toBe(401);
    await page.goto("/panel/lotes");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/panel\/lotes$/);
    await expect(page.getByText("61 registros")).toBeVisible();

    const listResponse = await api.get("/api/v1/lotes?page=1&page_size=100");
    expect(listResponse.status()).toBe(200);
    const initialList = await listResponse.json();
    expect(initialList.meta.total).toBe(61);
    expect(initialList.data).toHaveLength(61);

    const manzanosResponse = await api.get("/api/v1/manzanos");
    expect(manzanosResponse.status()).toBe(200);
    const { data: manzanos } = await manzanosResponse.json();
    expect(manzanos).toHaveLength(4);
    const manzano = manzanos[0];
    manzanoId = manzano.id;

    const existingResponse = await api.get(
      `/api/v1/lotes?manzano_id=${manzano.id}&page=1&page_size=100`,
    );
    expect(existingResponse.status()).toBe(200);
    const existing = await existingResponse.json();
    const usedNumbers = new Set(existing.data.map((lot) => Number(lot.numero)));
    const start = 900000 + Math.floor(Math.random() * 100000);
    let numero = null;
    for (let offset = 0; offset < 100000; offset += 1) {
      const candidate = 900000 + ((start - 900000 + offset) % 100000);
      if (!usedNumbers.has(candidate)) {
        numero = candidate;
        break;
      }
    }
    expect(numero).not.toBeNull();
    createdLotNumber = numero;

    await page.goto("/panel/lotes/nuevo");
    await page.getByLabel("Manzano").selectOption(manzano.id);
    await page.getByLabel("Número de lote").fill(String(numero));
    await page.getByLabel("Categoría").selectOption("REGULAR");
    await page.getByLabel("Superficie informada (m²)").fill("100.00");
    await page.getByLabel("Precio por m² (opcional)").fill("250.00");
    await page.getByLabel("Precio total de referencia (opcional)").fill("25000.00");
    await page.getByLabel("Moneda").selectOption("USD");
    await page.getByLabel("Habilitación comercial").selectOption("false");
    await page.getByLabel("Observaciones internas (opcional)").fill(marker);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Registrar lote" }).click();
    await expect(page).toHaveURL(/\/panel\/lotes\/[0-9a-f-]+$/);
    createdLotId = page.url().split("/").at(-1);
    await expect(page.getByRole("article").getByText(marker)).toBeVisible();

    const duplicateResponse = await api.post("/api/v1/lotes", {
      data: {
        manzano_id: manzano.id,
        numero: String(numero),
        categoria: "REGULAR",
        superficie_m2: "100.00",
        precio_por_m2: "250.00",
        precio_referencia_total: "25000.00",
        moneda_referencia: "USD",
        habilitado_para_venta: false,
        observaciones: marker,
      },
    });
    expect(duplicateResponse.status()).toBe(409);

    await page.goto(`/panel/lotes/${createdLotId}/editar`);
    await page.getByLabel("Superficie verificada nueva (m²)").fill("123.45");
    await page.getByLabel("Precio total de referencia (opcional)").fill("26000.00");
    await page.getByLabel("Habilitación comercial").selectOption("true");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Los cambios se guardaron correctamente.")).toBeVisible();

    const detailResponse = await api.get(`/api/v1/lotes/${createdLotId}`);
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();
    expect(String(detail.data.superficie_verificada_m2)).toBe("123.45");
    expect(detail.data.precio_referencia_total).toBe("26000.00");
    expect(detail.data.habilitado_para_venta).toBe(true);

    const visibleResponse = await api.get(
      `/api/v1/public/lotes?q=${numero}&page=1&page_size=100`,
    );
    expect(visibleResponse.status()).toBe(200);
    const visible = await visibleResponse.json();
    expect(visible.data.some((lot) => lot.id === createdLotId)).toBe(true);

    await page.goto(`/panel/lotes/${createdLotId}/editar`);
    await page.getByLabel("Habilitación comercial").selectOption("false");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Los cambios se guardaron correctamente.")).toBeVisible();

    const excludedResponse = await api.get(
      `/api/v1/public/lotes?q=${numero}&page=1&page_size=100`,
    );
    expect(excludedResponse.status()).toBe(200);
    const excluded = await excludedResponse.json();
    expect(excluded.data.some((lot) => lot.id === createdLotId)).toBe(false);
    expect((await api.get(`/api/v1/public/lotes/${createdLotId}`)).status()).toBe(404);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await anonymousApi.get("/api/v1/lotes")).status()).toBe(401);
    await page.goto("/panel/lotes");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    try {
      if (manzanoId && createdLotNumber != null) {
        const client = new Client({
          connectionString: process.env.SUPABASE_DB_URL,
          application_name: "urbanizacion-huajojo-sprint1-e2e-cleanup",
        });
        await client.connect();
        try {
          await client.query("begin");
          const deletion = await client.query(
            `delete from public.lotes
             where manzano_id = $1::uuid
               and numero = $2
               and observaciones = $3
               and legacy_sqlite_id is null
               and ($4::uuid is null or id = $4::uuid)
             returning id`,
            [manzanoId, String(createdLotNumber), marker, createdLotId],
          );
          if (createdLotId && deletion.rowCount !== 1) {
            throw new Error("Expected exactly one tagged E2E lot to clean up.");
          }
          if (!createdLotId && deletion.rowCount > 1) {
            throw new Error("More than one tagged E2E lot matched cleanup; transaction aborted.");
          }
          await client.query("commit");

          if (createdLotId) {
            const remaining = await client.query(
              "select count(*)::int as count from public.lotes where id = $1::uuid",
              [createdLotId],
            );
            if (remaining.rows[0].count !== 0) {
              throw new Error("The E2E lot remains after cleanup.");
            }
          }
          const counts = await client.query(`
            select
              count(*) filter (where legacy_sqlite_id is not null)::int as imported_lots,
              count(*)::int as total_lots
            from public.lotes
          `);
          if (
            counts.rows[0].imported_lots !== 61 ||
            counts.rows[0].total_lots !== 61
          ) {
            throw new Error("Lot counts changed unexpectedly after E2E cleanup.");
          }
        } catch (error) {
          await client.query("rollback").catch(() => {});
          throw error;
        } finally {
          await client.end();
        }
      }
    } finally {
      await anonymousApi.dispose();
    }
  }
});

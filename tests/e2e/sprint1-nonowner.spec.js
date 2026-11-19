import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const email = process.env.E2E_NONOWNER_EMAIL;
const password = process.env.E2E_NONOWNER_PASSWORD;

test("authenticated non-owner cannot access or change administrative data", async ({ page }) => {
  test.skip(
    !ownerEmail || !ownerPassword || !email || !password,
    "Run with npm run test:e2e:nonowner to provision a temporary account.",
  );
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("SUPABASE_DB_URL is required for safe test-lot cleanup.");
  }

  const marker = `SPRINT1-NONOWNER-QA-DO-NOT-IMPORT-${randomUUID()}`;
  let createdLotId = null;
  let createdLotNumber = null;
  let manzanoId = null;

  try {
    await signIn(page, ownerEmail, ownerPassword);
    const api = page.context().request;
    const manzanosResponse = await api.get("/api/v1/manzanos");
    expect(manzanosResponse.status()).toBe(200);
    const { data: manzanos } = await manzanosResponse.json();
    manzanoId = manzanos[0].id;

    const existingResponse = await api.get(
      `/api/v1/lotes?manzano_id=${manzanoId}&page=1&page_size=100`,
    );
    expect(existingResponse.status()).toBe(200);
    const existing = await existingResponse.json();
    const usedNumbers = new Set(existing.data.map((lot) => Number(lot.numero)));
    for (let candidate = 900000; candidate < 1000000; candidate += 1) {
      if (!usedNumbers.has(candidate)) {
        createdLotNumber = candidate;
        break;
      }
    }
    expect(createdLotNumber).not.toBeNull();

    const createResponse = await api.post("/api/v1/lotes", {
      data: {
        manzano_id: manzanoId,
        numero: String(createdLotNumber),
        categoria: "REGULAR",
        superficie_m2: "100.00",
        precio_por_m2: "250.00",
        precio_referencia_total: "25000.00",
        moneda_referencia: "USD",
        habilitado_para_venta: false,
        observaciones: marker,
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    createdLotId = created.data.id;
    expect(created.data.observaciones).toBe(marker);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, email, password);

    await expect(page).toHaveURL(/\/panel\/lotes$/);
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
    await expect(page.getByText("61 registros")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Lotes" })).toHaveCount(0);

    const apiAsNonOwner = page.context().request;
    const requests = [
      apiAsNonOwner.get("/api/v1/lotes?page=1&page_size=100"),
      apiAsNonOwner.get("/api/v1/manzanos"),
      apiAsNonOwner.get(`/api/v1/lotes/${createdLotId}`),
      apiAsNonOwner.post("/api/v1/lotes", {
        data: {
          manzano_id: randomUUID(),
          numero: "987654",
          categoria: "REGULAR",
          superficie_m2: "100.00",
          habilitado_para_venta: false,
          observaciones: "Non-owner authorization test",
        },
      }),
      apiAsNonOwner.patch(`/api/v1/lotes/${createdLotId}`, {
        data: {
          version: created.data.version,
          fields: { observaciones: "Unauthorized update attempt" },
        },
      }),
    ];

    for (const response of await Promise.all(requests)) {
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body).not.toHaveProperty("data");
    }

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, ownerEmail, ownerPassword);
    const ownerDetailResponse = await page.context().request.get(
      `/api/v1/lotes/${createdLotId}`,
    );
    expect(ownerDetailResponse.status()).toBe(200);
    const ownerDetail = await ownerDetailResponse.json();
    expect(ownerDetail.data.observaciones).toBe(marker);
    expect(ownerDetail.data.version).toBe(created.data.version);
  } finally {
    if (manzanoId && createdLotNumber != null) {
      const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        application_name: "urbanizacion-huajojo-sprint1-nonowner-e2e-cleanup",
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
          throw new Error("Expected exactly one tagged non-owner E2E lot to clean up.");
        }
        if (!createdLotId && deletion.rowCount > 1) {
          throw new Error("More than one tagged non-owner E2E lot matched cleanup; transaction aborted.");
        }
        await client.query("commit");

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
          throw new Error("The non-owner E2E cleanup changed the imported lot count.");
        }
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        await client.end();
      }
    }
  }
});

async function signIn(page, userEmail, userPassword) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(userEmail);
  await page.getByLabel("Contraseña").fill(userPassword);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/panel\/lotes$/);
}

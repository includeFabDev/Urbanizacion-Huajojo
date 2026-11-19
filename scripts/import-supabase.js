import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function loadLocalEnvironment(fileContents) {
  const values = {};
  for (const line of fileContents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function redact(message, values) {
  let safeMessage = message;
  for (const value of Object.values(values)) {
    if (value) safeMessage = safeMessage.split(value).join("[REDACTED]");
  }
  return safeMessage.replace(
    /(password|token|apikey|service_role)=([^\s&]+)/gi,
    "$1=[REDACTED]",
  );
}

const localEnv = loadLocalEnvironment(
  await readFile(path.join(repoRoot, ".env.local"), "utf8"),
);
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
];
for (const name of required) {
  if (!localEnv[name]) throw new Error(`Required variable is missing: ${name}`);
}
if (!/^postgres(ql)?:\/\//.test(localEnv.SUPABASE_DB_URL)) {
  throw new Error("SUPABASE_DB_URL is not a PostgreSQL connection URL.");
}

const client = new Client({
  connectionString: localEnv.SUPABASE_DB_URL,
  application_name: "urbanizacion-huajojo-data-import",
});
let importSqlForError = "";

try {
  await client.connect();
  const countsResult = await client.query(`
    select jsonb_build_object(
      'urbanizaciones', (select count(*) from public.urbanizaciones),
      'manzanos', (select count(*) from public.manzanos),
      'lotes', (select count(*) from public.lotes),
      'lote_lados', (select count(*) from public.lote_lados),
      'areas_comunes', (select count(*) from public.areas_comunes),
      'cuadro_plano', (select count(*) from public.cuadro_plano),
      'guia', (select count(*) from public.guia),
      'legacy_urbanizaciones', (select count(*) from public.urbanizaciones where legacy_sqlite_id is not null),
      'legacy_manzanos', (select count(*) from public.manzanos where legacy_sqlite_id is not null),
      'legacy_lotes', (select count(*) from public.lotes where legacy_sqlite_id is not null),
      'legacy_lados', (select count(*) from public.lote_lados where legacy_sqlite_id is not null),
      'legacy_areas', (select count(*) from public.areas_comunes where legacy_sqlite_id is not null)
    ) as counts
  `);
  const before = countsResult.rows[0].counts;
  const valuesBefore = Object.values(before);
  const isEmpty = valuesBefore.every((value) => Number(value) === 0);
  const isComplete =
    Number(before.urbanizaciones) === 1 &&
    Number(before.manzanos) === 4 &&
    Number(before.lotes) === 61 &&
    Number(before.lote_lados) === 244 &&
    Number(before.areas_comunes) === 6 &&
    Number(before.cuadro_plano) === 7 &&
    Number(before.guia) === 14 &&
    Number(before.cuadro_plano) === 7 &&
    Number(before.guia) === 14 &&
    Number(before.legacy_urbanizaciones) === 1 &&
    Number(before.legacy_manzanos) === 4 &&
    Number(before.legacy_lotes) === 61 &&
    Number(before.legacy_lados) === 244 &&
    Number(before.legacy_areas) === 6;

  if (!isEmpty && !isComplete) {
    throw new Error(
      "Import stopped: target tables contain conflicting or partial data; no writes were attempted.",
    );
  }

  if (isEmpty) {
    importSqlForError = await readFile(
      path.join(repoRoot, "supabase", "import_existing.sql"),
      "utf8",
    );
    await client.query(importSqlForError);
  }

  const verificationSql = await readFile(
    path.join(repoRoot, "supabase", "verification", "post-import.sql"),
    "utf8",
  );
  const verificationResult = await client.query(verificationSql);
  const verification = verificationResult.rows[0].verification;
  const expected = {
    urbanizaciones: 1,
    manzanos: 4,
    lotes: 61,
    lote_lados: 244,
    areas_comunes: 6,
    imported_urbanizaciones: 1,
    imported_manzanos: 4,
    imported_lotes: 61,
    imported_lados: 244,
    imported_areas: 6,
    unknown_commercial_enablement: 61,
    unexpectedly_available: 0,
    orphan_lotes: 0,
    orphan_lados: 0,
    duplicate_lotes: 0,
    duplicate_lados: 0,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(verification[key]) !== value) {
      throw new Error(`Post-import verification failed: ${key} did not match.`);
    }
  }
  for (const sequenceName of ["cuadro_sequence", "guia_sequence"]) {
    const sequence = verification[sequenceName];
    if (
      !sequence.is_called ||
      Number(sequence.last_value) < Number(sequence.max_id)
    ) {
      throw new Error(`Post-import verification failed: ${sequenceName} is behind its table.`);
    }
  }

  console.log("Supabase import and verification succeeded.");
  console.log(JSON.stringify(verification, null, 2));
} catch (error) {
  const code = error?.code ? ` (${error.code})` : "";
  let location = "";
  if (error?.position && importSqlForError) {
    const position = Number(error.position) - 1;
    const lineNumber = importSqlForError.slice(0, position).split("\n").length;
    location = ` at import SQL line ${lineNumber}`;
  }
  console.error(
    redact(`Supabase import failed${code}${location}: ${error.message}`, localEnv),
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

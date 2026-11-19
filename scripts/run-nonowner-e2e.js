import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const name of requiredVariables) {
  if (!process.env[name]) throw new Error(`Missing required variable: ${name}`);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const email = `sprint1-nonowner-${randomUUID()}@example.invalid`;
const password = `${randomBytes(36).toString("base64url")}Aa1!`;
let userId;
let testExitCode = 1;
let cleanupFailed = false;

try {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error("Could not provision the temporary non-owner account.");
  }
  userId = data.user.id;

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (roleError || roles.length !== 0) {
    throw new Error("The temporary account did not have the expected role state.");
  }

  testExitCode = await new Promise((resolveExit) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "node_modules", "@playwright", "test", "cli.js"),
        "test",
        "tests/e2e/sprint1-nonowner.spec.js",
        "--workers=1",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          E2E_NONOWNER_EMAIL: email,
          E2E_NONOWNER_PASSWORD: password,
        },
        stdio: "inherit",
      },
    );
    child.once("error", () => {
      console.error("Could not start the non-owner E2E test.");
      resolveExit(1);
    });
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
} finally {
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      cleanupFailed = true;
      console.error("Could not delete the temporary non-owner account.");
    } else {
      console.log("Temporary non-owner account removed.");
    }
  }
}

if (cleanupFailed) process.exitCode = 1;
else process.exitCode = testExitCode;

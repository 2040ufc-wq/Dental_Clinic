// npm run db:push
// Applies every migration in supabase/migrations and then supabase/seed.sql
// to the Supabase Cloud database in DATABASE_URL (.env.local).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadDatabaseUrl, maskUrl, fail } from "./env.mjs";

const url = loadDatabaseUrl();
console.log(`→ Target database: ${maskUrl(url)}`);
console.log("→ Applying migrations and demo data (this can take a minute)…\n");

// Run the Supabase CLI binary directly (no shell), so special characters in the
// database password can never be misread as shell commands.
const windowsBinary = join("node_modules", "@supabase", "cli-windows-x64", "bin", "supabase.exe");
const [command, prefix] =
  process.platform === "win32" && existsSync(windowsBinary)
    ? [windowsBinary, []]
    : ["npx", ["supabase"]];

const result = spawnSync(
  command,
  [...prefix, "db", "push", `--remote=${url}`, "--include-seed", "--yes"],
  { stdio: "inherit" },
);

if (result.error) fail(`Could not start the Supabase CLI: ${result.error.message}`);
if (result.status !== 0) fail("Database setup failed — see the messages above.");
console.log("\n✔ Database is ready. Next: npm run db:test");

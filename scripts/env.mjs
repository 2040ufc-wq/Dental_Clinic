// Loads .env.local and validates the database connection string.
// Shared by the db:push and db:test commands.
import { existsSync } from "node:fs";

export function loadDatabaseUrl() {
  if (!existsSync(".env.local")) {
    fail("File .env.local not found. Copy .env.example to .env.local and fill in your Supabase values.");
  }
  process.loadEnvFile(".env.local");

  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("YOUR-PROJECT-REF") || url.includes("[YOUR-PASSWORD]")) {
    fail("DATABASE_URL in .env.local still has placeholder values. Paste your Supabase 'Session pooler' connection string.");
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    fail("DATABASE_URL must start with postgresql://");
  }
  return url;
}

/** Hides the password when printing a connection string. */
export function maskUrl(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

export function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

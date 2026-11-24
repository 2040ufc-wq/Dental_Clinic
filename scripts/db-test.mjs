// npm run db:test
// Runs the pgTAP database tests in supabase/tests/database against DATABASE_URL.
// Each test file runs inside a transaction that is rolled back, so no data changes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { loadDatabaseUrl, maskUrl } from "./env.mjs";

const url = loadDatabaseUrl();
const dir = join("supabase", "tests", "database");
const files = readdirSync(dir).filter((f) => f.endsWith(".test.sql")).sort();

// Supabase uses its own certificate authority; for this development tool we accept it
// without verification. sslmode is removed from the URL so these settings apply.
const client = new pg.Client({
  connectionString: url.replace(/[?&]sslmode=[^&]*/, ""),
  ssl: { rejectUnauthorized: false },
});

console.log(`→ Testing database: ${maskUrl(url)}\n`);
await client.connect();

let passed = 0;
let failed = 0;

for (const file of files) {
  console.log(`■ ${file}`);
  try {
    const results = await client.query(readFileSync(join(dir, file), "utf8"));
    // pgTAP prints its output as single-column rows (ok / not ok / # diagnostics)
    for (const result of [results].flat()) {
      for (const row of result.rows ?? []) {
        const values = Object.values(row);
        if (values.length !== 1 || typeof values[0] !== "string") continue;
        for (const line of values[0].split("\n")) {
          if (/^ok /.test(line)) passed++;
          if (/^not ok /.test(line)) failed++;
          if (/^(ok |not ok |#)/.test(line)) console.log(`   ${line}`);
        }
      }
    }
  } catch (error) {
    failed++;
    console.log(`   ✖ file aborted: ${error.message}`);
    await client.query("rollback").catch(() => {});
  }
  console.log("");
}

await client.end();
console.log(`Result: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

// `pnpm check:supabase`
// Checks the dev Supabase project is set up for Phase 9a, using the settings in
// .env.local. It never prints a key or an address, and it changes nothing.
//
// 1. With the secret key (the server's key), both tables can be read.
// 2. With the publishable key (the public one any browser could have), they can't.
//    Add SUPABASE_PUBLISHABLE_KEY to .env.local for this part. The site never uses it.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
let failures = 0;
const say = (ok: boolean, text: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"}  ${text}`);
};

async function main() {
  if (!url || !secret) {
    console.log("FAIL  SUPABASE_URL or SUPABASE_SECRET_KEY is missing from .env.local.");
    process.exit(1);
  }
  const server = createClient(url, secret, { auth: { persistSession: false } });
  for (const table of ["feedback", "plan_counts"]) {
    const { error } = await server.from(table).select("*", { count: "exact", head: true });
    say(!error, `the server can read ${table}${error ? ` (${error.message})` : ""}`);
  }

  if (!publishable) {
    console.log("SKIP  the public key check: add SUPABASE_PUBLISHABLE_KEY to .env.local to run it.");
  } else {
    const browser = createClient(url, publishable, { auth: { persistSession: false } });
    for (const table of ["feedback", "plan_counts"]) {
      const { data, error } = await browser.from(table).select("*").limit(1);
      say(Boolean(error) || (data?.length ?? 0) === 0, `the public key can't read ${table}`);
    }
    const write = await browser.from("feedback").insert({ rating: 5, page_version: "public-key-check" });
    say(Boolean(write.error), "the public key can't write feedback");
    const count = await browser.rpc("increment_plan_count", { p_day: "2000-01-01", p_work_kind: "product" });
    say(Boolean(count.error), "the public key can't add to the plan counts");
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error: Error) => {
  console.log(`FAIL  ${error.message}`);
  process.exit(1);
});

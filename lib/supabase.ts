import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The server's connection to Supabase. It uses the secret key, which can write
 * past Row Level Security, so it must never reach a browser: "server-only" makes
 * the build fail if a browser component imports this file.
 */

let client: SupabaseClient | null = null;

/** Null when the settings are missing, so the site still works without a database. */
export function supabaseServer(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

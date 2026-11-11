import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Helpers for public API routes.
 *
 * A visitor is told apart by a scrambled ("hashed") network address, used only
 * to limit how often they can send. It's held in memory and never stored. The
 * salt is new each time the server starts, so the scramble can't be reversed
 * or matched up later.
 */
const SALT = randomBytes(16).toString("hex");

export function visitorKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${SALT}:${address}`).digest("hex");
}

/** Reads a small JSON body. Returns undefined if it's missing, too big or not JSON. */
export async function readJson(request: Request, maxBytes = 10_000): Promise<unknown> {
  try {
    const text = await request.text();
    if (text.length === 0 || text.length > maxBytes) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Which version of the site is running: the short commit id on Vercel, "local" otherwise. */
export function pageVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
}

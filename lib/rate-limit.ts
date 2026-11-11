/**
 * A simple limit on how often one visitor can use a public route. Pure, with
 * the time passed in, so it's tested without waiting.
 *
 * It's kept in memory only. On Vercel each running copy of the site has its own
 * memory, so a determined visitor could get a few more through. That's fine for
 * a feedback form: it stops accidents and casual abuse, not a planned attack.
 */
export type RateLimiter = {
  /** True if this visitor may go ahead now, and records the attempt. */
  allow(key: string, now: number): boolean;
};

export function createRateLimiter({ count, windowMs }: { count: number; windowMs: number }): RateLimiter {
  const attempts = new Map<string, number[]>();
  return {
    allow(key, now) {
      const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);
      // Forget visitors with nothing recent, so memory doesn't grow.
      for (const [other, times] of attempts) {
        if (times.every((time) => now - time >= windowMs)) attempts.delete(other);
      }
      if (recent.length >= count) {
        attempts.set(key, recent);
        return false;
      }
      attempts.set(key, [...recent, now]);
      return true;
    },
  };
}

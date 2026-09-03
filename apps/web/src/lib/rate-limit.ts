/**
 * Small in-memory token bucket rate limiter for provider proxy routes.
 *
 * We don't need distributed rate limiting for V1 — TheMealDB's per-key ceiling
 * is generous, and this limiter's job is to protect the shared API key from
 * a runaway admin session that would blow through the quota. When we scale
 * out we'll swap this for an upstash/redis-backed implementation, but the
 * function signature stays the same.
 *
 * Isolation is per key (usually a userId or an IP). Missing keys default to
 * a fresh bucket at capacity.
 */
export interface RateLimitOptions {
  /** Bucket capacity — burst size. */
  capacity: number;
  /** Tokens added per second. */
  refillPerSecond: number;
  /** Test hook — inject a monotonic time source. Defaults to Date.now(). */
  now?: () => number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the next token is available (0 if already available). */
  retryAfterMs: number;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly opts: Required<RateLimitOptions>;

  constructor(opts: RateLimitOptions) {
    this.opts = {
      now: () => Date.now(),
      ...opts,
    };
  }

  /** Attempt to consume one token for `key`. Returns whether the caller may proceed. */
  take(key: string): RateLimitVerdict {
    const now = this.opts.now();
    const bucket = this.getOrCreate(key, now);

    // Refill tokens accrued since the last check, capped at capacity.
    const elapsedMs = Math.max(0, now - bucket.lastRefillMs);
    const refill = (elapsedMs / 1000) * this.opts.refillPerSecond;
    bucket.tokens = Math.min(this.opts.capacity, bucket.tokens + refill);
    bucket.lastRefillMs = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
    }
    const deficit = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / this.opts.refillPerSecond) * 1000);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  /** Testing / diagnostic helpers. */
  peek(key: string): Bucket | undefined {
    return this.buckets.get(key);
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }

  private getOrCreate(key: string, now: number): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.opts.capacity, lastRefillMs: now };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }
}

/**
 * Shared limiter for provider proxy routes. Tuned to allow admins to browse
 * comfortably (~1 request per second sustained, up to 10 in a burst) without
 * ever exceeding the paid provider's per-minute ceiling.
 */
export const providerLimiter = new RateLimiter({ capacity: 10, refillPerSecond: 1 });

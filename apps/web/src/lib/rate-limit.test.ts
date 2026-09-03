import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows the first `capacity` calls without waiting', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 3, refillPerSecond: 1, now: () => now.t });
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(true);
  });

  it('rejects after the bucket empties', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 2, refillPerSecond: 1, now: () => now.t });
    lim.take('a');
    lim.take('a');
    const v = lim.take('a');
    expect(v.allowed).toBe(false);
    expect(v.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills over time', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 1, refillPerSecond: 2, now: () => now.t });
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(false);
    now.t = 500; // 0.5s → 1 token refilled
    expect(lim.take('a').allowed).toBe(true);
  });

  it('caps refill at capacity', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 3, refillPerSecond: 100, now: () => now.t });
    lim.take('a');
    now.t = 10_000; // absurdly long wait
    // Only capacity tokens should be available, not capacity + refill.
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(false);
  });

  it('isolates keys', () => {
    const lim = new RateLimiter({ capacity: 1, refillPerSecond: 0.1 });
    expect(lim.take('a').allowed).toBe(true);
    expect(lim.take('a').allowed).toBe(false);
    // A different key gets a fresh bucket.
    expect(lim.take('b').allowed).toBe(true);
  });

  it('reset clears state', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 1, refillPerSecond: 1, now: () => now.t });
    lim.take('a');
    expect(lim.take('a').allowed).toBe(false);
    lim.reset('a');
    expect(lim.take('a').allowed).toBe(true);
  });

  it('reports a monotonically-shrinking retryAfterMs across repeated calls', () => {
    const now = { t: 0 };
    const lim = new RateLimiter({ capacity: 1, refillPerSecond: 1, now: () => now.t });
    lim.take('a');
    const first = lim.take('a');
    now.t = 500;
    const second = lim.take('a');
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterMs).toBeLessThan(first.retryAfterMs);
  });
});

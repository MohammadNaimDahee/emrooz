/**
 * Deterministic 32-bit hash of a string (FNV-1a variant).
 * Used to seed the daily PRNG per (user, date) so that recommendation results
 * remain stable throughout the same local calendar day but differ across days.
 */
export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. Given the same seed, produces the same sequence of numbers.
 * Small, fast, dependency-free — sufficient for daily variation of recommendation ranking.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed a PRNG for a specific (userId, isoDate) pair. */
export function dailySeed(userId: string, isoDate: string): number {
  return hashString(`${userId}::${isoDate}`);
}

import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, startOfWeek, toIsoDate } from '../src/date';

describe('toIsoDate', () => {
  it('formats YYYY-MM-DD in local time', () => {
    // Use a specific Date in the local timezone; the function reads year/month/day locally.
    const d = new Date(2026, 2, 5); // March = month 2 (zero-based)
    expect(toIsoDate(d)).toBe('2026-03-05');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toIsoDate(new Date(2026, 8, 9))).toBe('2026-09-09');
  });
});

describe('daysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-09-04', '2026-09-04')).toBe(0);
  });
  it('is positive when b > a', () => {
    expect(daysBetween('2026-09-01', '2026-09-05')).toBe(4);
  });
  it('is negative when b < a', () => {
    expect(daysBetween('2026-09-05', '2026-09-01')).toBe(-4);
  });
  it('crosses months and years correctly', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
});

describe('addDays', () => {
  it('adds and subtracts days across boundaries', () => {
    expect(addDays('2026-09-04', 1)).toBe('2026-09-05');
    expect(addDays('2026-09-04', -1)).toBe('2026-09-03');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('startOfWeek', () => {
  it('rewinds to the Monday of the containing week', () => {
    // 2026-09-04 was a Friday.
    expect(startOfWeek('2026-09-04')).toBe('2026-08-31');
  });
  it('returns Monday unchanged', () => {
    expect(startOfWeek('2026-08-31')).toBe('2026-08-31');
  });
  it('rewinds Sunday to the previous Monday', () => {
    expect(startOfWeek('2026-09-06')).toBe('2026-08-31');
  });
});

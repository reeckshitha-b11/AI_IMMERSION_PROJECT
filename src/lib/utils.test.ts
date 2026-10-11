import { describe, it, expect } from 'vitest';
import { initials, formatDate, timeAgo } from '@/lib/utils';

describe('initials', () => {
  it('returns uppercase first letters of first and last name', () => {
    expect(initials('Jordan Lee')).toBe('JL');
    expect(initials('Maya Chen')).toBe('MC');
  });

  it('returns at most two characters', () => {
    expect(initials('John Ronald Reuel Tolkien')).toBe('JR');
  });

  it('handles a single name', () => {
    expect(initials('Jordan')).toBe('J');
  });

  it('handles empty string', () => {
    expect(initials('')).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2026-08-24');
    expect(result).toMatch(/Aug.*24.*2026/);
  });

  it('returns "Not set" for null', () => {
    expect(formatDate(null)).toBe('Not set');
  });
});

describe('timeAgo', () => {
  it('returns minutes for recent timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours for older timestamps within a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days for timestamps older than a day', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe('2d ago');
  });

  it('returns at least "1m ago" for a just-now timestamp', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('1m ago');
  });
});

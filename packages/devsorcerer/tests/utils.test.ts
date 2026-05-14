import { describe, it, expect } from 'vitest';
import { generateId, formatCost, formatTokens, truncate, isoDate } from '../src/shared/utils.js';

describe('generateId', () => {
  it('generates UUID-like strings', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('isoDate', () => {
  it('formats timestamps to ISO date strings', () => {
    expect(isoDate(new Date('2026-05-14').getTime())).toBe('2026-05-14');
  });
});

describe('formatCost', () => {
  it('formats costs to 4 decimal places', () => {
    expect(formatCost(0.0035)).toBe('$0.0035');
    expect(formatCost(1.5)).toBe('$1.5000');
  });
});

describe('formatTokens', () => {
  it('formats token counts', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(2_000_000)).toBe('2.0M');
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
    expect(truncate('hi', 100)).toBe('hi');
  });
});

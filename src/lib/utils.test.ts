import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, startOfMonth, formatCurrency, formatDate, formatDateTime, fillTemplate, whatsAppLink } from '../lib/utils';

describe('utils', () => {
  it('addDays preserves time and increments calendar day', () => {
    const d = new Date('2026-01-31T08:15:00Z');
    const result = addDays(d, 1);
    expect(result.toISOString()).toBe('2026-02-01T08:15:00.000Z');
  });

  it('daysBetween handles positive/negative spans', () => {
    expect(daysBetween('2026-01-01', '2026-01-02')).toBe(1);
    expect(daysBetween('2026-01-02', '2026-01-01')).toBe(-1);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('startOfMonth returns first day at local midnight', () => {
    const result = startOfMonth(new Date('2026-08-20'));
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
  });

  it('formatCurrency returns a non-empty currency string', () => {
    const result = formatCurrency(1234.5);
    expect(result).toBeTruthy();
    expect(result).toContain('ج.م.');
  });

  it('formatDateTime and formatDate use supplied locale', () => {
    const date = new Date('2026-08-20T12:00:00Z');
    expect(formatDate(date, 'en-GB')).not.toBe('');
    expect(formatDateTime(date, 'en-GB')).not.toBe('');
  });

  it('fillTemplate replaces known placeholders and leaves unknown alone', () => {
    expect(fillTemplate('Hi {name}', { name: 'Ali' })).toBe('Hi Ali');
    expect(fillTemplate('Hi {name}', {})).toBe('Hi {name}');
  });

  it('whatsAppLink normalizes leading-zero and already-prefixed formats', () => {
    expect(whatsAppLink('01000000000')).toBe('https://wa.me/201000000000');
    expect(whatsAppLink('201000000000')).toBe('https://wa.me/201000000000');
    expect(whatsAppLink('10000000000')).toBe('https://wa.me/10000000000');
  });
});

import { describe, it, expect } from 'vitest';
import { yesterdayRange } from './attendance-ranges';

describe('attendance-tracking', () => {
  it('yesterdayRange returns local midnight-to-midnight span for the previous calendar day', () => {
    const { start, end } = yesterdayRange();
    const now = new Date();
    const expectedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const expectedEnd = new Date(expectedStart.getTime() + 86_400_000 - 1);
    expect(start.getTime()).toBe(expectedStart.getTime());
    expect(end.getTime()).toBe(expectedEnd.getTime());
  });
});

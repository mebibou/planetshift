import { describe, expect, it } from 'vitest';
import { tabAfter } from '../../src/app/tabs';

const TABS = ['temperature', 'avoided', 'cause'] as const;

describe('tab keys', () => {
  it('moves with the arrows, wrapping around', () => {
    expect(tabAfter(TABS, 'temperature', 'ArrowRight')).toBe('avoided');
    expect(tabAfter(TABS, 'cause', 'ArrowRight')).toBe('temperature');
    expect(tabAfter(TABS, 'temperature', 'ArrowLeft')).toBe('cause');
  });

  it('goes to the first and last with Home and End', () => {
    expect(tabAfter(TABS, 'avoided', 'Home')).toBe('temperature');
    expect(tabAfter(TABS, 'avoided', 'End')).toBe('cause');
  });

  it('ignores other keys', () => {
    expect(tabAfter(TABS, 'avoided', 'Enter')).toBeNull();
    expect(tabAfter([], 'avoided', 'ArrowRight')).toBeNull();
  });
});

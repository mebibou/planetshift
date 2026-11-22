import { describe, expect, it } from 'vitest';
import { effectiveTheme, parseTheme, toggled } from '../../src/app/theme';
import { createStore } from '../../src/app/store';

describe('theme', () => {
  it('prefers the stored choice, then the system', () => {
    expect(effectiveTheme('light', true)).toBe('light');
    expect(effectiveTheme(null, true)).toBe('dark');
    expect(effectiveTheme(null, false)).toBe('light');
  });

  it('parses and toggles', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('blue')).toBeNull();
    expect(toggled('dark')).toBe('light');
  });
});

describe('store', () => {
  it('notifies only on a new state', () => {
    const store = createStore({ n: 0 });
    const seen: number[] = [];
    store.subscribe((s, prev) => seen.push(s.n - prev.n));
    store.update((s) => s);
    store.update((s) => ({ n: s.n + 2 }));
    expect(seen).toEqual([2]);
    expect(store.get()).toEqual({ n: 2 });
  });
});

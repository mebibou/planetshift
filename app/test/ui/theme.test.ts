import { describe, expect, it } from 'vitest';
import { effectiveTheme, parseTheme, toggled } from '../../src/app/theme';

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

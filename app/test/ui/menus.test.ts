import { describe, expect, it } from 'vitest';
import { menuOpen, parseMenu } from '../../src/app/menus';

describe('side menus', () => {
  it('read what the browser kept, and nothing else', () => {
    expect(parseMenu('open')).toBe(true);
    expect(parseMenu('closed')).toBe(false);
    expect(parseMenu('yes')).toBeNull();
    expect(parseMenu(null)).toBeNull();
  });

  it('open as left, else open beside the content and as each one says on a phone', () => {
    expect(menuOpen(false, false, true)).toBe(false);
    expect(menuOpen(true, true, false)).toBe(true);
    expect(menuOpen(null, false, false)).toBe(true);
    expect(menuOpen(null, true, false)).toBe(false);
    expect(menuOpen(null, true, true)).toBe(true);
  });
});

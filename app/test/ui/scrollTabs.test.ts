import { describe, expect, it } from 'vitest';
import { edgesOf, fadeMask, keepEdges, pageLeft, revealLeft } from '../../src/app/scrollTabs';

const ROW = { width: 300, scrollWidth: 1000 };

describe('scrolling tabs', () => {
  it('show more past the edges the row can still scroll to', () => {
    expect(edgesOf({ ...ROW, left: 0 })).toEqual({ start: false, end: true });
    expect(edgesOf({ ...ROW, left: 350 })).toEqual({ start: true, end: true });
    expect(edgesOf({ ...ROW, left: 700 })).toEqual({ start: true, end: false });
    expect(edgesOf({ ...ROW, left: 699.5 })).toEqual({ start: true, end: false });
    expect(edgesOf({ left: 0, width: 300, scrollWidth: 300 })).toEqual({
      start: false,
      end: false,
    });
  });

  it('keep the edges they had when nothing changed', () => {
    const before = { start: false, end: true };
    expect(keepEdges(before, { start: false, end: true })).toBe(before);
    expect(keepEdges(before, { start: true, end: true })).toEqual({ start: true, end: true });
  });

  it('fade only the edges with more past them', () => {
    expect(fadeMask({ start: false, end: false }, '2rem')).toBeUndefined();
    expect(fadeMask({ start: false, end: true }, '2rem')).toBe(
      'linear-gradient(to right, #000, #000 2rem, #000 calc(100% - 2rem), transparent)',
    );
    expect(fadeMask({ start: true, end: false }, '2rem')).toBe(
      'linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), #000)',
    );
  });

  it('scroll by most of a page, no further than the ends', () => {
    expect(pageLeft({ ...ROW, left: 0 }, 1)).toBe(240);
    expect(pageLeft({ ...ROW, left: 600 }, 1)).toBe(700);
    expect(pageLeft({ ...ROW, left: 300 }, -1)).toBe(60);
    expect(pageLeft({ ...ROW, left: 100 }, -1)).toBe(0);
  });

  it('bring an option into sight with a margin, and leave one in sight where it is', () => {
    const box = { ...ROW, left: 200 };
    expect(revealLeft(box, { left: 300, width: 100 }, 32)).toBe(200);
    expect(revealLeft(box, { left: 600, width: 100 }, 32)).toBe(432);
    expect(revealLeft(box, { left: 100, width: 80 }, 32)).toBe(68);
    expect(revealLeft(box, { left: 10, width: 80 }, 32)).toBe(0);
    expect(revealLeft(box, { left: 950, width: 50 }, 32)).toBe(700);
  });
});

import { describe, expect, it } from 'vitest';
import { activeIndex, slug } from '../../src/methodology/spy';

describe('the table of contents follows the reading', () => {
  it('names a heading from its text', () => {
    expect(slug('Losses before shops: the formula')).toBe('losses-before-shops-the-formula');
    expect(slug('Énergie à la ferme')).toBe('energie-a-la-ferme');
  });

  it('marks the last heading above the line, the first before any, the last at the end', () => {
    expect(activeIndex([100, 500, 900], 600)).toBe(1);
    expect(activeIndex([100, 500, 900], 50)).toBe(0);
    expect(activeIndex([100, 500, 900], 600, true)).toBe(2);
    expect(activeIndex([], 600, true)).toBe(0);
  });
});

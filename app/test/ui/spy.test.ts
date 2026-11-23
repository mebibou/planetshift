import { describe, expect, it } from 'vitest';
import { activeIndex, slug } from '../../src/methodology/spy';
import { textOf, withHeadingIds } from '../../src/methodology/headings';

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

describe('a section’s headings', () => {
  it('get an id from their text, markup and entities dropped', () => {
    const { html, heads } = withHeadingIds(
      '<h1>Waste</h1><h2>Losses &amp; <code>waste</code></h2><p>x</p><h2>The data</h2>',
      'method-waste',
    );
    expect(heads).toEqual([
      { id: 'method-waste-losses-waste', title: 'Losses & waste' },
      { id: 'method-waste-the-data', title: 'The data' },
    ]);
    expect(html).toContain('<h2 id="method-waste-the-data">The data</h2>');
    expect(textOf('a &lt; b')).toBe('a < b');
  });
});

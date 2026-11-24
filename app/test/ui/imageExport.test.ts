import { describe, expect, it } from 'vitest';
import {
  compose,
  escapeXml,
  legendHeight,
  legendPlaces,
  stack,
  withExtension,
  wrapText,
  type LegendItem,
} from '../../src/app/imageExport';

const item = (label: string): LegendItem => ({ label, colour: '#2a78d6', kind: 'line' });
const colours = { ink: '#17241e', muted: '#55635c', background: '#ffffff' };

describe('an exported chart', () => {
  it('wraps text by words, a long word on a line of its own', () => {
    expect(wrapText('Global temperature from 1850 to 2050', 20)).toEqual([
      'Global temperature',
      'from 1850 to 2050',
    ]);
    expect(wrapText('a supercalifragilistic word', 10)).toEqual([
      'a',
      'supercalifragilistic',
      'word',
    ]);
    expect(wrapText('', 10)).toEqual([]);
  });

  it('stacks blocks with a gap between them', () => {
    expect(stack([100, 50, 20], 10)).toEqual({ tops: [0, 110, 170], height: 190 });
    expect(stack([], 10)).toEqual({ tops: [], height: 0 });
  });

  it('wraps its legend onto new rows past the width', () => {
    const items = [item('Observed'), item('Without the levers'), item('With the levers')];
    expect(legendPlaces(items, 1000).map((p) => p.row)).toEqual([0, 0, 0]);
    expect(legendPlaces(items, 200).map((p) => p.row)).toEqual([0, 1, 2]);
    expect(legendHeight(items, 200)).toBe(3 * legendHeight(items, 1000));
    expect(legendHeight([], 200)).toBe(0);
  });

  it('sets the title, the description, the drawing and the credit in one SVG', () => {
    const out = compose({
      title: 'Global temperature',
      description: 'Observed, without the levers & with them',
      credit: 'Planetshift · planetshift.org · 2026-11-23',
      colours,
      blocks: [
        {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><path d="M0 0"/></svg>',
          width: 600,
          height: 300,
          legend: [item('With the levers')],
        },
      ],
    });
    expect(out.width).toBeGreaterThan(600);
    expect(out.svg).toMatch(
      new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" width="${out.width}"`),
    );
    expect(out.svg).toContain('>Global temperature</text>');
    expect(out.svg).toContain('without the levers &amp; with them');
    expect(out.svg).toMatch(/<svg x="0" y="\d+" width="600" height="300" xmlns/);
    expect(out.svg).toContain('planetshift.org');
    expect(out.height).toBeGreaterThan(300);
  });

  it('escapes text and renames a file for its format', () => {
    expect(escapeXml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
    expect(withExtension('planetshift-temperature-x.csv', 'png')).toBe(
      'planetshift-temperature-x.png',
    );
  });
});

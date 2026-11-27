import { describe, expect, it } from 'vitest';
import {
  cellText,
  futuresAt,
  interpolate,
  levelsText,
  readGroup,
  readRow,
  rowInfo,
  warmingAt,
} from '../../src/app/impacts';
import type { ImpactGroup } from '../../src/data/types';
import { headlineRows } from '../../src/ui/Impacts';
import { translator } from '../../src/i18n/i18n';

const tr = translator('en');
/** The texts with their no-break spaces as plain ones. */
const t: typeof tr = (key, values) => tr(key, values).replace(/\u00a0/g, ' ');
const plain = (text: string) => text.replace(/\u00a0/g, ' ');

/** SPM.6's drought row, whose 95th percentile falls from 3 °C to 4 °C. */
const WGI: ImpactGroup = {
  id: 'wgi',
  url: '',
  jointly: false,
  levels: [1, 1.5, 2, 3, 4],
  rows: [
    {
      id: 'drought10',
      unit: 'times',
      ref: 'IPCC AR6 WGI Figure SPM.6, panel d',
      mid: [1.7, 2.04, 2.38, 3.23, 4.08],
      low: [0.68, 1.02, 1.33, 1.36, 1.7],
      high: [4.08, 5.1, 5.83, 7.68, 7.21],
    },
  ],
};

const SR15: ImpactGroup = {
  id: 'sr15',
  url: '',
  jointly: true,
  levels: [1.5, 2],
  rows: [
    { id: 'coral', unit: 'percent', ref: 'p. 8', low: [70, 99], high: [90, 100] },
    { id: 'arctic', unit: 'perCentury', ref: 'p. 8', mid: [1, 10] },
  ],
};

const drought = WGI.rows[0]!;

describe('reading between levels', () => {
  it('is linear between the two levels around the warming', () => {
    expect(interpolate([1.5, 2], [6, 18], 1.75)).toBeCloseTo(12);
    expect(interpolate([1, 1.5, 2, 3, 4], [1.7, 2.04, 2.38, 3.23, 4.08], 2.5)).toBeCloseTo(2.805);
  });

  it('gives the assessed value at a level', () => {
    expect(interpolate([1.5, 2, 3], [14, 18, 29], 2)).toBeCloseTo(18);
    expect(interpolate([1.5, 2, 3], [14, 18, 29], 1.5)).toBeCloseTo(14);
    expect(interpolate([1.5, 2, 3], [14, 18, 29], 3)).toBeCloseTo(29);
  });

  it('reads nothing beyond the highest or below the lowest level', () => {
    expect(interpolate([1.5, 2], [6, 18], 2.01)).toBeNull();
    expect(interpolate([1.5, 2], [6, 18], 1.49)).toBeNull();
    expect(readRow(WGI.levels, drought, 4.2)).toEqual({ kind: 'above', level: 4 });
    expect(readRow(SR15.levels, SR15.rows[1]!, 1.2)).toEqual({ kind: 'below', level: 1.5 });
  });

  it('reads each bound on its own, so a range that narrows stays a range', () => {
    const r = readRow(WGI.levels, drought, 3.5);
    expect(r.kind).toBe('value');
    if (r.kind === 'value') {
      expect(r.mid).toBeCloseTo(3.655);
      expect(r.low).toBeCloseTo(1.53);
      expect(r.high).toBeCloseTo(7.445);
    }
    const at3 = readRow(WGI.levels, drought, 3);
    expect(at3.kind === 'value' && at3.high).toBeCloseTo(7.68);
  });

  it('leaves out a bound the row does not give', () => {
    expect(readRow(SR15.levels, SR15.rows[0]!, 1.75)).toEqual({
      kind: 'value',
      mid: null,
      low: 84.5,
      high: 95,
    });
  });
});

describe('the warming read', () => {
  it('is the 20-year centred mean at the horizon, shorter at the end of the series', () => {
    const years = Array.from({ length: 41 }, (_, i) => 2060 + i);
    const values = years.map((y) => (y - 2060) / 10);
    expect(warmingAt(years, values, 2080)).toBeCloseTo(1.95);
    expect(warmingAt(years, values, 2100)).toBeCloseTo(3.5);
    expect(warmingAt(years, values, 2101)).toBeNull();
  });

  it('is taken from each future’s median', () => {
    const years = [2049, 2050, 2051];
    const band = (v: number) => ({ median: [v, v, v], p05: [0, 0, 0], p95: [9, 9, 9] });
    const temperature = { years, baseline: band(2.7), scenario: band(1.8) };
    const futures = futuresAt(temperature as never, 2050);
    expect(futures?.baseline).toBeCloseTo(2.7);
    expect(futures?.scenario).toBeCloseTo(1.8);
    expect(futuresAt(temperature as never, 2100)).toBeNull();
  });
});

describe('the 2 °C limit of SR1.5 and the heatwave study', () => {
  it('reads both futures when both are at or below 2 °C', () => {
    const g = readGroup(SR15, { baseline: 2, scenario: 1.6 });
    expect(g.rows[1]!.cells).toEqual([
      { kind: 'value', mid: 10, low: null, high: null },
      expect.objectContaining({ kind: 'value' }),
    ]);
  });

  it('gives a future above 2 °C at least the 2 °C value, and still reads the other', () => {
    const g = readGroup(SR15, { baseline: 2.7, scenario: 1.8 });
    expect(g.rows[0]!.cells[0]).toEqual({ kind: 'atLeast', level: 2, value: 99 });
    expect(g.rows[1]!.cells[0]).toEqual({ kind: 'atLeast', level: 2, value: 10 });
    expect(g.rows[1]!.cells[1].kind).toBe('value');
    expect(cellText(t, 'en', 'percent', g.rows[0]!.cells[0])).toBe('≥ 99%');
    expect(rowInfo(t, 'en', SR15, g.rows[0]!).join(' ')).toContain(
      'shows at least its value at 2 °C',
    );
  });

  it('does not apply to the rows read one future at a time', () => {
    const g = readGroup(WGI, { baseline: 4.4, scenario: 2.5 });
    expect(g.rows[0]!.cells[0]).toEqual({ kind: 'above', level: 4 });
    expect(g.rows[0]!.cells[1].kind).toBe('value');
  });
});

describe('the texts', () => {
  it('give a central value, else a range, else the level beyond', () => {
    expect(cellText(t, 'en', 'times', { kind: 'value', mid: 4.11, low: 2.8, high: 4.7 })).toBe(
      '4.1×',
    );
    expect(cellText(t, 'en', 'percent', { kind: 'value', mid: null, low: 3, high: 18 })).toBe(
      '3–18%',
    );
    expect(cellText(t, 'en', 'percent', { kind: 'above', level: 2 })).toBe(
      'not assessed above 2 °C',
    );
    expect(cellText(t, 'en', 'times', { kind: 'below', level: 1.5 })).toBe(
      'not assessed below 1.5 °C',
    );
  });

  it('list the levels a source assessed', () => {
    expect(plain(levelsText('en', [1, 1.5, 2, 3, 4]))).toBe('1 °C, 1.5 °C, 2 °C, 3 °C, and 4 °C');
  });

  it('put the source’s range in the (i), apart from the value', () => {
    const r = readGroup(WGI, { baseline: 3.5, scenario: 2 }).rows[0]!;
    const info = rowInfo(t, 'en', WGI, r);
    expect(info[1]).toContain('2.4× at 2 °C');
    expect(info[2]).toBe(
      'IPCC range, 5–95% of the models: 1.5–7.4× without the levers; 1.3–5.8× with them.',
    );
    expect(info.at(-1)).toBe('IPCC AR6 WGI Figure SPM.6, panel d');
  });

  it('give no range for a row that has only a range', () => {
    const r = readGroup(SR15, { baseline: 1.9, scenario: 1.6 }).rows[0]!;
    expect(rowInfo(t, 'en', SR15, r)).toHaveLength(3);
  });
});

describe('the headline tiles', () => {
  it('are the same rows at every warming, where a source stops too', () => {
    const at = (baseline: number, scenario = 1.8) =>
      headlineRows([
        readGroup(WGI, { baseline, scenario }),
        readGroup(SR15, { baseline, scenario }),
      ]);
    expect(at(1.9).map((x) => x.r.row.id)).toEqual(['coral', 'arctic', 'drought10']);
    expect(at(2.4).map((x) => x.r.row.id)).toEqual(['coral', 'arctic', 'drought10']);
    expect(at(2.4)[0]?.r.cells[0].kind).toBe('atLeast');
    expect(at(1.9, 1.2).map((x) => x.r.row.id)).toEqual(['drought10', 'coral', 'arctic']);
  });
});

describe('wildfire and river floods', () => {
  const FIRE: ImpactGroup = {
    id: 'fire',
    url: '',
    jointly: false,
    levels: [2, 4],
    rows: [{ id: 'burnedArea', unit: 'percent', ref: 'p. 272', low: [30, 50], high: [35, 70] }],
  };
  const FLOOD: ImpactGroup = {
    id: 'flood',
    url: '',
    jointly: true,
    levels: [1.5, 2, 3],
    rows: [
      {
        id: 'riverFlood',
        unit: 'millions',
        ref: 'Table S5',
        mid: [199, 207, 223],
        low: [173, 174, 177],
        high: [226, 230, 258],
      },
    ],
  };

  it('read the burned area between 2 °C and 4 °C only', () => {
    const [above, below] = readGroup(FIRE, { baseline: 3, scenario: 1.8 }).rows[0]!.cells;
    expect(cellText(t, 'en', 'percent', above)).toBe('40–53%');
    expect(cellText(t, 'en', 'percent', below)).toBe('not assessed below 2 °C');
  });

  it('give the people exposed to floods in millions, at least the 3 °C value above it', () => {
    const r = readGroup(FLOOD, { baseline: 3.4, scenario: 2.5 }).rows[0]!;
    expect(cellText(t, 'en', 'millions', r.cells[0])).toBe('≥ 223 million');
    expect(cellText(t, 'en', 'millions', r.cells[1])).toBe('215 million');
    expect(rowInfo(t, 'en', FLOOD, r)[2]).toBe(
      "Lowest to highest of the study's nine models: 176–244 million with them.",
    );
  });
});

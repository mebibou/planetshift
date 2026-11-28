import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { placeholders } from '../../src/i18n/dict';
import { PAGE_TEXTS, withPageTexts } from '../../src/deeptime/texts';
import {
  between,
  clampView,
  END_YEAR,
  FIRST_YEAR,
  fractionOf,
  MIN_SPAN,
  panBy,
  placed,
  PRESET_VIEWS,
  markerView,
  PRESETS,
  sameView,
  ticksOf,
  unitOf,
  yearAt,
  zoomAt,
  type View,
} from '../../src/deeptime/scale';
import {
  extentOf,
  fastestRate,
  inView,
  observedTrend,
  paleoLines,
  pointAt,
  rateBetween,
  readout,
  tableOf,
  ratesOf,
  recentLines,
  warmingIn2100,
  type DeepTimeFile,
  type Line,
  type Point,
} from '../../src/deeptime/series';
import type { ScenarioResult } from '../../src/model/api';

const fixture = JSON.parse(
  readFileSync(new URL('../../public/fixtures/deeptime.json', import.meta.url), 'utf8'),
) as DeepTimeFile;

const span = (v: View) => v.end - v.start;

describe('the deep-time scale', () => {
  it('opens a marker’s window a fifth of its age before it, to 2100', () => {
    const lgm = markerView(1950 - 21_000);
    expect(lgm.end).toBe(END_YEAR);
    expect(lgm.start).toBeCloseTo(1950 - 21_000 - 0.2 * (END_YEAR - 1950 + 21_000), 6);
    expect(fractionOf(lgm, 1950 - 21_000)).toBeGreaterThan(0);
    expect(markerView(1950 - 445e6).start).toBeGreaterThanOrEqual(FIRST_YEAR);
  });

  it('puts a window’s start at 0 and its end at 1', () => {
    PRESETS.forEach((p) => {
      const v = PRESET_VIEWS[p];
      expect(fractionOf(v, v.start)).toBeCloseTo(0, 9);
      expect(fractionOf(v, v.end)).toBeCloseTo(1, 9);
    });
  });

  it('gives the recent edge at most three times the room of the old edge', () => {
    const v = PRESET_VIEWS.industrial;
    const d = 1;
    const recent = fractionOf(v, v.end) - fractionOf(v, v.end - d);
    const old = fractionOf(v, v.start + d) - fractionOf(v, v.start);
    expect(recent / old).toBeCloseTo(3, 1);
  });

  it('tends to a linear axis for a window far in the past', () => {
    const v = { start: -100e6, end: -99e6 };
    expect(fractionOf(v, -99.5e6)).toBeCloseTo(0.5, 2);
  });

  it('reads back the year at a fraction', () => {
    const v = PRESET_VIEWS.glacial;
    [0, 0.13, 0.5, 0.97, 1].forEach((f) => expect(fractionOf(v, yearAt(v, f))).toBeCloseTo(f, 9));
  });

  it('zooms around a year, which stays where it was', () => {
    const v = PRESET_VIEWS.cenozoic;
    const year = yearAt(v, 0.3);
    const zoomed = zoomAt(v, year, 0.25);
    expect(span(zoomed)).toBeCloseTo(span(v) * 0.25, -2);
    expect(fractionOf(zoomed, year)).toBeCloseTo(0.3, 6);
  });

  it('keeps the window between 485 million years ago and 2100, and no shorter than its minimum', () => {
    const out = zoomAt(PRESET_VIEWS.phanerozoic, 0, 10);
    expect(out.start).toBeCloseTo(FIRST_YEAR, -1);
    expect(out.end).toBeCloseTo(END_YEAR, 6);
    expect(span(zoomAt(PRESET_VIEWS.industrial, 2000, 1e-6))).toBeCloseTo(MIN_SPAN, 6);
    expect(clampView({ start: 2000, end: 2300 })).toEqual({ start: 1800, end: END_YEAR });
  });

  it('places a year at a fraction of a window of a given span', () => {
    const v = placed(1000, 500, 0.25);
    expect(span(v)).toBeCloseTo(1000, 6);
    expect(fractionOf(v, 500)).toBeCloseTo(0.25, 6);
    expect(placed(1000, 1500, 0.25).end).toBe(END_YEAR);
  });

  it('pans into the past for a positive step, and stops at 2100', () => {
    const v = { start: 0, end: 1000 };
    expect(panBy(v, 0.2).end).toBeLessThan(1000);
    expect(panBy(PRESET_VIEWS.commonEra, -0.5)).toEqual(PRESET_VIEWS.commonEra);
  });

  it('moves between two windows from one to the other', () => {
    const path = between(PRESET_VIEWS.phanerozoic, PRESET_VIEWS.industrial);
    expect(sameView(path(0), PRESET_VIEWS.phanerozoic)).toBe(true);
    expect(sameView(path(1), PRESET_VIEWS.industrial)).toBe(true);
    const spans = [0.25, 0.5, 0.75].map((k) => span(path(k)));
    expect(spans[0]).toBeGreaterThan(spans[1]!);
    expect(spans[1]).toBeGreaterThan(spans[2]!);
  });

  it('labels in millions of years, thousands of years, or years', () => {
    expect(unitOf(PRESET_VIEWS.phanerozoic)).toBe('myr');
    expect(unitOf(PRESET_VIEWS.cenozoic)).toBe('myr');
    expect(unitOf(PRESET_VIEWS.glacial)).toBe('kyr');
    expect(unitOf(PRESET_VIEWS.commonEra)).toBe('year');
    expect(unitOf(PRESET_VIEWS.industrial)).toBe('year');
  });

  it('gives round ticks inside the window, in order and apart', () => {
    const ticks = ticksOf(PRESET_VIEWS.phanerozoic, 8, 2026);
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.every((t) => Number.isInteger(t.value / 50))).toBe(true);
    expect(ticks.map((t) => t.year)).toEqual([...ticks.map((t) => t.year)].sort((a, b) => a - b));
    const years = ticksOf(PRESET_VIEWS.industrial, 6, 2026);
    expect(years.map((t) => t.value)).toContain(1900);
    expect(years.every((t) => t.year === t.value)).toBe(true);
  });
});

const temperature = (): ScenarioResult['temperature'] => {
  const years = Array.from({ length: 251 }, (_, i) => 1850 + i);
  const rise = years.map((y) => Math.max(0, (y - 1970) * 0.02));
  return {
    years,
    observed: years.map((y, i) => (y <= 2024 ? rise[i]! : null)),
    baseline: { median: rise, p05: rise, p95: rise },
    scenario: {
      median: rise.map((v) => v * 0.8),
      p05: rise.map((v) => v * 0.7),
      p95: rise.map((v) => v * 0.9),
    },
    avoided: { median: [], p05: [], p95: [] },
    avoidedByCause: {
      fossilIndustry: [],
      agriculture: [],
      landUse: [],
      landAlbedo: [],
      waste: [],
      airPollution: [],
      other: [],
    },
    avoidedByFood: {},
    avoidedByGas: {
      co2: { fossilIndustry: [], agriculture: [], landUse: [], waste: [], other: [] },
      ch4: { fossilIndustry: [], agriculture: [], landUse: [], waste: [], other: [] },
      n2o: { fossilIndustry: [], agriculture: [], landUse: [], waste: [], other: [] },
      hfc: { fossilIndustry: [], agriculture: [], landUse: [], waste: [], other: [] },
    },
  };
};

describe('the deep-time series', () => {
  it('draws PhanDA’s stages as steps, two points a stage', () => {
    const phanda = paleoLines(fixture)[0]!;
    expect(phanda.points).toHaveLength(2 * fixture.phanda.p50.length);
    expect(phanda.points[0]).toEqual({ year: fixture.phanda.from[0], mid: 20, lo: 17, hi: 23 });
    expect(phanda.points[1]!.year).toBe(fixture.phanda.to[0]);
  });

  it('keeps the paleo series oldest first, and LGMR ending at 0 in 1850', () => {
    const lines = paleoLines(fixture);
    expect(lines.map((l) => l.id)).toEqual(['phanda', 'cenozoic', 'lgmr', 'pages2k']);
    lines.forEach((l) => {
      const years = l.points.map((p) => p.year);
      expect(years).toEqual([...years].sort((a, b) => a - b));
    });
    expect(lines[2]!.points.at(-1)).toMatchObject({ year: 1850, mid: 0 });
  });

  it('ends with Explore’s series: observed to the last year, projections from the current year', () => {
    const [observed, baseline, scenario] = recentLines(temperature(), 2026);
    expect(observed!.points.at(-1)!.year).toBe(2024);
    expect(observed!.points[0]!.year).toBe(1850);
    expect(baseline!.points[0]!.year).toBe(2026);
    expect(baseline!.points.at(-1)!.year).toBe(END_YEAR);
    expect(scenario!.points.at(-1)).toMatchObject({ year: 2100, lo: expect.any(Number) });
  });

  it('reads the 2100 warming without and with the levers', () => {
    const end = warmingIn2100(temperature());
    expect(end.baseline).toBeCloseTo(2.6, 6);
    expect(end.scenario).toBeCloseTo(2.08, 6);
  });

  it('keeps the points in a window and one on each side', () => {
    const points: Point[] = [0, 10, 20, 30, 40].map((year) => ({ year, mid: year }));
    expect(inView(points, { start: 15, end: 25 }).map((p) => p.year)).toEqual([10, 20, 30]);
    expect(inView(points, { start: 50, end: 60 })).toEqual([]);
    expect(inView(points, { start: -20, end: -10 })).toEqual([]);
    expect(inView(points, { start: 12, end: 18 }).map((p) => p.year)).toEqual([10, 20]);
  });

  it('spans the shown values and bands, with 0 and 2 °C always in', () => {
    const lines = [...paleoLines(fixture), ...recentLines(temperature(), 2026)];
    expect(extentOf(lines, PRESET_VIEWS.phanerozoic)).toEqual([-7.65, 23]);
    const [lo, hi] = extentOf(lines, PRESET_VIEWS.industrial);
    expect(lo).toBeLessThanOrEqual(-0.3);
    expect(hi).toBeCloseTo(2.6, 6);
  });

  it('measures rates of change in °C per century', () => {
    const line: Point[] = [0, 100, 200, 300].map((year) => ({ year, mid: year / 100 }));
    expect(rateBetween(line, 0, 300)).toBeCloseTo(1, 9);
    expect(observedTrend(line, 50)).toBeCloseTo(1, 9);
    const jump: Point[] = [0, 200, 400, 600].map((year, i) => ({ year, mid: i === 2 ? 2 : 0 }));
    expect(fastestRate(jump, 200)).toBeCloseTo(1, 9);
  });

  it('sets the past rates against today’s, the extinction threshold far below', () => {
    const rates = ratesOf(fixture, recentLines(temperature(), 2026), 2026);
    const of = (id: string) => rates.find((r) => r.id === id)!.perCentury;
    expect(of('threshold')).toBeCloseTo(0.001, 9);
    expect(of('observed')).toBeCloseTo(2, 6);
    expect(of('projected')).toBeCloseTo(2, 6);
    expect(of('deglacialMean')).toBeLessThan(of('observed'));
  });
});

describe('the deep-time page’s own texts', () => {
  const [EN, FR] = [PAGE_TEXTS.en, PAGE_TEXTS.fr];

  it('have the same keys and placeholders in English and French, none empty', () => {
    expect(Object.keys(FR).sort()).toEqual(Object.keys(EN).sort());
    Object.keys(EN).forEach((key) =>
      expect([key, placeholders(FR[key] ?? '')]).toEqual([key, placeholders(EN[key] ?? '')]),
    );
    [...Object.values(EN), ...Object.values(FR)].forEach((v) => expect(v.trim()).not.toBe(''));
  });

  it('are read before the app’s, which answers every other key', () => {
    const t = withPageTexts((key) => `app:${key}`, 'fr');
    expect(t('deeptime.title')).toBe(FR['deeptime.title']);
    expect(t('nav.deeptime')).toBe('app:nav.deeptime');
  });
});

describe('the deep-time readout', () => {
  const steps: Line = {
    id: 'phanda',
    points: [
      { year: -300, mid: 10, lo: 8, hi: 12 },
      { year: -200, mid: 10, lo: 8, hi: 12 },
      { year: -200, mid: 4, lo: 2, hi: 6 },
      { year: -100, mid: 4, lo: 2, hi: 6 },
    ],
  };
  const fine: Line = {
    id: 'observed',
    points: [
      { year: 1900, mid: 0 },
      { year: 2000, mid: 1 },
    ],
  };

  it('reads a stage flat across it and a fine series between its points', () => {
    expect(pointAt(steps.points, -250)).toEqual({ year: -250, mid: 10, lo: 8, hi: 12 });
    expect(pointAt(steps.points, -150)?.mid).toBe(4);
    expect(pointAt(fine.points, 1950)).toEqual({
      year: 1950,
      mid: 0.5,
      lo: undefined,
      hi: undefined,
    });
  });

  it('gives nothing outside a series, and lists only the series that cover the year', () => {
    expect(pointAt(fine.points, 1800)).toBeNull();
    expect(pointAt(fine.points, 2050)).toBeNull();
    expect(pointAt(fine.points, 1900)?.mid).toBe(0);
    expect(readout([steps, fine], 1950).map((r) => r.id)).toEqual(['observed']);
    expect(readout([steps, fine], -250).map((r) => r.id)).toEqual(['phanda']);
  });

  it('tables only the series that reach the window, with a gap where one stops', () => {
    const table = tableOf([steps, fine], [-250, 1950]);
    expect(table.ids).toEqual(['phanda', 'observed']);
    expect(table.rows.map((r) => r.values.map((v) => v?.mid ?? null))).toEqual([
      [10, null],
      [null, 0.5],
    ]);
    expect(tableOf([steps, fine], [1950]).ids).toEqual(['observed']);
  });
});

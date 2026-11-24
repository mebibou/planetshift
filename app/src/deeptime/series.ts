import type { ScenarioResult } from '../model/api';
import type { View } from './scale';

/** deeptime.json: every series already on 1850–1900, years CE (negative before the common era). */
export interface DeepTimeFile {
  baseline: string;
  /** What was added to each series to put it on 1850–1900, °C. */
  offsets: Record<PaleoId, number>;
  phanda: {
    from: number[];
    to: number[];
    p05: number[];
    p16: number[];
    p50: number[];
    p84: number[];
    p95: number[];
  };
  cenozoic: { years: number[]; median: number[] };
  lgmr: { years: number[]; mean: number[]; p05: number[]; p95: number[] };
  pages2k: { years: number[]; median: number[]; p05: number[]; p95: number[] };
  extinctionThreshold: { warming: number; degreesPerMyr: number; source: string };
}

export const PALEO_IDS = ['phanda', 'cenozoic', 'lgmr', 'pages2k'] as const;
export type PaleoId = (typeof PALEO_IDS)[number];
export type SeriesId = PaleoId | 'observed' | 'baseline' | 'scenario';

export interface Point {
  year: number;
  mid: number;
  lo?: number;
  hi?: number;
}

/** One line, with its band where it has one; a step series holds two points a stage. */
export interface Line {
  id: SeriesId;
  points: Point[];
}

type Temperature = ScenarioResult['temperature'];

const banded = (years: number[], mid: number[], lo?: number[], hi?: number[]): Point[] =>
  years.map((year, i) => ({ year, mid: mid[i]!, lo: lo?.[i], hi: hi?.[i] }));

/** The paleo series, oldest first: PhanDA's stages as steps, then the finer series. */
export const paleoLines = (f: DeepTimeFile): Line[] => [
  {
    id: 'phanda',
    points: f.phanda.from.flatMap((from, i) => {
      const at = { mid: f.phanda.p50[i]!, lo: f.phanda.p05[i], hi: f.phanda.p95[i] };
      return [
        { year: from, ...at },
        { year: f.phanda.to[i]!, ...at },
      ];
    }),
  },
  { id: 'cenozoic', points: banded(f.cenozoic.years, f.cenozoic.median) },
  { id: 'lgmr', points: banded(f.lgmr.years, f.lgmr.mean, f.lgmr.p05, f.lgmr.p95) },
  {
    id: 'pages2k',
    points: banded(f.pages2k.years, f.pages2k.median, f.pages2k.p05, f.pages2k.p95),
  },
];

/**
 * The app's own series, as Explore's temperature chart draws them: the observed years, and the
 * scenario without and with the levers from the current year to 2100.
 */
export const recentLines = (tp: Temperature, currentYear: number): Line[] => {
  const future = (b: Temperature['baseline']) =>
    banded(tp.years, b.median, b.p05, b.p95).filter((p) => p.year >= currentYear);
  const observed = tp.years.flatMap((year, i) => {
    const v = tp.observed[i];
    return v === null || v === undefined ? [] : [{ year, mid: v }];
  });
  return [
    { id: 'observed', points: observed },
    { id: 'baseline', points: future(tp.baseline) },
    { id: 'scenario', points: future(tp.scenario) },
  ];
};

/** The points in the window, with one more on each side so that lines run to its edges. */
export const inView = (points: Point[], v: View): Point[] => {
  const first = points.findIndex((p) => p.year >= v.start);
  const after = points.findIndex((p) => p.year > v.end);
  const outside = first === -1 || after === 0;
  const to = after === -1 ? points.length : after + 1;
  return outside ? [] : points.slice(Math.max(0, first - 1), to);
};

const between = (a: number, b: number, k: number) => a + (b - a) * k;
const optional = (a: number | undefined, b: number | undefined, k: number) =>
  a === undefined || b === undefined ? undefined : between(a, b, k);

/** A point in a year between two points, by straight line. */
const interpolated = (a: Point, b: Point, year: number): Point => {
  const k = b.year > a.year ? (year - a.year) / (b.year - a.year) : 0;
  return {
    year,
    mid: between(a.mid, b.mid, k),
    lo: optional(a.lo, b.lo, k),
    hi: optional(a.hi, b.hi, k),
  };
};

/** A series' value and range in a year, between its two nearest points; none outside them. */
export const pointAt = (points: Point[], year: number): Point | null => {
  const i = points.findIndex((p) => p.year >= year);
  const [a, b] = [points[i - 1], points[i]];
  return b && a ? interpolated(a, b, year) : b?.year === year ? b : null;
};

/** Each series' value in a year, for the hover: the series that cover it, in the legend's order. */
export const readout = (lines: Line[], year: number): { id: SeriesId; point: Point }[] =>
  lines.flatMap((l) => {
    const point = pointAt(l.points, year);
    return point ? [{ id: l.id, point }] : [];
  });

/**
 * The table beside the chart: `n` years evenly spaced across the window as the axis draws it,
 * and each series' value in each, or null where the series does not reach.
 */
export const tableOf = (
  lines: Line[],
  years: number[],
): { ids: SeriesId[]; rows: { year: number; values: (Point | null)[] }[] } => {
  const ids = lines.filter((l) => years.some((y) => pointAt(l.points, y))).map((l) => l.id);
  const shown = lines.filter((l) => ids.includes(l.id));
  return {
    ids,
    rows: years.map((year) => ({ year, values: shown.map((l) => pointAt(l.points, year)) })),
  };
};

/** The temperatures shown in the window, bands included, with 0 and 2 °C always in. */
export const extentOf = (lines: Line[], v: View): [number, number] => {
  const values = lines.flatMap((l) =>
    inView(l.points, v).flatMap((p) => [p.mid, p.lo ?? p.mid, p.hi ?? p.mid]),
  );
  return [Math.min(0, ...values), Math.max(2, ...values)];
};

/** The median warming in 2100 without and with the levers, °C. */
export const warmingIn2100 = (tp: Temperature): { baseline: number; scenario: number } => {
  const i = tp.years.indexOf(2100);
  const at = i === -1 ? tp.years.length - 1 : i;
  return { baseline: tp.baseline.median[at]!, scenario: tp.scenario.median[at]! };
};

const PER_CENTURY = 100;

/** The least-squares trend of the last `years` observed values, °C per century. */
export const observedTrend = (observed: Point[], years = 50): number => {
  const last = observed.slice(-years);
  const n = last.length;
  const mx = last.reduce((s, p) => s + p.year, 0) / n;
  const my = last.reduce((s, p) => s + p.mid, 0) / n;
  const sxy = last.reduce((s, p) => s + (p.year - mx) * (p.mid - my), 0);
  const sxx = last.reduce((s, p) => s + (p.year - mx) ** 2, 0);
  return (sxy / sxx) * PER_CENTURY;
};

/** The change between two years of a series (nearest points), °C per century. */
export const rateBetween = (points: Point[], from: number, to: number): number => {
  const near = (year: number) =>
    points.reduce((a, b) => (Math.abs(b.year - year) < Math.abs(a.year - year) ? b : a));
  const [a, b] = [near(from), near(to)];
  return ((b.mid - a.mid) / (b.year - a.year)) * PER_CENTURY;
};

/** The fastest warming over any `window` years of an evenly spaced series, °C per century. */
export const fastestRate = (points: Point[], window: number): number => {
  const step = points.length > 1 ? points[1]!.year - points[0]!.year : window;
  const gap = Math.max(1, Math.round(window / step));
  return Math.max(
    ...points
      .slice(gap)
      .map((p, i) => ((p.mid - points[i]!.mid) / (p.year - points[i]!.year)) * PER_CENTURY),
  );
};

export interface Rate {
  id: 'threshold' | 'holocene' | 'deglacialMean' | 'deglacialFastest' | 'observed' | 'projected';
  perCentury: number;
}

/**
 * Rates of change to set against today's, °C per century. Past rates are averages over a
 * thousand years or more, so a fast spike within them would not show.
 */
export const ratesOf = (f: DeepTimeFile, recent: Line[], currentYear: number): Rate[] => {
  const lgmr = paleoLines(f)[2]!.points;
  const byId = (id: SeriesId) => recent.find((l) => l.id === id)?.points ?? [];
  const baseline = byId('baseline');
  return [
    { id: 'threshold', perCentury: f.extinctionThreshold.degreesPerMyr / 1e4 },
    { id: 'holocene', perCentury: rateBetween(lgmr, 1950 - 9000, 1850) },
    { id: 'deglacialMean', perCentury: rateBetween(lgmr, 1950 - 18_000, 1950 - 11_000) },
    { id: 'deglacialFastest', perCentury: fastestRate(lgmr, 1000) },
    { id: 'observed', perCentury: observedTrend(byId('observed')) },
    { id: 'projected', perCentury: rateBetween(baseline, currentYear, 2100) },
  ];
};

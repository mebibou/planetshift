import type { Cause, Climate, Enso, EnsoPhase, LeverCause, Ssp } from '../data/types';

export interface Point {
  year: number;
  value: number;
}

export const zipSeries = (years: number[], values: (number | null)[]): Point[] =>
  years.flatMap((year, i) => {
    const value = values[i];
    return value === null || value === undefined || !Number.isFinite(value)
      ? []
      : [{ year, value }];
  });

export interface BandPoint {
  year: number;
  lo: number;
  hi: number;
}

export const zipBand = (years: number[], lo: number[], hi: number[]): BandPoint[] =>
  years.flatMap((year, i) => {
    const [l, u] = [lo[i], hi[i]];
    return l === undefined || u === undefined ? [] : [{ year, lo: l, hi: u }];
  });

export const inRange = <P extends { year: number }>(points: P[], from: number, to: number): P[] =>
  points.filter((p) => p.year >= from && p.year <= to);

export interface EnsoMark extends Point {
  phase: Exclude<EnsoPhase, 'neutral'>;
  oni: number;
}

/** The observed points of El Niño and La Niña years, each with its phase and annual ONI. */
export const ensoMarks = (enso: Enso | undefined, observed: readonly Point[]): EnsoMark[] => {
  const byYear = new Map((enso?.years ?? []).map((y, i) => [y, i]));
  return observed.flatMap((p) => {
    const i = byYear.get(p.year);
    const phase = i === undefined ? undefined : enso?.phase[i];
    const oni = i === undefined ? undefined : enso?.oni[i];
    return phase === undefined || phase === 'neutral' || oni === undefined
      ? []
      : [{ ...p, phase, oni }];
  });
};

/**
 * The causes in the order they are stacked, warming up from zero and cooling down from it, so
 * a colour always sits beside the same neighbours.
 */
export const CAUSES: readonly Cause[] = [
  'fossilIndustry',
  'agriculture',
  'landUse',
  'other',
  'natural',
  'airPollution',
];

export type Attribution = Climate['attribution'][Ssp];

/** The causes a build has: one made before air pollution and the natural factors were split has neither. */
export const causesIn = (attribution: Attribution): Cause[] =>
  CAUSES.filter((c) => attribution[c] !== undefined);

export type CauseRow = { year: number } & Record<Cause, number>;

/**
 * Rows of { year, fossilIndustry, agriculture, … } from the attribution medians, for d3.stack;
 * with `avoided` (°C by cause on `avoided.years`), each lever cause less what the levers avoid.
 */
export const attributionRows = (
  attribution: Attribution,
  avoided?: { years: readonly number[]; byCause: Readonly<Record<LeverCause, readonly number[]>> },
): CauseRow[] => {
  const causes = causesIn(attribution);
  const years = attribution.fossilIndustry.years;
  const index = new Map(avoided?.years.map((y, i) => [y, i]));
  return years.map((year, i) => {
    const k = index.get(year);
    return {
      year,
      ...(Object.fromEntries(
        CAUSES.map((c) => {
          const s = attribution[c];
          if (!s || !causes.includes(c)) return [c, 0];
          const j = s.years[i] === year ? i : s.years.indexOf(year);
          const less =
            avoided && k !== undefined && c in avoided.byCause
              ? (avoided.byCause[c as LeverCause][k] ?? 0)
              : 0;
          return [c, (s.median[j] ?? 0) - less];
        }),
      ) as Record<Cause, number>),
    };
  });
};

/** The causes biggest first by the size of their warming (or cooling) in `year`, for the legend. */
export const causesBySize = (attribution: Attribution, year: number): Cause[] => {
  const row = attributionRows(attribution).find((r) => r.year === year);
  return [...causesIn(attribution)].sort(
    (a, b) => Math.abs(row?.[b] ?? 0) - Math.abs(row?.[a] ?? 0),
  );
};

/** The lever causes biggest first by the warming they cause in `year`, for the panel's headings. */
export const leverCausesBySize = (
  attribution: Attribution,
  year: number,
  causes: readonly LeverCause[],
): LeverCause[] => {
  const row = attributionRows(attribution).find((r) => r.year === year);
  return [...causes].sort((a, b) => (row?.[b] ?? 0) - (row?.[a] ?? 0));
};

/** Each cause's warming in a year and their sum, the warming measured from all of them. */
export const causesAt = (
  attribution: Attribution,
  year: number,
): { total: number; byCause: Record<Cause, number> } | null => {
  const row = attributionRows(attribution).find((r) => r.year === year);
  if (!row) return null;
  const byCause = Object.fromEntries(CAUSES.map((c) => [c, row[c]])) as Record<Cause, number>;
  return { total: CAUSES.reduce((s, c) => s + row[c], 0), byCause };
};

/** Pairs the gap between two series at a year, for the chart annotation. */
export const gapAt = (years: number[], a: number[], b: number[], year: number): number | null => {
  const i = years.indexOf(year);
  const [x, y] = [a[i], b[i]];
  return i < 0 || x === undefined || y === undefined ? null : y - x;
};

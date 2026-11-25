import {
  GASES,
  type BandSeries,
  type Cause,
  type CauseWarming,
  type Climate,
  type Enso,
  type EnsoPhase,
  type Gas,
  type LeverCause,
  type Ssp,
} from '../data/types';

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

type EnsoYear = Pick<EnsoMark, 'phase' | 'oni'>;

/** El Niño and La Niña years, each with its phase and annual ONI. */
const ensoYears = (enso: Enso): Map<number, EnsoYear> =>
  new Map(
    enso.years.flatMap((year, i): [number, EnsoYear][] => {
      const [phase, oni] = [enso.phase[i], enso.oni[i]];
      return phase !== undefined && phase !== 'neutral' && oni !== undefined
        ? [[year, { phase, oni }]]
        : [];
    }),
  );

/** The observed points of El Niño and La Niña years, each with its phase and annual ONI. */
export const ensoMarks = (enso: Enso | undefined, observed: readonly Point[]): EnsoMark[] => {
  const byYear = enso ? ensoYears(enso) : new Map<number, EnsoYear>();
  return observed.flatMap((p) => {
    const e = byYear.get(p.year);
    return e ? [{ ...p, ...e }] : [];
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
  'waste',
  'burning',
  'permafrost',
  'other',
  'natural',
  'landAlbedo',
  'airPollution',
];

/** The warming by cause of every emission, or of one gas, which has fewer causes. */
export type Attribution = Partial<Record<Cause, BandSeries>>;

/** What the causes chart shows: every cause of warming, or one greenhouse gas's by cause. */
export const CAUSE_GASES = ['all', ...GASES] as const;
export type CauseGas = (typeof CAUSE_GASES)[number];

/** The gas choices a build has a split for: all gases alone without one, and HFCs only from builds that run them. */
export const causeGasesOf = (climate: Climate): CauseGas[] =>
  CAUSE_GASES.filter(
    (g) =>
      g === 'all' ||
      (climate.attributionByGas !== undefined &&
        Object.values(climate.attributionByGas).every((bySsp) => bySsp[g] !== undefined)),
  );

/** The attribution of a gas choice; all gases' when the build has no split by gas. */
export const attributionOf = (climate: Climate, ssp: Ssp, gas: CauseGas): Attribution =>
  gas === 'all'
    ? climate.attribution[ssp]
    : (climate.attributionByGas?.[ssp][gas] ?? climate.attribution[ssp]);

/** A change by cause on `years`, the warming the baseline adds to or takes from each. */
export interface CauseChange {
  years: readonly number[];
  byCause: Readonly<Partial<Record<Cause, readonly number[]>>>;
}

/** A band moved by a change on other years, read by year; unchanged where it has none. */
const shiftBand = (s: BandSeries, index: Map<number, number>, change: readonly number[]) => {
  const at = (i: number) => change[index.get(s.years[i] as number) ?? -1] ?? 0;
  return {
    years: s.years,
    median: s.median.map((v, i) => v + at(i)),
    p05: s.p05.map((v, i) => v + at(i)),
    p95: s.p95.map((v, i) => v + at(i)),
  };
};

/** A band of zeros on `years`, for a cause only the baseline adds (permafrost). */
const zeroBand = (years: number[]): BandSeries => {
  const zeros = years.map(() => 0);
  return { years, median: zeros, p05: zeros, p95: zeros };
};

/**
 * The attribution with what the baseline adds to each cause, a cause only the baseline has
 * included, so the stack meets the line without the levers.
 */
export const shiftedBy = (attribution: Attribution, change: CauseChange | null): Attribution => {
  const index = new Map(change?.years.map((y, i) => [y, i]));
  const zero = zeroBand(Object.values(attribution)[0]?.years ?? []);
  const causes = CAUSES.filter((c) => attribution[c] ?? change?.byCause[c]?.some((v) => v !== 0));
  return change
    ? (Object.fromEntries(
        causes.map((c) => {
          const own = change.byCause[c];
          const s = attribution[c] ?? zero;
          return [c, own ? shiftBand(s, index, own) : s];
        }),
      ) as Attribution)
    : attribution;
};

/** The baseline's change in a gas choice's causes, from a run; none without one. */
export const changeOf = (
  temperature: { years: number[]; baselineChange?: CauseWarming } | undefined,
  gas: CauseGas,
): CauseChange | null => {
  const change = temperature?.baselineChange;
  return temperature && change
    ? {
        years: temperature.years,
        byCause: gas === 'all' ? change.byCause : (change.byGas[gas as Gas] ?? {}),
      }
    : null;
};

/** A gas choice's attribution with what the baseline adds to each cause, from a run. */
export const attributionFor = (
  climate: Climate,
  ssp: Ssp,
  gas: CauseGas,
  temperature: { years: number[]; baselineChange?: CauseWarming } | undefined,
): Attribution => shiftedBy(attributionOf(climate, ssp, gas), changeOf(temperature, gas));

/** The causes a build has: one made before air pollution and the natural factors were split has neither. */
export const causesIn = (attribution: Attribution): Cause[] =>
  CAUSES.filter((c) => attribution[c] !== undefined);

export type CauseRow = { year: number } & Record<Cause, number>;

/**
 * Rows of { year, fossilIndustry, agriculture, … } from the attribution medians, for d3.stack;
 * with `avoided` (°C by cause on `avoided.years`), each lever cause less what the levers avoid.
 */
/** A band's median in `year`, at index `i` when its years line up with the attribution's. */
const medianAt = (s: BandSeries, i: number, year: number): number =>
  s.median[s.years[i] === year ? i : s.years.indexOf(year)] ?? 0;

/** What the levers avoid of a cause at index `k` of their years; nothing for another cause. */
const avoidedAt = (avoided: AvoidedSeries | undefined, c: Cause, k: number | undefined): number =>
  avoided && k !== undefined ? (avoided.byCause[c as LeverCause]?.[k] ?? 0) : 0;

interface AvoidedSeries {
  years: readonly number[];
  byCause: Readonly<Partial<Record<LeverCause, readonly number[]>>>;
}

export const attributionRows = (attribution: Attribution, avoided?: AvoidedSeries): CauseRow[] => {
  const causes = causesIn(attribution);
  const years = (causes[0] === undefined ? undefined : attribution[causes[0]])?.years ?? [];
  const index = new Map(avoided?.years.map((y, i) => [y, i]));
  return years.map((year, i) => {
    const k = index.get(year);
    return {
      year,
      ...(Object.fromEntries(
        CAUSES.map((c) => {
          const s = attribution[c];
          return [c, s && causes.includes(c) ? medianAt(s, i, year) - avoidedAt(avoided, c, k) : 0];
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
  return row
    ? {
        total: CAUSES.reduce((s, c) => s + row[c], 0),
        byCause: Object.fromEntries(CAUSES.map((c) => [c, row[c]])) as Record<Cause, number>,
      }
    : null;
};

/** Pairs the gap between two series at a year, for the chart annotation. */
export const gapAt = (years: number[], a: number[], b: number[], year: number): number | null => {
  const i = years.indexOf(year);
  const [x, y] = [a[i], b[i]];
  return i < 0 || x === undefined || y === undefined ? null : y - x;
};

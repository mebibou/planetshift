import { ticks as niceTicks } from 'd3';

/**
 * The deep-time axis: a window of years (CE, negative before the common era) drawn on a log scale
 * of the years before 2100, shifted by half the window's span. Within any window, a year at the
 * recent edge gets at most three times the room of a year at the old edge: enough for today's
 * warming to show in the 24,000-year and 2,000-year windows, without squeezing the old edge as a
 * plain log axis would. A window panned into the past tends to a linear axis.
 */
export const END_YEAR = 2100;
/** The start of PhanDA's oldest stage, the Tremadocian (486.85 Ma before 1950). */
export const FIRST_YEAR = 1950 - 486.85e6;
export const MIN_SPAN = 30;
export const MAX_SPAN = END_YEAR - FIRST_YEAR;
/** The shift, as a share of the window's span: 0.5 gives at most 3 to 1 between the edges. */
const SKEW = 0.5;

export interface View {
  start: number;
  end: number;
}

export const PRESETS = ['phanerozoic', 'cenozoic', 'glacial', 'commonEra', 'industrial'] as const;
export type Preset = (typeof PRESETS)[number];

export const PRESET_VIEWS: Record<Preset, View> = {
  phanerozoic: { start: FIRST_YEAR, end: END_YEAR },
  cenozoic: { start: 1950 - 67e6, end: END_YEAR },
  glacial: { start: 1950 - 24_000, end: END_YEAR },
  commonEra: { start: 0, end: END_YEAR },
  industrial: { start: 1850, end: END_YEAR },
};

const span = (v: View) => v.end - v.start;

/** The log scale's two edges for a window: the years before 2100 plus the shift. */
const edges = (v: View) => {
  const shift = SKEW * span(v);
  return { shift, right: END_YEAR - v.end + shift, left: END_YEAR - v.start + shift };
};

/** Where `year` falls across the window, 0 at its start and 1 at its end. */
export const fractionOf = (v: View, year: number): number => {
  const { shift, right, left } = edges(v);
  return Math.log(left / (END_YEAR - year + shift)) / Math.log(left / right);
};

/** The year at a fraction of the window. */
export const yearAt = (v: View, fraction: number): number => {
  const { shift, right, left } = edges(v);
  return END_YEAR + shift - left * (right / left) ** fraction;
};

/** The window moved and cut to fit between FIRST_YEAR and END_YEAR. */
export const clampView = (v: View): View => {
  const width = Math.min(MAX_SPAN, Math.max(MIN_SPAN, span(v)));
  const end = Math.min(END_YEAR, Math.max(FIRST_YEAR + width, v.end));
  return { start: end - width, end };
};

/** A marker's window: from a fifth of its age before it to 2100, so it shows with today. */
export const markerView = (year: number): View =>
  clampView({ start: year - 0.2 * (END_YEAR - year), end: END_YEAR });

/** The window of a given span that puts `year` at `fraction` across it, found by bisection. */
export const placed = (width: number, year: number, fraction: number): View => {
  const at = (end: number) => fractionOf({ start: end - width, end }, year);
  const target = Math.min(1, Math.max(0, fraction));
  let lo = year;
  let hi = year + width;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    [lo, hi] = at(mid) > target ? [mid, hi] : [lo, mid];
  }
  const end = (lo + hi) / 2;
  return clampView({ start: end - width, end });
};

/** Zooms by `factor` (below 1 zooms in) keeping `year` where it is. */
export const zoomAt = (v: View, year: number, factor: number): View => {
  const width = Math.min(MAX_SPAN, Math.max(MIN_SPAN, span(v) * factor));
  return placed(width, year, fractionOf(v, year));
};

/** Moves the window so that the year at its centre goes to `0.5 + by` (a positive `by` shows the past). */
export const panBy = (v: View, by: number): View => placed(span(v), yearAt(v, 0.5), 0.5 + by);

/** A window between `a` and `b`, at `k` from 0 to 1: span and distance from 2100 move on log scales. */
export const between =
  (a: View, b: View) =>
  (k: number): View => {
    const lerp = (x: number, y: number) => Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * k);
    const width = lerp(span(a), span(b));
    const end = END_YEAR + 1 - lerp(END_YEAR + 1 - a.end, END_YEAR + 1 - b.end);
    return clampView({ start: end - width, end });
  };

/** Whether two windows show the same years, to within a thousandth of their span. */
export const sameView = (a: View, b: View): boolean =>
  Math.abs(a.start - b.start) + Math.abs(a.end - b.end) <= span(b) * 1e-3;

export type Unit = 'myr' | 'kyr' | 'year';

/** Millions of years ago for windows of 3 Myr or more, thousands down to 15,000 years, else years. */
export const unitOf = (v: View): Unit =>
  span(v) >= 3e6 ? 'myr' : span(v) >= 15_000 ? 'kyr' : 'year';

const UNIT_YEARS: Record<Unit, number> = { myr: 1e6, kyr: 1e3, year: 1 };

export interface Tick {
  year: number;
  /** The tick's value in its unit: years ago for 'myr' and 'kyr', the calendar year for 'year'. */
  value: number;
}

/** About `count` round ticks in the window's unit, oldest first. */
const roundTicks = (v: View, count: number, present: number): Tick[] => {
  const unit = unitOf(v);
  const per = UNIT_YEARS[unit];
  const ago = unit !== 'year';
  const [lo, hi] = ago
    ? [Math.max(0, (present - v.end) / per), (present - v.start) / per]
    : [v.start, v.end];
  return niceTicks(lo, hi, count)
    .map((value) => ({ value, year: ago ? present - value * per : value }))
    .filter((t) => t.year >= v.start && t.year <= v.end)
    .sort((a, b) => a.year - b.year);
};

const apart = (v: View, ticks: Tick[], minGap: number): boolean =>
  ticks.every(
    (t, i) => i === 0 || fractionOf(v, t.year) - fractionOf(v, ticks[i - 1]!.year) >= minGap,
  );

/**
 * Round ticks in the window's unit, `present` being year 0 of "years ago": the most, up to about
 * `count`, whose neighbours are all at least `minGap` (a fraction of the width) apart.
 */
export const ticksOf = (v: View, count: number, present: number, minGap = 0.06): Tick[] => {
  const sets = Array.from({ length: Math.max(1, count - 1) }, (_, i) =>
    roundTicks(v, count - i, present),
  );
  return sets.find((s) => apart(v, s, minGap)) ?? sets.at(-1) ?? [];
};

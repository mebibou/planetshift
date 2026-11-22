import type { ScenarioResult } from '../model/api';

/** The Paris Agreement's two levels, °C above 1850–1900. */
export const LEVELS = [1.5, 2] as const;
export type Level = (typeof LEVELS)[number];

/** Where current policies lead by 2100 (Climate Action Tracker, November 2026; UNEP EGR 2026). */
export const CURRENT_POLICIES = { low: 2.7, high: 2.8 } as const;

/** IPCC warming levels are 20-year averages. */
export const WINDOW = 20;

/** Centred mean over `window` years, on the years the series has at its ends. */
export const centredMean = (values: readonly number[], window = WINDOW): number[] => {
  const before = Math.floor(window / 2);
  return values.map((_, i) => {
    const part = values.slice(
      Math.max(0, i - before),
      Math.min(values.length, i - before + window),
    );
    return part.reduce((a, b) => a + b, 0) / part.length;
  });
};

/** The first year the 20-year mean of a series reaches the level, or null when it never does. */
export const crossingYear = (
  years: readonly number[],
  values: readonly number[],
  level: number,
): number | null => {
  const i = centredMean(values).findIndex((v) => v >= level);
  return i < 0 ? null : (years[i] ?? null);
};

/**
 * The share of the gap between the baseline and a target that the scenario closes:
 * (baseline − scenario) ÷ (baseline − target); null when the baseline is already at or below it.
 */
export const gapClosed = (baseline: number, scenario: number, target: number): number | null =>
  baseline > target ? (baseline - scenario) / (baseline - target) : null;

/** The highest value from a year on, its year, and whether it is still rising at the end. */
export const peakOf = (
  years: readonly number[],
  values: readonly number[],
  from: number,
): { year: number; value: number; rising: boolean } | null => {
  const points = years.flatMap((year, i) =>
    year >= from && values[i] !== undefined ? [{ year, value: values[i] as number }] : [],
  );
  const top = points.reduce<(typeof points)[number] | null>(
    (best, p) => (best === null || p.value > best.value ? p : best),
    null,
  );
  return top ? { ...top, rising: top.year === points.at(-1)?.year } : null;
};

export interface Milestone {
  level: Level;
  /** The year the baseline's and the scenario's medians reach the level, null for not before the end. */
  baseline: number | null;
  scenario: number | null;
  /** The scenario's likely range of that year: its warm edge's year, then its cool edge's. */
  early: number | null;
  late: number | null;
  /** The share of the gap to the level closed in the last year, null when the baseline stays below. */
  closed: number | null;
}

export interface Milestones {
  levels: Milestone[];
  end: number;
  peak: { year: number; value: number; rising: boolean } | null;
}

/** Crossing years, gap closed in the last year and the scenario's peak, from a run's temperature. */
export const milestones = (
  temperature: ScenarioResult['temperature'],
  currentYear: number,
): Milestones => {
  const { years, baseline, scenario } = temperature;
  const warm = scenario.p05.map((v, i) => Math.max(v, scenario.p95[i] ?? v));
  const cool = scenario.p05.map((v, i) => Math.min(v, scenario.p95[i] ?? v));
  const last = years.length - 1;
  return {
    end: years[last] ?? currentYear,
    levels: LEVELS.map((level) => ({
      level,
      baseline: crossingYear(years, baseline.median, level),
      scenario: crossingYear(years, scenario.median, level),
      early: crossingYear(years, warm, level),
      late: crossingYear(years, cool, level),
      closed: gapClosed(baseline.median[last] ?? 0, scenario.median[last] ?? 0, level),
    })),
    peak: peakOf(years, scenario.median, currentYear),
  };
};

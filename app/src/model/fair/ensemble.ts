// Running every member of a model on a scenario, and the ensemble's percentiles as the pipeline
// takes them (climate.py's `anomaly` and `band`).

import type { Model } from './calibration';
import { memberOf, runMember } from './member';
import { annualMeans, type PreparedScenario } from './scenario';

export const START = 1750;
const BASELINE_FIRST = 1850;
const BASELINE_LAST = 1900;

/** Each member's annual-mean surface temperature from 1750; `noise(k)` gives member k's internal
 * variability, or null to run without it. */
export const runEnsemble = (
  model: Model,
  prepared: PreparedScenario,
  noise: (k: number) => Float64Array | null = () => null,
): Float64Array[] =>
  model.members.map((p, k) =>
    annualMeans(runMember(model, memberOf(model, p), prepared, noise(k)).temperature),
  );

/** °C relative to the member's 1850–1900 mean, years from START. */
export const anomaly = (annual: Float64Array): Float64Array => {
  const window = annual.subarray(BASELINE_FIRST - START, BASELINE_LAST - START + 1);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  return annual.map((v) => v - mean);
};

/** numpy's default (linear) percentile of sorted values. */
export const percentile = (sorted: ArrayLike<number>, q: number): number => {
  const position = (q / 100) * (sorted.length - 1);
  const lo = Math.floor(position);
  const hi = Math.min(lo + 1, sorted.length - 1);
  const a = sorted[lo] as number;
  return a + (position - lo) * ((sorted[hi] as number) - a);
};

export type Band = { p05: number; median: number; p95: number };

/** The 5th, 50th and 95th percentiles across members of their value in `year`. */
export const bandAt = (members: readonly Float64Array[], year: number): Band => {
  const sorted = Float64Array.from(members, (m) => m[year - START] as number).sort();
  return {
    p05: percentile(sorted, 5),
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
  };
};

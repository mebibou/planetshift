// Option B of issue #66: a subset of the 841 members chosen to keep the full ensemble's median and
// 5–95% range on the SSPs, read from the Python runs `fair_ts_export` writes. An analysis, not a
// check: it prints how close subsets of 30, 50 and 100 members get, on what they were chosen for
// and on scenarios they were not.

import { describe, expect, it } from 'vitest';
import { anomaly, bandAt, type Band } from '../../../src/model/fair/ensemble';
import { exported, readPython, SCENARIOS } from './exported';

type Runs = Record<string, Float64Array[]>;
type Target = { name: string; year: number; of: (runs: Runs, members: readonly number[]) => Band };

const SSPS = ['ssp126', 'ssp245', 'ssp370'];
const YEARS = [2050, 2100];
const DECADES = [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];
const BETWEEN = DECADES.map((y) => y - 5);

const pick = (rows: readonly Float64Array[], members: readonly number[]) =>
  members.map((k) => rows[k] as Float64Array);

const level = (scenario: string, year: number): Target => ({
  name: `${scenario} ${year}`,
  year,
  of: (runs, members) => bandAt(pick(runs[scenario] as Float64Array[], members), year),
});

/** The warming a run takes away from SSP2-4.5, as climate.json's attribution reads it. */
const avoided = (scenario: string, year: number): Target => ({
  name: `${scenario} avoided ${year}`,
  year,
  of: (runs, members) => {
    const base = pick(runs.ssp245 as Float64Array[], members);
    const less = pick(runs[scenario] as Float64Array[], members);
    return bandAt(
      base.map((b, k) => b.map((v, t) => v - ((less[k] as Float64Array)[t] as number))),
      year,
    );
  },
});

/** Chosen on: the three SSPs and SSP2-4.5 without air pollution and with every emission stopped
 * from 2025, which bring in the aerosols' uncertainty and the zero end. */
const FITTED_SCENARIOS = [...SSPS, 'ssp245-airPollution', 'ssp245-stopped'];
const FITTED = FITTED_SCENARIOS.flatMap((s) => DECADES.map((y) => level(s, y)));
const HELD_OUT: Record<string, Target[]> = {
  'years between': FITTED_SCENARIOS.flatMap((s) => BETWEEN.map((y) => level(s, y))),
  'agriculture removed': YEARS.map((y) => level('ssp245-agriculture', y)),
  'agriculture avoided': YEARS.map((y) => avoided('ssp245-agriculture', y)),
  'air pollution avoided': YEARS.map((y) => avoided('ssp245-airPollution', y)),
  'stopping avoided': YEARS.map((y) => avoided('ssp245-stopped', y)),
};
const HELD = Object.values(HELD_OUT).flat();

const worst = (a: Band, b: Band): number =>
  Math.max(Math.abs(a.p05 - b.p05), Math.abs(a.median - b.median), Math.abs(a.p95 - b.p95));

const errorOn = (
  targets: readonly Target[],
  runs: Runs,
  full: Band[],
  members: readonly number[],
) => Math.max(...targets.map((t, i) => worst(t.of(runs, members), full[i] as Band)));

/** mulberry32: a small seeded generator, so the search is reproducible. */
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** One member from each of `k` strata of the members ranked by `rank`. */
const stratified = (ranked: readonly number[], k: number, next: () => number): number[] =>
  Array.from({ length: k }, (_, i) => {
    const lo = Math.floor((i * ranked.length) / k);
    const hi = Math.floor(((i + 1) * ranked.length) / k);
    return ranked[lo + Math.floor(next() * (hi - lo))] as number;
  });

/** The search's budget: FAIR_SUBSET_SIZES, _ITERATIONS and _RESTARTS override it. */
const SIZES = (process.env.FAIR_SUBSET_SIZES ?? '30,50,100').split(',').map(Number);
const ITERATIONS = Number(process.env.FAIR_SUBSET_ITERATIONS ?? 20000);
const RESTARTS = Number(process.env.FAIR_SUBSET_RESTARTS ?? 1);

/** Swaps one member for another while that brings the error on `targets` down. */
const refine = (
  start: number[],
  score: (m: readonly number[]) => number,
  all: number,
  next: () => number,
) => {
  let best = start;
  let bestScore = score(best);
  for (let i = 0; i < ITERATIONS; i++) {
    const out = Math.floor(next() * best.length);
    const candidate = Math.floor(next() * all);
    const trial = best.includes(candidate) ? best : best.map((m, k) => (k === out ? candidate : m));
    const s = score(trial);
    if (s < bestScore) {
      best = trial;
      bestScore = s;
    }
  }
  return best;
};

const centred = (ranked: readonly number[], k: number): number[] =>
  Array.from(
    { length: k },
    (_, i) => ranked[Math.floor(((i + 0.5) * ranked.length) / k)] as number,
  );

const quantile = (xs: readonly number[], q: number): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(q * (xs.length - 1))] as number;

/** Prints how close subsets get on `runs` (anomalies, one row per member, by scenario). */
const analyse = (label: string, runs: Runs): number[][] => {
  const all = (runs.ssp245 as Float64Array[]).length;
  const everyone = Array.from({ length: all }, (_, k) => k);
  const fullFitted = FITTED.map((t) => t.of(runs, everyone));
  const fullHeld = Object.fromEntries(
    Object.entries(HELD_OUT).map(([k, ts]) => [k, ts.map((t) => t.of(runs, everyone))]),
  );
  const at2100 = (k: number) => (runs.ssp245 as Float64Array[])[k]?.[2100 - 1750] as number;
  const ranked = [...everyone].sort((a, b) => at2100(a) - at2100(b));
  const errors = (members: readonly number[]) => ({
    fitted: errorOn(FITTED, runs, fullFitted, members),
    held: Object.fromEntries(
      Object.entries(HELD_OUT).map(([k, ts]) => [
        k,
        errorOn(ts, runs, fullHeld[k] as Band[], members),
      ]),
    ),
  });
  const line = (e: ReturnType<typeof errors>) =>
    `fitted ${e.fitted.toFixed(3)} °C; held out ${Object.entries(e.held)
      .map(([k, v]) => `${k} ${v.toFixed(3)}`)
      .join(', ')}`;
  console.log(`— ${label}`);
  return SIZES.map((k) => {
    const next = random(k);
    const draws = Array.from({ length: 200 }, () => errors(stratified(ranked, k, next)));
    const typical = {
      fitted: quantile(
        draws.map((d) => d.fitted),
        0.5,
      ),
      held: Object.fromEntries(
        Object.keys(HELD_OUT).map((g) => [
          g,
          quantile(
            draws.map((d) => d.held[g] as number),
            0.5,
          ),
        ]),
      ),
    };
    console.log(`${k} members, random strata (median of 200): ${line(typical)}`);
    console.log(
      `${k} members, centred strata on SSP2-4.5 2100: ${line(errors(centred(ranked, k)))}`,
    );
    const score = (m: readonly number[]) => errorOn(FITTED, runs, fullFitted, m);
    const best = Array.from({ length: RESTARTS }, () =>
      refine(stratified(ranked, k, next), score, all, next),
    ).reduce((a, b) => (score(b) < score(a) ? b : a));
    console.log(`${k} members, searched: ${line(errors(best))}`);
    [...SSPS.flatMap((x) => YEARS.map((y) => level(x, y))), ...HELD.slice(40)].forEach((t) => {
      const f = t.of(runs, everyone);
      const s = t.of(runs, best);
      console.log(
        `  ${t.name}: full ${f.median.toFixed(3)} (${f.p05.toFixed(3)}–${f.p95.toFixed(3)}), subset ${s.median.toFixed(3)} (${s.p05.toFixed(3)}–${s.p95.toFixed(3)})`,
      );
    });
    console.log(`  members: ${[...best].sort((a, b) => a - b).join(',')}`);
    return best;
  });
};

describe.skipIf(!exported)('member subsets (option B)', () => {
  it('on the pipeline’s runs', () => {
    const runs: Runs = Object.fromEntries(SCENARIOS.map((s) => [s, readPython(s).map(anomaly)]));
    expect(analyse('Python FaIR', runs)).toHaveLength(SIZES.length);
  });
});

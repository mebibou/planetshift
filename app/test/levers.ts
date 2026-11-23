// Helpers for the lever modules' tests (app/src/levers/<id>/*.test.ts), on the fixtures.
import { expect } from 'vitest';
import { GASES, type Gas } from '../src/data/types';
import type { CoSector } from '../src/levers/energy/data';
import {
  DEFAULT_OPTIONS,
  type Options,
  type Scenario,
  type ScenarioResult,
} from '../src/model/api';
import { runScenario } from '../src/model/run';
import { BASE_SCENARIO } from '../src/model/scenarios';
import { sum } from '../src/model/util';
import { CURRENT_YEAR, loadFixtures } from './model/fixtures';

export { CURRENT_YEAR };
export const data = loadFixtures();

/** The fixtures' CO₂ of producing a sector's fuel per kg of its own, the same every year. */
export const supply = (sector: CoSector): number =>
  data.coemissions.perKgCo2.ssp245[sector].co2[0] as number;

export const run = (scenario: Partial<Scenario> = {}, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );

/** The options a lever needs to act: farm energy cuts fuel, which only cradle to farm gate counts. */
export const ACTS_WITH: Readonly<Partial<Record<string, Partial<Options>>>> = {
  farmEnergy: { scope: 'cradleToFarmGate' },
};

export const lever = (
  id: string,
  adoption = 1,
  scenario: Partial<Scenario> = {},
  options: Partial<Options> = ACTS_WITH[id] ?? {},
) => run({ ...scenario, levers: { [id]: adoption } }, options);

export const w2050 = (r: ScenarioResult) => r.summary.avoidedWarming2050.median;
export const w2100 = (r: ScenarioResult) => r.summary.avoidedWarming2100.median;

export const production = (r: ScenarioResult) =>
  sum(r.countries.map((c) => sum(Object.values(c.productionChange))));

/** A lever alone avoids warming, and only in the gases it cuts. */
export const expectOwnGases = (id: string, gases: readonly Gas[]) => {
  const r = lever(id);
  expect(w2050(r)).toBeGreaterThan(0);
  GASES.forEach((g) =>
    gases.includes(g)
      ? expect(r.summary.avoided[g], g).toBeGreaterThan(0)
      : expect(r.summary.avoided[g], g).toBeCloseTo(0, 3),
  );
};

/**
 * What a lever changes, in a year, on the production a 50% shift changed: its change with the
 * shift less the shift's and its own, as a share of the baseline when `perBaseline`.
 */
export const jointShare = (id: string, gas: Gas, perBaseline: boolean) => {
  const shift = run({ shift: 0.5 });
  const alone = lever(id);
  const both = lever(id, 1, { shift: 0.5 });
  const change = (r: ScenarioResult, i: number) =>
    (r.scenarioEmissions[i]?.[gas] ?? 0) - (r.baselineEmissions[i]?.[gas] ?? 0);
  return (year: number) => {
    const i = both.years.indexOf(year);
    return (
      (change(both, i) - change(shift, i) - change(alone, i)) /
      (perBaseline ? (both.baselineEmissions[i]?.[gas] ?? 1) : 1)
    );
  };
};

/** The share of the ramp reached in a year. */
export const rampShare = (year: number) =>
  (year - CURRENT_YEAR) / (BASE_SCENARIO.rampEnd - CURRENT_YEAR);

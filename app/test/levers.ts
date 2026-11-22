// Helpers for the lever modules' tests (app/src/levers/<id>/*.test.ts), on the fixtures.
import { expect } from 'vitest';
import { GASES, type Gas } from '../src/data/types';
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

export const run = (scenario: Partial<Scenario> = {}, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );

export const lever = (
  id: string,
  adoption = 1,
  scenario: Partial<Scenario> = {},
  options: Partial<Options> = {},
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

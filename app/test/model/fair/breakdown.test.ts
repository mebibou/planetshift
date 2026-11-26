// Issue #66: the breakdown by family as a proportional split (FaIR's exact total shared out by
// the pulse sums' shares) against the exact Shapley values over FaIR runs of every coalition of
// families. An analysis on the real data and the exported FaIR scenarios; skipped without them.

import { describe, expect, it } from 'vitest';
import { GASES, type Gas, type GasVector } from '../../../src/data/types';
import { LEVERS } from '../../../src/levers/registry';
import { DEFAULT_OPTIONS, type Scenario } from '../../../src/model/api';
import { shapley } from '../../../src/model/attribution';
import { warmingFrom } from '../../../src/model/climate';
import { loadModel } from '../../../src/model/fair/calibration';
import { memberOf, runMember, type MemberState } from '../../../src/model/fair/member';
import { prepareScenario, type ScenarioInput } from '../../../src/model/fair/scenario';
import { prepare } from '../../../src/model/prepare';
import { familyEmissionPaths } from '../../../src/model/run';
import { BASE_SCENARIO } from '../../../src/model/scenarios';
import { CURRENT_YEAR } from '../fixtures';
import { loadRealData } from '../realData';
import { exported, readCalibration, readScenario, STEPS } from './exported';

/** The members of pipeline/fair_members.csv, as indices into the calibration's 841. */
const SUBSET = [
  22, 25, 29, 38, 39, 74, 79, 83, 107, 164, 168, 193, 197, 204, 231, 240, 258, 265, 329, 361, 362,
  380, 385, 433, 436, 453, 455, 471, 475, 481, 507, 511, 512, 520, 526, 532, 543, 554, 594, 595,
  620, 626, 645, 762, 770, 772, 803, 821, 825, 835,
];
const START = 1750;
const FROM = 2025 - START;
const HORIZONS = [2050, 2100];
const FAIR_SPECIE: Record<Gas, string> = {
  co2: 'CO2 FFI',
  ch4: 'CH4',
  n2o: 'N2O',
  hfc: 'HFC-134a',
};
const KG_PER_UNIT: Record<Gas, number> = { co2: 1e12, ch4: 1e9, n2o: 1e9, hfc: 1e6 };

const maxed = (keep: (family: string) => boolean): Scenario['levers'] =>
  Object.fromEntries(LEVERS.filter((l) => keep(l.module.family ?? l.id)).map((l) => [l.id, l.max]));

const FAMILIES_WITH_LEVERS = [...new Set(LEVERS.map((l) => l.module.family ?? l.id))];

const SETTINGS: Record<string, Scenario> = {
  'shift 50%': { ...BASE_SCENARIO, shift: 0.5 },
  'everything at max': { ...BASE_SCENARIO, shift: 1, levers: maxed(() => true) },
  ...Object.fromEntries(
    FAMILIES_WITH_LEVERS.map((f) => [
      `${f} alone`,
      { ...BASE_SCENARIO, levers: maxed((g) => g === f) },
    ]),
  ),
  mixed: {
    ...BASE_SCENARIO,
    shift: 0.3,
    levers: Object.fromEntries(LEVERS.filter((_, i) => i % 2 === 0).map((l) => [l.id, l.max / 2])),
  },
};

const isZero = (path: readonly GasVector[]) => path.every((v) => GASES.every((g) => v[g] === 0));

/** The SSP's FaIR emissions with `paths` (kg a year from `first`) added. */
const withPaths = (
  base: ScenarioInput,
  paths: readonly (readonly GasVector[])[],
  first: number,
): ScenarioInput => ({
  ...base,
  emissions: {
    ...base.emissions,
    ...Object.fromEntries(
      GASES.map((g) => {
        const series = Array.from(base.emissions[FAIR_SPECIE[g]] as ArrayLike<number>);
        paths.forEach((path) =>
          path.forEach((v, k) => {
            const t = first + k - START;
            series[t] = (series[t] as number) + v[g] / KG_PER_UNIT[g];
          }),
        );
        return [FAIR_SPECIE[g], series];
      }),
    ),
  },
});

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length / 2;
  return s.length % 2
    ? (s[Math.floor(m)] as number)
    : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

const real = loadRealData();

describe.skipIf(!exported || real === null)(
  'breakdown: proportional split vs Shapley over FaIR',
  () => {
    it('shares the warming avoided out within 0.02 °C or 10% of each family', () => {
      const data = real as NonNullable<typeof real>;
      const prepared = prepare(data);
      const options = DEFAULT_OPTIONS;
      const model = loadModel(readCalibration(), SUBSET);
      const members = model.members.map((p) => memberOf(model, p));
      const ssp = readScenario(options.ssp);
      const base = prepareScenario(model, ssp, STEPS);
      const history: MemberState[] = members.map(
        (m) => runMember(model, m, base, null, undefined, FROM).state,
      );
      const at = (temperature: Float64Array, year: number) =>
        0.5 * ((temperature[year - START] as number) + (temperature[year - START + 1] as number));
      const runOf = (input: ScenarioInput) => {
        const p = prepareScenario(model, input, STEPS, base);
        return members.map((m, k) => runMember(model, m, p, null, history[k]).temperature);
      };
      const baseline = runOf(ssp);
      let worst = 0;
      Object.entries(SETTINGS).forEach(([name, scenario]) => {
        const { years, byFamily } = familyEmissionPaths(prepared, scenario, options, CURRENT_YEAR);
        const players = Object.keys(byFamily).filter((f) => !isZero(byFamily[f] ?? []));
        const worth = (coalition: readonly string[]): number[] => {
          const runs =
            coalition.length === 0
              ? baseline
              : runOf(
                  withPaths(
                    ssp,
                    coalition.map((f) => byFamily[f] ?? []),
                    years[0] as number,
                  ),
                );
          return HORIZONS.map((y) =>
            median(runs.map((r, k) => at(baseline[k] as Float64Array, y) - at(r, y))),
          );
        };
        const exact = shapley(players, worth);
        const total = worth(players);
        const linear = new Map(
          players.map((f) => {
            const w = warmingFrom(
              byFamily[f] ?? [],
              years[0] as number,
              data.climate,
              'fair',
              'median',
              HORIZONS,
            );
            return [f, w.map((v) => -v)];
          }),
        );
        const lines = HORIZONS.map((y, h) => {
          const linearTotal = players.reduce((s, f) => s + (linear.get(f)?.[h] as number), 0);
          const cells = players.map((f) => {
            const split = ((total[h] as number) * (linear.get(f)?.[h] as number)) / linearTotal;
            const shap = exact.get(f)?.[h] as number;
            const error = split - shap;
            const share = Math.abs(error) / Math.abs(total[h] as number);
            worst = Math.max(worst, Math.min(Math.abs(error) / 0.02, share / 0.1));
            return `${f} ${shap.toFixed(4)}→${split.toFixed(4)} (${error >= 0 ? '+' : ''}${error.toFixed(4)} °C, ${(100 * share).toFixed(1)}%)`;
          });
          return `  ${y}: FaIR total ${(total[h] as number).toFixed(4)}, pulse sums ${linearTotal.toFixed(4)}; ${cells.join('; ')}`;
        });
        console.log(`${name} [${players.length} families]\n${lines.join('\n')}`);
      });
      console.log(`worst: ${worst.toFixed(2)} of the threshold (1 = 0.02 °C or 10% of the total)`);
      expect(worst).toBeLessThan(1);
    });
  },
);

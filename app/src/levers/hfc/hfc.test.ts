import { describe, expect, it } from 'vitest';
import fairFixture from '../../../public/fixtures/fair.json';
import { data, lever, run, w2050, w2100 } from '../../../test/levers';
import { GASES, type FairFile } from '../../data/types';
import { loadModel } from '../../model/fair/calibration';
import { prepareScenario } from '../../model/fair/scenario';
import { BASE_SCENARIO } from '../../model/scenarios';
import { dataValueAt, range } from '../../model/util';
import { HFC_LEVER } from './data';
import { burden, carrierStream, co2eGap, hfcCut, hfcCuts, hfcPath } from './model';

const file = data.hfc;
const START = 1750;
const FIRST = 2026;
const years = range(FIRST, 2100);
const cutAt = (y: number) => hfcCut(file, 1, Math.min(1, (y - FIRST) / 10));
const kt = (ssp: 'ssp245', s: string, y: number) =>
  dataValueAt(file.years, file.emissions[ssp][s] as number[], y) / 1e6;

describe('the HFC phase-down', () => {
  it('avoids warming in HFCs alone, attributed to its family', () => {
    const r = lever(HFC_LEVER);
    expect(w2050(r)).toBeGreaterThan(0);
    expect(w2100(r)).toBeGreaterThan(w2050(r));
    expect(r.summary.byFamily.avoidedWarming2100.hfc).toBeCloseTo(w2100(r), 12);
    GASES.filter((g) => g !== 'hfc').forEach((g) => expect(r.summary.avoided[g], g).toBe(0));
    expect(r.summary.avoided.hfc).toBeGreaterThan(0);
  });

  it('cuts the food chain’s refrigerants once, sharing the overlap with the diet', () => {
    const diet = run({ shift: 1 }).summary;
    const alone = lever(HFC_LEVER).summary;
    const both = run({ shift: 1, levers: { [HFC_LEVER]: 1 } }).summary;
    const complete = BASE_SCENARIO.rampEnd;
    expect(complete).toBeGreaterThan(FIRST);
    expect(diet.avoided.hfc).toBeGreaterThan(0);
    expect(both.avoided.hfc).toBeCloseTo(alone.avoided.hfc + 0.1 * diet.avoided.hfc, -3);
    const shares = Object.values(both.byFamily.avoidedWarming2100).reduce((a, b) => a + b, 0);
    expect(shares).toBeCloseTo(both.avoidedWarming2100.median, 12);
    expect(both.byFamily.avoidedWarming2100.hfc).toBeLessThan(alone.avoidedWarming2100.median);
  });
});

describe('the HFCs as an HFC-134a stream', () => {
  it('is the carrier’s own change for the carrier, and the cut less the food levers’ part', () => {
    const own = [-5, -3, 2, 0];
    const stream = carrierStream(file, { 'HFC-134a': own });
    own.forEach((v, k) => expect(stream[k]).toBeCloseTo(v, 9));
    const half = () => 0.5;
    const path = hfcPath(file, hfcCuts(file, 'ssp245', [2050], half), [2050], half, () => -1e6);
    const first = file.species.reduce(
      (t, s) => t - 0.5 * kt('ssp245', s, 2050) * 1e6 * (file.cycles[s]?.relative ?? 0),
      0,
    );
    expect(path[0]).toBeCloseTo(first + 0.5e6, 0);
  });

  it('counts each HFC’s CO₂e at its own GWP100, the carrier’s at the stream’s', () => {
    const cuts = { 'HFC-23': [-1, -1], 'HFC-134a': [-2, 0] };
    const stream = carrierStream(file, cuts);
    const gap = co2eGap(file, cuts, 1530);
    gap.forEach((g, k) =>
      expect(g + 1530 * (stream[k] as number)).toBeCloseTo(-14600 + (k === 0 ? -2 * 1530 : 0), 6),
    );
    const r = lever(HFC_LEVER).summary;
    expect(r.avoidedCo2e).toBeGreaterThan(r.avoided.hfc * 1530);
    expect(r.byFamily.avoidedCo2e.hfc).toBeCloseTo(r.avoidedCo2e, 0);
  });

  it('keeps a long-lived HFC’s cut working long after it stops, unlike its mass in HFC-134a', () => {
    const pulse = [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const stream = carrierStream(file, { 'HFC-23': pulse });
    expect(burden(file.cycles['HFC-134a']!, stream).at(-1)).toBeCloseTo(
      burden(file.cycles['HFC-23']!, pulse).at(-1) as number,
      12,
    );
    expect(stream.slice(1).every((v) => v < 0)).toBe(true);
  });

  it('gives FaIR the same HFC forcing as cutting each HFC', () => {
    const fair = fairFixture as unknown as FairFile;
    const model = loadModel(fair);
    const base = fair.ssp.ssp245;
    const steps = 2101 - START;
    const cut = (s: string, k: number) => {
      const y = START + k;
      return y >= FIRST && file.species.includes(s) ? -cutAt(y) * kt('ssp245', s, y) : 0;
    };
    const each = Object.fromEntries(
      Object.entries(base.emissions).map(([s, v]) => [
        s,
        Array.from(v, (e, k) => (k < steps ? e + cut(s, k) : e)),
      ]),
    );
    const stream = hfcPath(file, hfcCuts(file, 'ssp245', years, cutAt), years, cutAt, () => 0);
    const carried = {
      ...base.emissions,
      'HFC-134a': Array.from(base.emissions['HFC-134a'] as number[], (e, k) =>
        START + k >= FIRST && START + k <= 2100
          ? e + (stream[START + k - FIRST] as number) / 1e6
          : e,
      ),
    };
    const forcing = (emissions: Record<string, ArrayLike<number>>) =>
      prepareScenario(model, { ...base, emissions }, steps).minorForcing;
    const [plain, a, b] = [base.emissions, each, carried].map(forcing);
    const groups = model.minorGroups.length;
    const at = (f: Float64Array, y: number) =>
      f.subarray((y - START) * groups, (y - START + 1) * groups).reduce((t, v) => t + v, 0);
    [2040, 2050, 2075, 2100].forEach((y) => {
      const cut = at(a as Float64Array, y) - at(plain as Float64Array, y);
      const carriedCut = at(b as Float64Array, y) - at(plain as Float64Array, y);
      expect(cut).toBeLessThan(0);
      expect(carriedCut / cut).toBeCloseTo(1, 6);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../model/api';
import { towards } from '../../model/bands';
import { coChange, noxMethane } from './coemissions';
import { CO_SPECIES, EMPTY_COEMISSIONS, type CoSector, type CoSpecies } from './data';
import {
  CLEAN_FUEL_KEEPS_NOX,
  ENERGY_LEVERS,
  energyAdoption,
  energyCo2BySource,
  energyCo2Change,
  type EnergyLever,
} from './model';
import { valueAt } from '../../model/util';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { CURRENT_YEAR, loadFixtures } from '../../../test/model/fixtures';
import { sampleById } from '../../../test/model/samples';

const data = loadFixtures();
const run = (scenario: Partial<Scenario> = {}, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );
const lever = (id: string, adoption = 1, options: Partial<Options> = {}) =>
  run({ levers: { [id]: adoption } }, options);
const w2100 = (r: ReturnType<typeof run>) => r.summary.avoidedWarming2100.median;
const w2050 = (r: ReturnType<typeof run>) => r.summary.avoidedWarming2050.median;
const baselineIn = (r: ReturnType<typeof run>, year: number) =>
  r.temperature.baseline.median[year - r.temperature.years[0]!] as number;
const tailpipe2035 = (sector: 'roadPassenger' | 'roadFreight', ssp = 'ssp245' as const) => {
  const s = data.sectors.co2[ssp][sector];
  return s.values[s.years.indexOf(2035)] as number;
};

describe('energy levers', () => {
  it.each(ENERGY_LEVERS)('%s alone avoids warming and is attributed to energy', (id) => {
    const r = lever(id);
    expect(w2050(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2050.energy).toBeCloseTo(w2050(r), 12);
    expect(r.summary.avoided.ch4).toBeGreaterThan(0);
    expect(r.summary.avoided.n2o).toBe(0);
    expect(r.summary.landFreed).toEqual({ cropland: 0, pasture: 0 });
  });

  it('electric cars save their tailpipe CO₂ less the electricity they draw', () => {
    const r = lever('electricCars');
    const tailpipe = tailpipe2035('roadPassenger');
    expect(r.summary.avoided.co2).toBeGreaterThan(0);
    expect(r.summary.avoided.co2).toBeLessThan(tailpipe);
    const grid = data.sectors.gridIntensity.ssp245;
    const g = grid.values[grid.years.indexOf(2035)] as number;
    expect(r.summary.avoided.co2).toBeCloseTo(tailpipe * (1 - 1.11 * g), -6);
  });

  it('renewable electricity makes electric cars save more', () => {
    const cars = w2100(lever('electricCars'));
    const re = w2100(lever('renewableElectricity'));
    const both = w2100(run({ levers: { electricCars: 1, renewableElectricity: 1 } }));
    expect(both).toBeGreaterThan(cars + re);
    const ctx = { sectors: data.sectors, ssp: 'ssp245' as const, dataCentres: 'ssp' as const };
    const carsOnly = energyCo2Change({ ...ctx, band: 'median' }, 2040, {
      ...energyAdoption(() => 0, 1),
      electricCars: 1,
    });
    const carsOnCleanGrid = energyCo2Change({ ...ctx, band: 'median' }, 2040, {
      ...energyAdoption(() => 0, 1),
      electricCars: 1,
      renewableElectricity: 1,
    });
    expect(carsOnCleanGrid).toBeLessThan(carsOnly);
  });

  it('less flying cuts CO₂ and non-CO₂ forcing; clean fuel leaves the non-CO₂ forcing, so less', () => {
    const fly = lever('flyLess');
    const fuel = lever('cleanAviationFuel');
    expect(fly.summary.avoided.co2).toBeCloseTo(fuel.summary.avoided.co2, 0);
    expect(w2050(fly)).toBeGreaterThan(w2050(fuel));
    expect(w2100(fly)).toBeGreaterThan(w2100(fuel));
    const both = run({ levers: { flyLess: 0.5, cleanAviationFuel: 0.5 } });
    expect(both.summary.avoided.co2).toBeCloseTo(0.75 * fly.summary.avoided.co2, 0);
  });

  it('give a range in the right direction', () => {
    ENERGY_LEVERS.forEach((id) => {
      const w = lever(id).summary.avoidedWarming2100;
      expect(w.p05, id).toBeLessThan(w.median);
      expect(w.p95, id).toBeGreaterThan(w.median);
    });
    expect(towards({ median: 1, low: 0.5, high: 2 }, 'p95', false)).toBe(0.5);
    expect(towards({ median: 1, low: 0.5, high: 2 }, 'p95', true)).toBe(2);
  });

  it('leave the farm emissions and the farming warming line alone', () => {
    const r = sampleById('cleanEnergy');
    const clean = run(r.scenario);
    const none = run();
    expect(clean.scenarioEmissions).toEqual(none.scenarioEmissions);
    expect(clean.temperature.agricultureScenario).toEqual(none.temperature.agricultureScenario);
    expect(w2100(clean)).toBeGreaterThan(0.05);
  });

  it('ramp in with the shift', () => {
    const r = lever('flyLess');
    const early = run({ levers: { flyLess: 1 }, rampEnd: 2045 });
    expect(w2050(early)).toBeLessThan(w2050(r));
  });
});

describe('what comes with the fossil fuel the levers cut', () => {
  const co = data.coemissions;
  const ctx = {
    sectors: data.sectors,
    ssp: 'ssp245' as const,
    dataCentres: 'ssp' as const,
    band: 'median' as const,
  };
  const only = (levers: Partial<Record<EnergyLever, number>>) => ({
    ...energyAdoption(() => 0, 1),
    ...levers,
  });
  const changeOf = (levers: Partial<Record<EnergyLever, number>>, year = 2040) =>
    coChange(co, 'ssp245', year, energyCo2BySource(ctx, year, only(levers)), CLEAN_FUEL_KEEPS_NOX);
  const ratio = (sector: CoSector, species: CoSpecies, year: number) =>
    valueAt(co.years, co.perKgCo2.ssp245[sector][species], year);

  it.each(ENERGY_LEVERS.filter((id) => id !== 'cleanDataCentres'))(
    '%s cuts methane and air pollution in proportion to the CO₂ it removes',
    (id) => {
      const full = changeOf({ [id]: 1 });
      const half = changeOf({ [id]: 0.5 });
      expect(full.ch4).toBeLessThan(0);
      CO_SPECIES.forEach((s) => expect(half[s], s).toBeCloseTo(full[s] / 2, 0));
    },
  );

  it('takes each sector’s ratio of the year, ships keeping their NOx', () => {
    const shipping = energyCo2BySource(ctx, 2040, only({ cleanShipping: 1 })).shipping;
    const change = changeOf({ cleanShipping: 1 });
    expect(change.so2).toBeCloseTo(shipping * ratio('shipping', 'so2', 2040), 0);
    expect(change.ch4).toBeCloseTo(shipping * ratio('shipping', 'ch4', 2040), 0);
    expect(change.nox).toBe(0);
    expect(changeOf({ renewableElectricity: 1 }).nox).toBeLessThan(0);
  });

  it('values the methane NOx leaves by where it is emitted, ships keeping theirs', () => {
    const range = (r: { median: number[] }) => valueAt(co.years, r.median, 2040);
    const roadNox = ratio('roadPassenger', 'nox', 2040);
    const global = range(co.noxCh4PerKg.ssp245);
    expect(range(co.noxCh4PerKgCo2.ssp245.roadPassenger)).toBeLessThan(roadNox * global);
    expect(range(co.noxCh4PerKgCo2.ssp245.shipping)).toBeGreaterThan(
      ratio('shipping', 'nox', 2040) * global,
    );
    const co2 = energyCo2BySource(ctx, 2040, only({ electricCars: 1 }));
    const change = changeOf({ electricCars: 1 });
    const kept = noxMethane(co, 'ssp245', 'median', 2040, { co2, change });
    expect(kept).toBeCloseTo(
      -co2.roadPassenger * range(co.noxCh4PerKgCo2.ssp245.roadPassenger) -
        co2.electricity * range(co.noxCh4PerKgCo2.ssp245.electricity),
      0,
    );
    const ships = energyCo2BySource(ctx, 2040, only({ cleanShipping: 1 }));
    expect(
      noxMethane(co, 'ssp245', 'median', 2040, {
        co2: ships,
        change: changeOf({ cleanShipping: 1 }),
        keepsNox: CLEAN_FUEL_KEEPS_NOX,
      }),
    ).toBe(0);
  });

  it('charges electric vehicles the grid’s co-emissions, less once renewables clean it', () => {
    const cars = changeOf({ electricCars: 1 }).so2;
    const withRenewables =
      changeOf({ electricCars: 1, renewableElectricity: 1 }).so2 -
      changeOf({ renewableElectricity: 1 }).so2;
    expect(withRenewables).toBeLessThan(cars);
  });

  it('makes the warming avoided smaller at first, as cleaner air unmasks some warming', () => {
    const plain = { ...data, coemissions: EMPTY_COEMISSIONS };
    const without = runScenario(
      plain,
      { ...BASE_SCENARIO, levers: { renewableElectricity: 1 } },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    const r = lever('renewableElectricity');
    expect(w2050(r)).toBeLessThan(w2050(without));
    expect(r.summary.byCause.avoidedWarming2050.airPollution).toBeLessThan(0);
    expect(without.summary.byCause.avoidedWarming2050.airPollution).toBe(0);
    expect(without.summary.avoided.ch4).toBe(0);
    expect(r.summary.byCause.avoidedWarming2050.fossilIndustry).toBeGreaterThan(
      without.summary.byCause.avoidedWarming2050.fossilIndustry,
    );
  });

  it('counts the air pollution in its own cause, the parts still adding up', () => {
    const r = run({ levers: { electricCars: 1, renewableElectricity: 1, cleanHeating: 1 } });
    const total = (x: Record<string, number>) => Object.values(x).reduce((a, b) => a + b, 0);
    const s = r.summary;
    expect(total(s.byCause.avoidedWarming2050)).toBeCloseTo(s.avoidedWarming2050.median, 9);
    expect(total(s.byFamily.avoidedWarming2050)).toBeCloseTo(s.avoidedWarming2050.median, 9);
    ['energy', 'industry'].forEach((f) =>
      expect(total(s.byFamilyCause.avoidedWarming2100[f] as Record<string, number>)).toBeCloseTo(
        s.byFamily.avoidedWarming2100[f] as number,
        12,
      ),
    );
    expect(s.byFamilyCause.avoidedWarming2050.energy?.airPollution).toBeLessThan(0);
    expect(s.byCause.avoidedCo2e.airPollution).toBe(0);
    const i = r.temperature.years.indexOf(2050);
    expect(r.temperature.avoidedByCause.airPollution[i]).toBeLessThan(0);
  });
});

describe('the data-centre option', () => {
  it('iea adds the extra demand to the baseline; ssp leaves it out', () => {
    const iea = run({}, { dataCentres: 'iea' });
    const ssp = run({}, { dataCentres: 'ssp' });
    expect(baselineIn(iea, 2050)).toBeGreaterThan(baselineIn(ssp, 2050));
    expect(baselineIn(iea, 2100)).toBeGreaterThan(baselineIn(ssp, 2100));
    expect(baselineIn(iea, 2020)).toBe(baselineIn(ssp, 2020));
    expect(w2100(iea)).toBe(0);
  });
  it('clean data centres act on the extra demand only', () => {
    expect(w2100(lever('cleanDataCentres', 1, { dataCentres: 'iea' }))).toBeGreaterThan(0);
    expect(w2100(lever('cleanDataCentres', 1, { dataCentres: 'ssp' }))).toBe(0);
    expect(w2100(lever('renewableElectricity', 1, { dataCentres: 'iea' }))).toBeGreaterThan(
      w2100(lever('renewableElectricity', 1, { dataCentres: 'ssp' })),
    );
  });
});

describe('energy levers and new options in the URL', () => {
  it('round-trip', () => {
    const scenario: Scenario = {
      ...BASE_SCENARIO,
      groupShifts: { seafood: 0.4 },
      levers: {
        electricCars: 0.5,
        electricTrucks: 0.25,
        flyLess: 0.3,
        cleanAviationFuel: 0.1,
        cleanShipping: 1,
        renewableElectricity: 0.8,
        cleanDataCentres: 0.6,
      },
    };
    const options: Options = { ...DEFAULT_OPTIONS, dataCentres: 'ssp', permafrost: 'on' };
    expect(encodeState(scenario, options)).toBe(
      'sea=40&ev=50&et=25&fl=30&saf=10&cs=100&re=80&cdc=60&dc=ssp&pf=on',
    );
    expect(decodeState(encodeState(scenario, options))).toEqual({ scenario, options });
  });
  it('read invalid values as none or the default', () => {
    const { scenario, options } = decodeState('ev=abc&fl=150&re=-5&cdc=20&dc=x&pf=maybe');
    expect(scenario.levers).toEqual({ cleanDataCentres: 0.2 });
    expect(options.dataCentres).toBe('iea');
    expect(options.permafrost).toBe('off');
  });
});

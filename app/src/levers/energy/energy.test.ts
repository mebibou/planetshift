import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../model/api';
import { towards } from '../../model/bands';
import { departuresOf } from '../../config';
import {
  CO2_PER_CH4,
  coChange,
  coGases,
  coMethane,
  noxMethane,
  vocMethane,
  withCoMethane,
} from './coemissions';
import {
  CO_SPECIES,
  EMPTY_COEMISSIONS,
  type CoEmissions,
  type CoMethaneSplit,
  type CoSector,
  type CoSpecies,
  type RangeSeries,
} from './data';
import {
  CLEAN_FUEL_KEEPS_NOX,
  ENERGY_LEVERS,
  energyAdoption,
  energyCo2BySource,
  type EnergyLever,
} from './model';
import { valueAt } from '../../model/util';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { CURRENT_YEAR, loadFixtures } from '../../../test/model/fixtures';
import { sampleById } from '../../../test/model/samples';
import { supply } from '../../../test/levers';

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
    expect(r.summary.avoided.n2o).toBeGreaterThan(0);
    expect(r.summary.landFreed).toEqual({ cropland: 0, pasture: 0 });
  });

  it('electric cars save their tailpipe CO₂ less the electricity they draw', () => {
    const r = runScenario(
      { ...data, departures: { ...departuresOf(data), fossilMethaneCo2: 'off' } },
      { ...BASE_SCENARIO, levers: { electricCars: 1 } },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    const tailpipe = tailpipe2035('roadPassenger');
    expect(r.summary.avoided.co2).toBeGreaterThan(0);
    expect(r.summary.avoided.co2).toBeLessThan(tailpipe * (1 + supply('roadPassenger')));
    const grid = data.sectors.gridIntensity.ssp245;
    const g = grid.values[grid.years.indexOf(2035)] as number;
    expect(r.summary.avoided.co2).toBeCloseTo(
      tailpipe * (1 + supply('roadPassenger') - 1.11 * g * (1 + supply('electricity'))),
      -6,
    );
  });

  it('renewable electricity makes electric cars save more', () => {
    const cars = w2100(lever('electricCars'));
    const re = w2100(lever('renewableElectricity'));
    const both = w2100(run({ levers: { electricCars: 1, renewableElectricity: 1 } }));
    expect(both).toBeGreaterThan(cars + re);
    const ctx = { sectors: data.sectors, ssp: 'ssp245' as const, dataCentres: 'ssp' as const };
    const carsOnly = energyCo2BySource({ ...ctx, band: 'median' }, 2040, {
      ...energyAdoption(() => 0, 1),
      electricCars: 1,
    });
    const carsOnCleanGrid = energyCo2BySource({ ...ctx, band: 'median' }, 2040, {
      ...energyAdoption(() => 0, 1),
      electricCars: 1,
      renewableElectricity: 1,
    });
    expect(carsOnly.electricity).toBeGreaterThan(0);
    expect(carsOnCleanGrid.roadPassenger).toBe(carsOnly.roadPassenger);
    expect(carsOnCleanGrid.electricity).toBeLessThan(0);
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

  it.each(ENERGY_LEVERS)(
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
    expect(range(co.noxCh4PerKgCo2.hoor.ssp245.roadPassenger)).toBeLessThan(roadNox * global);
    expect(range(co.noxCh4PerKgCo2.hoor.ssp245.shipping)).toBeGreaterThan(
      ratio('shipping', 'nox', 2040) * global,
    );
    const co2 = energyCo2BySource(ctx, 2040, only({ electricCars: 1 }));
    const change = changeOf({ electricCars: 1 });
    const kept = noxMethane(co, 'ssp245', 'median', 2040, { co2, change }, 'hoor');
    expect(kept).toBeCloseTo(
      -co2.roadPassenger * range(co.noxCh4PerKgCo2.hoor.ssp245.roadPassenger) -
        co2.electricity * range(co.noxCh4PerKgCo2.hoor.ssp245.electricity),
      0,
    );
    const ships = energyCo2BySource(ctx, 2040, only({ cleanShipping: 1 }));
    expect(
      noxMethane(
        co,
        'ssp245',
        'median',
        2040,
        {
          co2: ships,
          change: changeOf({ cleanShipping: 1 }),
          keepsNox: CLEAN_FUEL_KEEPS_NOX,
        },
        'hoor',
      ),
    ).toBe(0);
  });

  it('gives every place FaIR’s one coefficient in plain FaIR', () => {
    const range = (r: { median: number[] }) => valueAt(co.years, r.median, 2040);
    const global = range(co.noxCh4PerKg.ssp245);
    (['roadPassenger', 'shipping', 'electricity'] as const).forEach((s) =>
      expect(range(co.noxCh4PerKgCo2.fair.ssp245[s])).toBeCloseTo(
        ratio(s, 'nox', 2040) * global,
        5,
      ),
    );
  });

  it('leaves less methane as VOCs fall, ships cutting theirs with the fuel', () => {
    const co2 = energyCo2BySource(ctx, 2040, only({ cleanShipping: 1 }));
    const change = changeOf({ cleanShipping: 1 });
    expect(change.voc).toBeLessThan(0);
    expect(change.co2).toBeCloseTo(co2.shipping * ratio('shipping', 'co2', 2040), 0);
    expect(vocMethane(co, 'ssp245', 'median', 2040, { co2, change })).toBeLessThan(0);
  });

  it('adds the data centres’ co-emissions to the baseline with their CO₂', () => {
    const at = (r: ReturnType<typeof run>) => r.temperature.baseline.median[2050 - 1850] as number;
    const without = runScenario(
      { ...data, coemissions: EMPTY_COEMISSIONS },
      BASE_SCENARIO,
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    expect(at(run())).not.toBe(at(without));
    expect(at(run({}, { dataCentres: 'ssp' }))).toBe(
      at(
        runScenario(
          { ...data, coemissions: EMPTY_COEMISSIONS },
          BASE_SCENARIO,
          { ...DEFAULT_OPTIONS, dataCentres: 'ssp' },
          CURRENT_YEAR,
        ),
      ),
    );
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
  it('renewable electricity also cleans the extra demand', () => {
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
      },
    };
    const options: Options = { ...DEFAULT_OPTIONS, dataCentres: 'ssp', permafrost: 'off' };
    expect(encodeState(scenario, options)).toBe(
      'sea=40&ev=50&et=25&fl=30&saf=10&cs=100&re=80&dc=ssp&pf=off',
    );
    expect(decodeState(encodeState(scenario, options))).toEqual({ scenario, options });
  });
  it('read invalid values as none or the default', () => {
    const { scenario, options } = decodeState('ev=abc&fl=150&re=-5&et=20&dc=x&pf=maybe');
    expect(scenario.levers).toEqual({ electricTrucks: 0.2 });
    expect(options.dataCentres).toBe(DEFAULT_OPTIONS.dataCentres);
    expect(options.permafrost).toBe(DEFAULT_OPTIONS.permafrost);
  });
  it('ignore the data centres on clean power of an old URL, now part of renewable electricity', () => {
    expect(decodeState('re=50&cdc=100').scenario.levers).toEqual({ renewableElectricity: 0.5 });
  });
});

describe('the coMethane departure', () => {
  const co = data.coemissions;
  const scaled = <T>(byKey: Record<string, T>, f: number, map: (v: T, f: number) => T) =>
    Object.fromEntries(Object.entries(byKey).map(([k, v]) => [k, map(v, f)]));
  const band = (b: RangeSeries, f: number): RangeSeries => ({
    median: b.median.map((v) => v * f),
    low: b.low.map((v) => v * f),
    high: b.high.map((v) => v * f),
  });
  const bySector = (b: Record<string, RangeSeries>, f: number) => scaled(b, f, band);
  const split: CoMethaneSplit = {
    vocCh4PerKg: scaled(co.vocCh4PerKg, 0.4, band) as CoMethaneSplit['vocCh4PerKg'],
    vocCh4PerKgCo2: scaled(co.vocCh4PerKgCo2, 0.4, bySector) as CoMethaneSplit['vocCh4PerKgCo2'],
    coCh4PerKg: scaled(co.vocCh4PerKg, 0.1, band) as CoMethaneSplit['coCh4PerKg'],
    coCh4PerKgCo2: scaled(co.vocCh4PerKgCo2, 0.6, bySector) as CoMethaneSplit['coCh4PerKgCo2'],
    noxCh4PerKgCo2: {
      chemistry: scaled(
        co.noxCh4PerKgCo2.chemistry,
        1.5,
        bySector,
      ) as CoEmissions['noxCh4PerKgCo2']['chemistry'],
    },
  };
  const withSplit: CoEmissions = { ...co, coMethaneSplit: split };

  it('leaves the file as it is under plain FaIR, or when it has no split', () => {
    expect(withCoMethane(withSplit, 'fair')).toBe(withSplit);
    expect(withCoMethane(co, 'split')).toBe(co);
  });

  it('takes the VOCs’, CO’s and the chemistry variant’s methane from the split', () => {
    const applied = withCoMethane(withSplit, 'split');
    expect(applied.vocCh4PerKgCo2).toBe(split.vocCh4PerKgCo2);
    expect(applied.coCh4PerKgCo2).toBe(split.coCh4PerKgCo2);
    expect(applied.noxCh4PerKgCo2.chemistry).toBe(split.noxCh4PerKgCo2.chemistry);
    expect(applied.noxCh4PerKgCo2.hoor).toBe(co.noxCh4PerKgCo2.hoor);
    expect(withCoMethane(withSplit, 'split')).toBe(applied);
  });

  it('counts CO’s methane only once it is split from the VOCs’', () => {
    const co2 = { roadPassenger: -1e9 };
    const change = coChange(co, 'ssp245', 2040, co2);
    expect(coMethane(co, 'ssp245', 'median', 2040, { co2, change })).toBe(0);
    const applied = withCoMethane(withSplit, 'split');
    expect(coMethane(applied, 'ssp245', 'median', 2040, { co2, change })).toBeLessThan(0);
  });

  it('moves a lever’s result only when the build splits CO', () => {
    const avoided = (coMethaneVariant: 'split' | 'fair') =>
      runScenario(
        {
          ...data,
          coemissions: withSplit,
          departures: { ...departuresOf(data), coMethane: coMethaneVariant },
        },
        { ...BASE_SCENARIO, levers: { electricCars: 1 } },
        DEFAULT_OPTIONS,
        CURRENT_YEAR,
      ).summary.avoidedWarming2050.median;
    expect(avoided('fair')).toBe(lever('electricCars').summary.avoidedWarming2050.median);
    expect(avoided('split')).not.toBe(avoided('fair'));
  });
});

describe('the fossilMethaneCo2 departure', () => {
  const co2 = { roadPassenger: -1e9 };
  const year = { co2, change: coChange(data.coemissions, 'ssp245', 2040, co2) };

  it('adds the CO₂ the co-emitted methane becomes, only when on', () => {
    const [off, on] = [coGases([-1e9], [year]), coGases([-1e9], [year], true)];
    expect(year.change.ch4).toBeLessThan(0);
    expect((on[0]?.co2 as number) - (off[0]?.co2 as number)).toBeCloseTo(
      year.change.ch4 * CO2_PER_CH4,
      3,
    );
    expect(on[0]?.ch4).toBe(off[0]?.ch4);
  });

  it('makes a fuel lever avoid a little more warming', () => {
    const avoided = (fossilMethaneCo2: 'on' | 'off') =>
      runScenario(
        { ...data, departures: { ...departuresOf(data), fossilMethaneCo2 } },
        { ...BASE_SCENARIO, levers: { renewableElectricity: 1 } },
        DEFAULT_OPTIONS,
        CURRENT_YEAR,
      ).summary.avoidedWarming2100.median;
    expect(avoided('on')).toBeGreaterThan(avoided('off'));
  });
});

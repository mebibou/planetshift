import { describe, expect, it } from 'vitest';
import { ANIMAL_GROUPS, GASES, PLANT_GROUPS, type Group } from '../../src/data/types';
import { DEFAULT_OPTIONS, type Basis, type Scenario } from '../../src/model/api';
import { foodChange, removalShares } from '../../src/model/diet';
import { feedChange, groupProductionChange } from '../../src/model/feed';
import { countryIntensities, emissionsOf } from '../../src/model/emissions';
import { groupTotals, prepare, valueOf } from '../../src/model/prepare';
import { countryLand } from '../../src/model/land';
import type { ItemVector } from '../../src/model/util';
import { REPLACEMENT_MIXES } from '../../src/model/replacement';
import { productionChanges, runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { SAMPLES } from './samples';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const prepared = prepare(data);
const run = (scenario: Partial<Scenario>, options = DEFAULT_OPTIONS) =>
  runScenario(data, { ...BASE_SCENARIO, ...scenario }, options, CURRENT_YEAR);
const nonzero = (v: ItemVector): [string, number][] =>
  prepared.items
    .map((item, i): [string, number] => [String(item.code), v[i] as number])
    .filter(([, t]) => t !== 0);
const groupTotal = (r: ReturnType<typeof run>, g: Group) =>
  r.countries.reduce((a, c) => a + c.productionChange[g], 0);

describe('shift of 0', () => {
  const r = run({});
  it('changes no production, diet or emissions', () => {
    r.countries.forEach((c) => {
      [...ANIMAL_GROUPS, ...PLANT_GROUPS].forEach((g) => expect(c.productionChange[g]).toBe(0));
      GASES.forEach((g) => expect(c.emissionsChange[g]).toBe(0));
      expect(c.proteinAfter).toBe(c.proteinBefore);
      expect(c.kcalAfter).toBe(c.kcalBefore);
    });
  });
  it('keeps the scenario equal to the baseline', () => {
    expect(r.scenarioEmissions).toEqual(r.baselineEmissions);
    expect(r.temperature.scenario).toEqual(r.temperature.baseline);
    expect(r.summary.avoidedWarming2050).toEqual({ median: 0, p05: 0, p95: 0 });
    expect(r.summary.clipped).toEqual([]);
  });
});

describe('the kept basis', () => {
  const scenarios: Partial<Scenario>[] = [
    { shift: 0.1 },
    { shift: 0.5, replacement: 'legumes' },
    { groupShifts: { dairy: 1 }, replacement: 'plantMilk' },
    { groupShifts: { seafood: 1 } },
    { shift: 1 },
  ];
  (['protein', 'kcal'] as Basis[]).forEach((basis) =>
    scenarios.forEach((s) =>
      it(`is conserved per capita in every country (${basis}, ${JSON.stringify(s)})`, () => {
        const r = run({ ...s, basis });
        r.countries.forEach((c) => {
          const [before, after] =
            basis === 'protein' ? [c.proteinBefore, c.proteinAfter] : [c.kcalBefore, c.kcalAfter];
          expect(Math.abs(after - before) / before).toBeLessThan(1e-9);
        });
      }),
    ),
  );
  it('moves the other nutrient', () => {
    const r = run({ shift: 0.5, basis: 'protein' });
    expect(r.countries.some((c) => Math.abs(c.kcalAfter - c.kcalBefore) > 1)).toBe(true);
  });
});

describe('the diet', () => {
  const fra = prepared.countries.find((c) => c.country.iso3 === 'FRA')!;
  const ind = prepared.countries.find((c) => c.country.iso3 === 'IND')!;
  it('removes the share of each animal item and adds plants only', () => {
    const change = foodChange({ ...BASE_SCENARIO, shift: 0.2 }, fra, prepared);
    nonzero(change).forEach(([code, t]) => {
      const item = prepared.itemByCode.get(code)!;
      if (item.animal) expect(t).toBeCloseTo(-0.2 * valueOf(prepared, fra.food, code), 6);
      else expect(t).toBeGreaterThan(0);
    });
  });
  it('lets group shares override the shift', () => {
    const shares = removalShares(
      { ...BASE_SCENARIO, shift: 0.2, groupShifts: { dairy: 0.7 } },
      fra,
    );
    expect(shares).toEqual({
      ruminantMeat: 0.2,
      pigMeat: 0.2,
      poultryMeat: 0.2,
      dairy: 0.7,
      eggs: 0.2,
      seafood: 0.2,
    });
  });
  it('shifts only high-income countries when asked', () => {
    const s: Scenario = { ...BASE_SCENARIO, shift: 0.5, where: 'highIncome' };
    expect(removalShares(s, fra).dairy).toBe(0.5);
    expect(removalShares(s, ind).dairy).toBe(0);
    const r = run(s);
    expect(r.countries.find((c) => c.iso3 === 'IND')!.kcalAfter).toBe(
      r.countries.find((c) => c.iso3 === 'IND')!.kcalBefore,
    );
  });
  it('puts 60% of the added protein in pulses with the legume mix', () => {
    const change = foodChange(
      { ...BASE_SCENARIO, shift: 0.3, replacement: 'legumes' },
      fra,
      prepared,
    );
    const protein = (pred: (g: Group) => boolean) =>
      nonzero(change)
        .filter(([code, t]) => t > 0 && pred(prepared.itemByCode.get(code)!.group))
        .reduce((a, [code, t]) => a + t * prepared.itemByCode.get(code)!.proteinPerTonne, 0);
    const added = protein(() => true);
    expect(protein((g) => g === 'pulses') / added).toBeCloseTo(0.6, 9);
    expect(protein((g) => g === 'oilCrops') / added).toBeCloseTo(0.2, 9);
    expect(protein((g) => g === 'cereals') / added).toBeCloseTo(0.2, 9);
  });
  it('replaces dairy by soybeans and oats with the plant-milk mix', () => {
    const change = foodChange(
      { ...BASE_SCENARIO, groupShifts: { dairy: 1 }, replacement: 'plantMilk' },
      fra,
      prepared,
    );
    expect(
      nonzero(change)
        .map(([code]) => code)
        .sort(),
    ).toEqual(['2516', '2555', '2848']);
  });
});

describe('feed', () => {
  it('falls with animal production', () => {
    const shifted = productionChanges(
      prepared,
      { ...BASE_SCENARIO, groupShifts: { poultryMeat: 0.5 } },
      {
        ...DEFAULT_OPTIONS,
        location: 'domestic',
      },
    );
    const usaMaize = valueOf(prepared, shifted.change['USA']!, '2514');
    expect(usaMaize).toBeLessThan(0);
  });
  it('goes to zero when animal farming ends', () => {
    const r = run({ shift: 1, groupShifts: Object.fromEntries(ANIMAL_GROUPS.map((g) => [g, 1])) });
    const fraMaizeFeed = prepared.countries
      .find((c) => c.country.iso3 === 'FRA')!
      .rows.get('2514')!.feed;
    expect(fraMaizeFeed).toBeGreaterThan(0);
    expect(groupTotal(r, 'cereals')).toBeLessThan(0);
  });
  it('follows each group’s production less processing, as land does', () => {
    const processed = structuredClone(data);
    const milk = processed.supply.byCountry['FRA']!['2848']!;
    milk.processing = milk.production / 2;
    const p = prepare(processed);
    const fra = p.countries.find((c) => c.country.iso3 === 'FRA')!;
    const { change } = productionChanges(
      p,
      { ...BASE_SCENARIO, groupShifts: { dairy: 1 } },
      { ...DEFAULT_OPTIONS, location: 'domestic' },
    );
    const herd = (base: ItemVector) => groupProductionChange(base, change['FRA']!, p).dairy;
    expect(herd(fra.emitting)).toBeCloseTo(2 * herd(fra.production), 9);
    expect(countryLand(fra, p).groups.dairy).toBeCloseTo(groupTotals(fra.emitting, p).dairy, 9);
  });
});

describe('location', () => {
  it('moves the same world change of animal products either way', () => {
    const fixed = run({ shift: 0.1 });
    const domestic = run({ shift: 0.1 }, { ...DEFAULT_OPTIONS, location: 'domestic' });
    expect(fixed.summary.clipped).toEqual([]);
    expect(domestic.summary.clipped).toEqual([]);
    // Fish and milk fed to animals follow each country's own livestock, as feed crops do.
    ANIMAL_GROUPS.filter((g) => g !== 'seafood' && g !== 'dairy').forEach((g) =>
      expect(groupTotal(domestic, g)).toBeCloseTo(groupTotal(fixed, g), 0),
    );
    const fra = (r: typeof fixed) => r.countries.find((c) => c.iso3 === 'FRA')!.productionChange;
    expect(fra(fixed).ruminantMeat).not.toBeCloseTo(fra(domestic).ruminantMeat, 0);
  });
  it('never leaves production below zero', () => {
    SAMPLES.forEach((p) =>
      [DEFAULT_OPTIONS, { ...DEFAULT_OPTIONS, location: 'domestic' as const }].forEach((o) => {
        const r = runScenario(data, p.scenario, o, CURRENT_YEAR);
        r.countries.forEach((c) =>
          [...ANIMAL_GROUPS, ...PLANT_GROUPS].forEach((g) =>
            expect(c.production[g] + c.productionChange[g]).toBeGreaterThanOrEqual(-1e-6),
          ),
        );
      }),
    );
  });
  it('takes every animal group to zero at a full shift, with no country clipped', () => {
    const r = run({ shift: 1 }, { ...DEFAULT_OPTIONS, location: 'domestic' });
    expect(r.summary.clipped).toEqual([]);
    ANIMAL_GROUPS.forEach((g) =>
      r.countries.forEach((c) => expect(c.production[g] + c.productionChange[g]).toBeCloseTo(0, 3)),
    );
  });
});

describe('processed items', () => {
  it('count emissions on production less processing', () => {
    const r = run({});
    r.countries.forEach((c) => {
      const pc = prepared.countries.find((p) => p.country.iso3 === c.iso3)!;
      const expected = { co2: 0, ch4: 0, n2o: 0 };
      pc.rows.forEach((row, code) => {
        const i = prepared.indexOf.get(code)!;
        const kg = countryIntensities(pc, prepared, 'farmGate');
        GASES.forEach(
          (g) =>
            (expected[g] +=
              Math.max(0, row.production - row.processing) * (kg.kgPerTonne[g][i] as number)),
        );
      });
      GASES.forEach((g) => expect(c.emissions[g]).toBeCloseTo(expected[g], -3));
    });
  });
  it('put new demand for oil on the oil item, not on soybeans processing', () => {
    // Without fish and milk fed to animals, so the feed of soybeans follows the diet alone.
    const withoutFishmeal = loadFixtures();
    Object.values(withoutFishmeal.feed.shares).forEach((byRegion) =>
      Object.values(byRegion).forEach((byItem) => {
        delete byItem['2763'];
        delete byItem['2848'];
      }),
    );
    const prepared = prepare(withoutFishmeal);
    // Every plant food takes a share of the calories, oils included, as no default mix does.
    const scenario: Scenario = { ...BASE_SCENARIO, shift: 0.5, basis: 'kcal' };
    const proteinRich = REPLACEMENT_MIXES.current;
    const mixes = REPLACEMENT_MIXES as Record<string, (typeof REPLACEMENT_MIXES)['current']>;
    mixes['current'] = [{ weight: 1, accepts: (item) => !item.animal }];
    const { food, change } = (() => {
      try {
        return productionChanges(prepared, scenario, DEFAULT_OPTIONS);
      } finally {
        mixes['current'] = proteinRich;
      }
    })();
    const usa = prepared.countries.find((c) => c.country.iso3 === 'USA')!;
    const oil = valueOf(prepared, change['USA']!, '2571');
    expect(valueOf(prepared, food['USA']!, '2571')).toBeGreaterThan(0);
    expect(oil).toBeGreaterThan(0);
    const kg = countryIntensities(usa, prepared, 'farmGate');
    const oilOnly = Float64Array.from(prepared.items, (item) =>
      String(item.code) === '2571' ? oil : 0,
    );
    expect(emissionsOf(oilOnly, kg).co2).toBeGreaterThan(0);
    type Country = (typeof prepared.countries)[number];
    const soyDemand = (pc: Country) => {
      const row = pc.rows.get('2555');
      return row ? soyDemandOf(pc, row) : 0;
    };
    const soyDemandOf = (pc: Country, row: NonNullable<ReturnType<Country['rows']['get']>>) => {
      const feed = feedChange(
        pc,
        groupProductionChange(pc.emitting, change[pc.country.iso3]!, prepared),
        prepared,
        'species',
      );
      const endUse =
        valueOf(prepared, food[pc.country.iso3]!, '2555') + valueOf(prepared, feed, '2555');
      const supply = row.food + row.feed + row.other + row.losses + row.seed + row.processing;
      return (endUse * supply) / (supply - row.losses - row.seed);
    };
    const world = prepared.countries.reduce((total, pc) => total + soyDemand(pc), 0);
    const emitting = (pc: (typeof prepared.countries)[number]) =>
      valueOf(prepared, pc.emitting, '2555');
    const share = emitting(usa) / valueOf(prepared, prepared.worldEmitting, '2555');
    expect(valueOf(prepared, change['USA']!, '2555')).toBeCloseTo(world * share, 3);
  });
  it('never takes production below what is processed', () => {
    SAMPLES.forEach((p) => {
      const { change } = productionChanges(prepared, p.scenario, {
        ...DEFAULT_OPTIONS,
        location: 'domestic',
      });
      prepared.countries.forEach((pc) =>
        pc.rows.forEach((row, code) => {
          const d = valueOf(prepared, change[pc.country.iso3]!, code);
          expect(Math.max(0, row.production - row.processing) + d).toBeGreaterThanOrEqual(-1e-6);
        }),
      );
    });
  });
});

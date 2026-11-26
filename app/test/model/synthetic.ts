import {
  ANIMAL_GROUPS,
  PLANT_GROUPS,
  type Country,
  type Item,
  type ModelData,
  type SupplyRow,
} from '../../src/data/types';
import { range } from '../../src/model/util';
import { loadFixtures } from './fixtures';

/** A deterministic pseudo-random sequence (mulberry32). */
const random = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** About the real data's size: countries × items, with the fixture's climate. */
export const syntheticData = (nCountries = 180, nItems = 100): ModelData => {
  const rnd = random(42);
  const fixture = loadFixtures();
  const groups = [...ANIMAL_GROUPS, ...ANIMAL_GROUPS, ...ANIMAL_GROUPS, ...ANIMAL_GROUPS];
  const items: Item[] = range(0, nItems - 1).map((i) => {
    const animal = i < groups.length;
    return {
      code: 3000 + i,
      name: { en: `Item ${i}`, fr: `Produit ${i}` },
      group: animal
        ? (groups[i] as Item['group'])
        : (PLANT_GROUPS[i % PLANT_GROUPS.length] as Item['group']),
      animal,
      kcalPerTonne: 1e6 + rnd() * 3e6,
      proteinPerTonne: 0.01 + rnd() * 0.3,
    };
  });
  const regions = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
  const countries: Country[] = range(0, nCountries - 1).map((i) => ({
    iso3: `C${String(i).padStart(2, '0')}`,
    fao: i,
    name: { en: `Country ${i}`, fr: `Pays ${i}` },
    region: regions[i % regions.length] as string,
    highIncome: i % 4 === 0,
    population: Object.fromEntries(
      range(2022, 2050).map((y) => [String(y), 1e6 * (1 + i) * (1 + 0.01 * (y - 2022))]),
    ),
  }));
  const row = (): SupplyRow => {
    const food = rnd() * 1e6;
    const feed = rnd() * 5e5;
    const production = (food + feed) * (0.5 + rnd());
    return {
      production,
      imports: 0,
      exports: 0,
      food,
      feed,
      losses: food * 0.05,
      processing: food * 0.1,
      seed: food * 0.02,
      other: 0,
    };
  };
  const shares = Object.fromEntries(
    items
      .filter((i) => !i.animal)
      .map((i) => [
        String(i.code),
        {
          ruminantMeat: 0.1,
          pigMeat: 0.3,
          poultryMeat: 0.35,
          dairy: 0.15,
          eggs: 0.05,
          seafood: 0.05,
        },
      ]),
  );
  const intensity = () => ({
    kgPerTonne: { co2: rnd() * 1000, ch4: rnd() * 100, n2o: rnd() * 5 },
    tier: 3 as const,
    source: '',
  });
  return {
    meta: fixture.meta,
    countries,
    items,
    supply: {
      baseYear: 2022,
      byCountry: Object.fromEntries(
        countries.map((c) => [
          c.iso3,
          Object.fromEntries(items.map((i) => [String(i.code), row()])),
        ]),
      ),
    },
    intensities: {
      byCountry: Object.fromEntries(
        countries.map((c) => [
          c.iso3,
          Object.fromEntries(
            items.map((i) => [
              String(i.code),
              { farmGate: intensity(), cradleToFarmGate: intensity() },
            ]),
          ),
        ]),
      ),
    },
    feed: { shares: { species: { World: shares }, gleam: { World: shares } } },
    climate: fixture.climate,
    land: {
      cropHaPerTonne: Object.fromEntries(
        countries.map((c) => [
          c.iso3,
          Object.fromEntries(
            items.filter((i) => !i.animal).map((i) => [String(i.code), 0.05 + rnd() * 0.5]),
          ),
        ]),
      ),
      pasture: Object.fromEntries(
        countries.map((c) => [
          c.iso3,
          { ha: rnd() * 1e7, shares: { ruminantMeat: 0.6, dairy: 0.4 } },
        ]),
      ),
      regrowth: Object.fromEntries(countries.map((c) => [c.iso3, { median: 3, low: 1, high: 6 }])),
      regrowthYears: 30,
    },
    // The levers at the real data's size: a split by source for every country and item.
    breakdown: {
      world: fixture.breakdown.world,
      byCountry: Object.fromEntries(
        countries.map((c) => [
          c.iso3,
          Object.fromEntries(
            items.map((i) => [
              String(i.code),
              fixture.breakdown.world[i.animal ? '2731' : i.code % 2 ? '2807' : '2511'] ?? {},
            ]),
          ),
        ]),
      ),
    },
    practices: Object.fromEntries(
      Object.entries(fixture.practices).map(([id, p]) => [
        id,
        {
          ...p,
          applicable: Object.fromEntries(countries.map((c) => [c.iso3, 0.2 + rnd() * 0.6])),
        },
      ]),
    ) as ModelData['practices'],
    waste: {
      byCountry: Object.fromEntries(
        countries.map((c) => [c.iso3, { retail: 10, foodService: 20, household: 50 }]),
      ),
      source: '',
    },
    deforestation: {
      byCountry: Object.fromEntries(
        countries
          .filter((_, i) => i % 3 === 0)
          .map((c) => [
            c.iso3,
            Object.fromEntries(items.slice(0, 30).map((i) => [String(i.code), rnd() * 1e7])),
          ]),
      ),
      years: [2019, 2023],
      source: '',
    },
    removals: Object.fromEntries(
      Object.entries(fixture.removals).map(([id, r]) => [
        id,
        {
          ...r,
          rate: Object.fromEntries(
            countries.map((c) => [c.iso3, { median: 1, low: 0.4, high: 2 }]),
          ),
        },
      ]),
    ) as ModelData['removals'],
    deadfall: {
      ...fixture.deadfall,
      kgCo2PerTonne: Object.fromEntries(countries.map((c) => [c.iso3, { 2763: rnd() * 100 }])),
    },
    sectors: fixture.sectors,
    population: fixture.population,
    industry: fixture.industry,
    coemissions: fixture.coemissions,
    people: fixture.people,
    fossilmethane: fixture.fossilmethane,
    wastemethane: fixture.wastemethane,
    hfc: fixture.hfc,
  };
};

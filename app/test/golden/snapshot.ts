import type { GasVector } from '../../src/data/types';
import type { CountryResult, ScenarioResult } from '../../src/model/api';

/** A number rounded to 9 significant figures, so float noise does not show. */
export const round = (x: number): number =>
  x === 0 || !Number.isFinite(x) ? (Object.is(x, -0) ? 0 : x) : Number(x.toPrecision(9));

/** Every number in a value rounded, recursively. */
export const rounded = (value: unknown): unknown =>
  typeof value === 'number'
    ? round(value)
    : Array.isArray(value)
      ? value.map(rounded)
      : value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rounded(v)]))
        : value;

const sampleYears = (years: readonly number[]): number[] =>
  years.filter((y, i) => i === 0 || y % 10 === 0 || y === 2035 || y === 2050 || y === 2100);

const total = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

const at = <T>(years: readonly number[], values: readonly T[], keep: readonly number[]): T[] =>
  keep.map((y) => values[years.indexOf(y)] as T);

const worldSum = (countries: readonly CountryResult[], f: (c: CountryResult) => number) =>
  total(countries.map(f));

const gasSum = (countries: readonly CountryResult[], f: (c: CountryResult) => GasVector) => ({
  co2: worldSum(countries, (c) => f(c).co2),
  ch4: worldSum(countries, (c) => f(c).ch4),
  n2o: worldSum(countries, (c) => f(c).n2o),
});

/** A country's figures that move with the scenario; the base year's are in the world totals. */
const scenarioPart = (c: CountryResult) => ({
  emissions: c.emissions,
  worstTier: c.worstTier,
  productionChange: c.productionChange,
  emissionsChange: c.emissionsChange,
  proteinAfter: c.proteinAfter,
  kcalAfter: c.kcalAfter,
  landChange: c.landChange,
  deforestationCo2: c.deforestationCo2,
  deforestationChange: c.deforestationChange,
});

/**
 * What a golden keeps of a result: the summary, temperatures and emissions every ten years with
 * a checksum of each whole series, world totals of every country field, and a few countries.
 */
export const snapshot = (r: ScenarioResult, countries: readonly string[]): unknown => {
  const t = r.temperature;
  const tKeep = sampleYears(t.years.filter((y) => y >= (r.years[0] ?? 0)));
  const eKeep = r.years.filter((y, i) => i === 0 || y === 2035 || y === 2050 || y === 2100);
  const series = (values: readonly number[]) => ({
    at: at(t.years, values, tKeep),
    sum: total(values),
  });
  return rounded({
    summary: r.summary,
    temperature: {
      years: tKeep,
      baseline: {
        median: series(t.baseline.median),
        p05: series(t.baseline.p05),
        p95: series(t.baseline.p95),
      },
      scenario: {
        median: series(t.scenario.median),
        p05: series(t.scenario.p05),
        p95: series(t.scenario.p95),
      },
      avoided: {
        median: series(t.avoided.median),
        p05: series(t.avoided.p05),
        p95: series(t.avoided.p95),
      },
      observed: t.observed.filter((v) => v !== null).length,
    },
    emissions: {
      years: eKeep,
      baseline: at(r.years, r.baselineEmissions, eKeep),
      scenario: at(r.years, r.scenarioEmissions, eKeep),
    },
    world: {
      emissions: gasSum(r.countries, (c) => c.emissions),
      emissionsChange: gasSum(r.countries, (c) => c.emissionsChange),
      productionChange: worldSum(r.countries, (c) => total(Object.values(c.productionChange))),
      landChange: worldSum(r.countries, (c) => c.landChange.cropland + c.landChange.pasture),
      deforestationChange: worldSum(r.countries, (c) => c.deforestationChange),
      proteinAfter: worldSum(r.countries, (c) => c.proteinAfter),
      kcalAfter: worldSum(r.countries, (c) => c.kcalAfter),
      production: worldSum(r.countries, (c) => total(Object.values(c.production))),
      land: worldSum(r.countries, (c) => c.land.cropland + c.land.pasture),
      proteinBefore: worldSum(r.countries, (c) => c.proteinBefore),
      kcalBefore: worldSum(r.countries, (c) => c.kcalBefore),
      countries: r.countries.length,
    },
    countries: Object.fromEntries(
      countries.flatMap((iso3) => {
        const c = r.countries.find((x) => x.iso3 === iso3);
        return c ? [[iso3, scenarioPart(c)]] : [];
      }),
    ),
  });
};

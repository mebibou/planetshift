import type { Country, Series } from '../../data/types';
import { populationIn } from '../../model/prepare';
import { END_YEAR, range, sum, valueAt } from '../../model/util';
import type { PopulationData } from './data';
import { VARIANTS, type PopulationVariant } from './data';
export { VARIANTS, type PopulationVariant };

/** UN WPP 2024's variants: the medium projection, or half a child per woman fewer or more. */

const at = (s: Series, year: number): number => valueAt(s.years, s.values, year);

/** The world's variant over its medium one in a year, 1 when either is missing. */
export const worldRatio = (
  pop: PopulationData,
  variant: PopulationVariant,
  year: number,
): number => {
  const medium = at(pop.world.medium, year);
  const own = at(pop.world[variant], year);
  return medium > 0 && Number.isFinite(own) ? own / medium : 1;
};

/**
 * A country's variant over the medium in a year: 1 up to the last estimate, then its own ratios
 * (linear between the years given, held beyond), or the world's when the file has none for it.
 */
export const variantRatio = (
  pop: PopulationData,
  iso3: string,
  variant: PopulationVariant,
  year: number,
): number =>
  variant === 'medium' || year <= pop.lastEstimate ? 1 : projectedRatio(pop, iso3, variant, year);

/** After the last estimate: the country's own ratios when the file has them all, else the world's. */
const projectedRatio = (
  pop: PopulationData,
  iso3: string,
  variant: Exclude<PopulationVariant, 'medium'>,
  year: number,
): number => {
  const own = pop.byCountry[iso3]?.[variant];
  return own && own.length === pop.ratioYears.length
    ? valueAt([pop.lastEstimate, ...pop.ratioYears], [1, ...own], year)
    : worldRatio(pop, variant, year);
};

/** World population by year, base year..END_YEAR: each country's own times its variant ratio. */
export const variantWorldPopulation = (
  countries: readonly Country[],
  pop: PopulationData,
  variant: PopulationVariant,
  baseYear: number,
): Record<number, number> =>
  Object.fromEntries(
    range(baseYear, END_YEAR).map((y) => [
      y,
      sum(
        countries
          .map((c) => populationIn(c, y) * variantRatio(pop, c.iso3, variant, y))
          .filter(Number.isFinite),
      ),
    ]),
  );

/** Whether the file has the world's series. */
export const hasPopulation = (pop: PopulationData | undefined): pop is PopulationData =>
  (pop?.world.medium.years.length ?? 0) > 0 && (pop?.world.history.years.length ?? 0) > 0;

/** The world population the temperature chart draws behind its lines. */
export interface WorldPopulation {
  variant: PopulationVariant;
  /** People, 1850..the last estimate. */
  history: Series;
  /** People, from the year after the last estimate to 2100. */
  variants: Record<PopulationVariant, Series>;
  /** People, from the year after the last estimate: the people-on-Earth path, when it is on. */
  people?: Series;
}

export const worldPopulation = (
  pop: PopulationData,
  variant: PopulationVariant,
  people: Readonly<Record<number, number>> | null = null,
): WorldPopulation => ({
  variant,
  history: pop.world.history,
  variants: { medium: pop.world.medium, low: pop.world.low, high: pop.world.high },
  ...(people ? { people: projected(people, pop.lastEstimate) } : {}),
});

/** A path by year as a series from the year after the last estimate. */
const projected = (path: Readonly<Record<number, number>>, lastEstimate: number): Series => {
  const years = Object.keys(path)
    .map(Number)
    .filter((y) => y > lastEstimate)
    .sort((a, b) => a - b);
  return { years, values: years.map((y) => path[y] as number) };
};

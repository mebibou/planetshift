import type { Country, Series, Ssp } from '../../data/types';
import { populationIn } from '../../model/prepare';
import { END_YEAR, range, sum, valueAt } from '../../model/util';
import type { PopulationData } from './data';

/** UN WPP 2024's variants: the medium projection, or half a child per woman fewer or more. */
export const VARIANTS = ['medium', 'low', 'high'] as const;
export type PopulationVariant = (typeof VARIANTS)[number];

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

/**
 * Pairings that tell two different stories about the future: the UN's low projection with
 * SSP3-7.0 (a world of fast population growth), the high one with SSP1-2.6 (of slow growth).
 */
export const inconsistentWith = (variant: PopulationVariant, ssp: Ssp): boolean =>
  (variant === 'low' && ssp === 'ssp370') || (variant === 'high' && ssp === 'ssp126');

/** What the population chart draws, and the notes beside it. */
export interface WorldPopulation {
  variant: PopulationVariant;
  ssp: Ssp;
  /** People, 1850..the last estimate. */
  history: Series;
  /** People, from the year after the last estimate to 2100. */
  variants: Record<PopulationVariant, Series>;
  /** The variant and the SSP tell different stories (`inconsistentWith`). */
  inconsistent: boolean;
  /** Whether farm emissions follow population (the 'population' baseline); with 'ssp2' they do not. */
  applies: boolean;
}

export const worldPopulation = (
  pop: PopulationData,
  variant: PopulationVariant,
  ssp: Ssp,
  applies: boolean,
): WorldPopulation => ({
  variant,
  ssp,
  history: pop.world.history,
  variants: { medium: pop.world.medium, low: pop.world.low, high: pop.world.high },
  inconsistent: inconsistentWith(variant, ssp),
  applies,
});

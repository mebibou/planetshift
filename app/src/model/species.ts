import type { Species, SpeciesPerHa } from '../data/types';
import type { CountryResult } from './api';

type Farmland = { cropland: number; pasture: number };

const USES = ['cropland', 'pasture'] as const;

/** A country without species factors. */
export const NO_SPECIES = { species: 0, speciesChange: 0 } as const;

/** Species committed by a change of land: land newly farmed at the marginal factor, none freed. */
const added = (ha: number, [, marginal]: SpeciesPerHa): number => (ha > 0 ? ha * marginal : 0);

/** Species given back by land freed, at the average factor: what regrowth recovers. */
const freed = (ha: number, [average]: SpeciesPerHa): number => (ha < 0 ? -ha * average : 0);

/**
 * Species committed to extinction by a country's farmland today (average factors), and the change
 * at the full shift with freed land left as it is: land newly farmed commits more (marginal
 * factors), and freed land gives none back.
 */
export const speciesOf = (
  factors: Species['byCountry'][string] | undefined,
  land: Farmland,
  change: Farmland,
): { species: number; speciesChange: number } =>
  factors
    ? {
        species: USES.reduce((s, u) => s + land[u] * factors[u][0], 0),
        speciesChange: USES.reduce((s, u) => s + added(change[u], factors[u]), 0),
      }
    : NO_SPECIES;

/** Species the freed farmland gives back once it has grown back: natural regrowth on only. */
export const speciesRegained = (
  factors: Species['byCountry'][string] | undefined,
  change: Farmland,
): number => (factors ? USES.reduce((s, u) => s + freed(change[u], factors[u]), 0) : 0);

export type SpeciesFields = Pick<CountryResult, 'species' | 'speciesChange' | 'speciesRegained'>;

/** A country's species committed with the levers: newly farmed land adds, regrown land gives back. */
export const speciesAfter = (c: SpeciesFields): number =>
  c.species + c.speciesChange - (c.speciesRegained ?? 0);

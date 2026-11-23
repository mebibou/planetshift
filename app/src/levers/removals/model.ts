import { bandValue } from '../../model/bands';
import { BANDS, type Band } from '../../model/climate';
import { uptakePath, type Farmland } from '../../model/land';
import { REMOVALS, type Removal, type Removals } from './data';

/** Hectares of the land a removal applies to. */
export const landFor = (appliesTo: Removal['appliesTo'], land: Farmland): number =>
  appliesTo === 'cropland'
    ? land.cropland
    : appliesTo === 'pasture'
      ? land.pasture
      : land.cropland + land.pasture;

/** t CO₂ per ha a year in a country (else the world's), in the direction of the band. */
export const rateIn = (removal: Removal, iso3: string, band: Band): number => {
  const rate = removal.rate[iso3] ?? removal.rate['World'];
  return rate ? bandValue(rate, band) : 0;
};

/**
 * kg of CO₂ a year a country's farmland takes up at full adoption:
 * adoption × maxShare × hectares of the land type × rate.
 */
export const countryUptake = (
  removal: Removal,
  adoption: number,
  iso3: string,
  land: Farmland,
  band: Band,
): number =>
  adoption > 0
    ? adoption *
      removal.maxShare *
      Math.max(0, landFor(removal.appliesTo, land)) *
      rateIn(removal, iso3, band) *
      1000
    : 0;

export interface CountryLandAfter {
  iso3: string;
  /** Farmland once the shift is complete. */
  land: Farmland;
}

type Adoption = (id: string) => number;

const adopted = (removals: Partial<Removals>, adoptionOf: Adoption) =>
  REMOVALS.flatMap((id) => {
    const removal = removals[id];
    const adoption = adoptionOf(id);
    return removal && adoption > 0 ? [{ removal, adoption }] : [];
  });

/**
 * CO₂ taken up each year by the removals, kg (positive), by band: adoption ramps in like the
 * shift, and land adopted in a year stores carbon for the removal's `years` years.
 */
export const removalPaths = (
  removals: Partial<Removals>,
  adoptionOf: Adoption,
  countries: readonly CountryLandAfter[],
  years: readonly number[],
  adoptedShare: (year: number) => number,
): Record<Band, number[]> => {
  const chosen = adopted(removals, adoptionOf);
  const path = (band: Band) =>
    chosen.reduce(
      (acc, { removal, adoption }) => {
        const full = countries.reduce(
          (a, c) => a + countryUptake(removal, adoption, c.iso3, c.land, band),
          0,
        );
        const own = uptakePath(full, years, adoptedShare, removal.years);
        return acc.map((v, i) => v + (own[i] as number));
      },
      years.map(() => 0),
    );
  return Object.fromEntries(BANDS.map((b) => [b, path(b)])) as Record<Band, number[]>;
};

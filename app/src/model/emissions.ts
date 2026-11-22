import {
  GASES,
  type GasVector,
  type Intensities,
  type Intensity,
  type Scope,
  type Tier,
} from '../data/types';
import type { Prepared, PreparedCountry } from './prepare';
import { dot, gasVector, memoPer, type ItemVector } from './util';

const OTHER_SCOPE: Record<Scope, Scope> = {
  farmGate: 'cradleToFarmGate',
  cradleToFarmGate: 'farmGate',
};

/** Tier when an item has no intensity in either scope: it adds no emissions. */
export const MISSING_TIER: Tier = 6;

/** The item's intensity in the chosen scope, else in the other scope, else none. */
export const intensityOf = (
  intensities: Intensities,
  iso3: string,
  code: string,
  scope: Scope,
): Intensity | undefined => {
  const byScope = intensities.byCountry[iso3]?.[code];
  return byScope?.[scope] ?? byScope?.[OTHER_SCOPE[scope]];
};

/** A country's intensities as vectors, kg of each gas per tonne, and each item's tier. */
export interface CountryIntensities {
  kgPerTonne: Record<keyof GasVector, ItemVector>;
  tiers: readonly Tier[];
  sources: readonly string[];
}

const intensityCache = memoPer<PreparedCountry, CountryIntensities>();

export const countryIntensities = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
): CountryIntensities =>
  intensityCache(pc, scope, () => {
    const found = prepared.items.map((item) =>
      intensityOf(prepared.data.intensities, pc.country.iso3, String(item.code), scope),
    );
    return {
      kgPerTonne: Object.fromEntries(
        GASES.map((g) => [g, Float64Array.from(found, (i) => i?.kgPerTonne[g] ?? 0)]),
      ) as Record<keyof GasVector, ItemVector>,
      tiers: found.map((i) => i?.tier ?? MISSING_TIER),
      sources: found.map((i) => i?.source ?? ''),
    };
  });

/** kg of each gas from tonnes of production (or a change in it). */
export const emissionsOf = (tonnes: ItemVector, intensities: CountryIntensities): GasVector =>
  gasVector((g) => dot(tonnes, intensities.kgPerTonne[g]));

/**
 * The highest tier number (least specific source) among the items the country produces, and
 * the source of the first item at that tier.
 */
export const worstIntensity = (
  production: ItemVector,
  intensities: CountryIntensities,
): { tier: Tier; source: string } =>
  intensities.tiers.reduce<{ tier: Tier; source: string }>(
    (worst, tier, i) =>
      (production[i] as number) > 0 &&
      (tier > worst.tier || (tier === worst.tier && worst.source === ''))
        ? { tier, source: intensities.sources[i] as string }
        : worst,
    { tier: 1, source: '' },
  );

/** The highest tier number (least specific source) among the items the country produces. */
export const worstTier = (production: ItemVector, intensities: CountryIntensities): Tier =>
  worstIntensity(production, intensities).tier;

/** kg of each gas removed from `tonnes` of production by cutting each item's intensity by `cuts` (a negative change). */
export const cutEmissions = (
  tonnes: ItemVector,
  intensities: CountryIntensities,
  cuts: Record<keyof GasVector, ItemVector>,
): GasVector =>
  gasVector((g) => {
    const k = intensities.kgPerTonne[g];
    const c = cuts[g];
    let a = 0;
    for (let i = 0; i < tonnes.length; i++)
      a += (tonnes[i] as number) * (k[i] as number) * (c[i] as number);
    return -a;
  });

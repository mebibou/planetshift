import {
  GASES,
  type GasVector,
  type Intensities,
  type Intensity,
  type Scope,
  type Tier,
} from '../data/types';
import { cakeAmountChange, cakeWeights, type CakeDemand } from './land';
import type { Prepared, PreparedCountry } from './prepare';
import { addGas, dot, gasVector, memoPer, ZERO_GAS, type ItemVector } from './util';

/** The scope an intensity falls back to when it has none in the chosen one. */
export const OTHER_SCOPE: Record<Scope, Scope> = {
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
    for (let i = 0; i < tonnes.length; i++) {
      a += (tonnes[i] as number) * (k[i] as number) * (c[i] as number);
    }
    return -a;
  });

/**
 * A country's oilcakes, kg of each gas a year each crushed oilseed's cake carries in the chosen
 * scope (else the other), with the oilseed's code and its index among the items (−1 if none).
 */
export interface CountryCakes {
  codes: readonly string[];
  index: readonly number[];
  kg: readonly GasVector[];
}

const cakeCache = memoPer<PreparedCountry, CountryCakes>();

export const countryCakes = (pc: PreparedCountry, prepared: Prepared, scope: Scope): CountryCakes =>
  cakeCache(pc, scope, () => {
    const found = Object.entries(
      prepared.data.intensities.oilcake?.[pc.country.iso3] ?? {},
    ).flatMap(([code, byScope]) => {
      const cell = byScope[scope] ?? byScope[OTHER_SCOPE[scope]];
      return cell ? [{ code, kg: gasVector((g) => cell[g] ?? 0) }] : [];
    });
    const codes = found.map((f) => f.code);
    return {
      codes,
      index: codes.map((c) => prepared.indexOf.get(c) ?? -1),
      kg: found.map((f) => f.kg),
    };
  });

/** kg of each gas the oilcakes carry in all. */
export const cakeEmissions = (cakes: CountryCakes): GasVector =>
  cakes.kg.reduce((a, v) => addGas(a, v), ZERO_GAS);

/** The change in each oilcake's emissions as the demand for the cake changes, as its land does. */
export const cakeEmissionsChange = (cakes: CountryCakes, cake: CakeDemand): GasVector[] =>
  cakes.kg.map((kg, k) => {
    const weights = cakeWeights(cake.sharesOf(cakes.codes[k] as string), cake.relative);
    return gasVector((g) => cakeAmountChange(kg[g], weights));
  });

/** kg of each gas removed from oilcakes' emissions `kg` by cutting each oilseed's intensity by `cuts`. */
export const cutCakeEmissions = (
  cakes: CountryCakes,
  kg: readonly GasVector[],
  cuts: Record<keyof GasVector, ItemVector>,
): GasVector =>
  gasVector((g) =>
    kg.reduce((a, v, k) => {
      const i = cakes.index[k] as number;
      return i < 0 ? a : a - v[g] * (cuts[g][i] as number);
    }, 0),
  );

/** kg of each gas a year from the country's animals not raised for food: no lever changes it. */
export const nonFoodEmissions = (prepared: Prepared, iso3: string): GasVector => {
  const kg = prepared.data.intensities.nonFood?.[iso3];
  return kg ? gasVector((g) => kg[g] ?? 0) : ZERO_GAS;
};

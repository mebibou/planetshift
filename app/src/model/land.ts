import { ANIMAL_GROUPS, type AnimalGroup, type GasVector, type Land } from '../data/types';
import { groupTotals, type Prepared, type PreparedCountry } from './prepare';
import { dot, memoPer, type ItemVector } from './util';

export interface Farmland {
  cropland: number;
  pasture: number;
}

export const NO_LAND: Farmland = { cropland: 0, pasture: 0 };

export const addLand = (a: Farmland, b: Farmland): Farmland => ({
  cropland: a.cropland + b.cropland,
  pasture: a.pasture + b.pasture,
});

export const farmlandTotal = (l: Farmland): number => l.cropland + l.pasture;

type GroupTonnes = Partial<Record<AnimalGroup, number>>;

/**
 * Change in pasture: each ruminant group's share of the pasture changes by that group's
 * relative change in production; the pasture never falls below zero.
 */
export const pastureChange = (
  pasture: Land['pasture'][string] | undefined,
  before: GroupTonnes,
  change: GroupTonnes,
): number => {
  if (!pasture || pasture.ha <= 0) return 0;
  const relative = ANIMAL_GROUPS.reduce((acc, g) => {
    const share = pasture.shares[g] ?? 0;
    const base = before[g] ?? 0;
    return share > 0 && base > 0 ? acc + (share * (change[g] ?? 0)) / base : acc;
  }, 0);
  return Math.max(-pasture.ha, pasture.ha * relative);
};

/**
 * Change in the land of oilseeds crushed for cake: each oilseed's cake land changes with the
 * production of the animal groups the cake feeds, weighted by its feed shares, and never falls
 * below zero.
 */
export const oilcakeChange = (
  cakeHa: Readonly<Record<string, number>> | undefined,
  sharesOf: (code: string) => Partial<Record<AnimalGroup, number>> | undefined,
  relative: Partial<Record<AnimalGroup, number>>,
): number =>
  Object.entries(cakeHa ?? {}).reduce((acc, [code, ha]) => {
    const shares = sharesOf(code) ?? {};
    const total = ANIMAL_GROUPS.reduce((a, g) => a + (shares[g] ?? 0), 0);
    const change = ANIMAL_GROUPS.reduce((a, g) => a + (shares[g] ?? 0) * (relative[g] ?? 0), 0);
    return total > 0 ? acc + Math.max(-ha, (ha * change) / total) : acc;
  }, 0);

/** How the cake's land follows the animals: each group's relative change, the feed shares. */
export interface CakeDemand {
  relative: Partial<Record<AnimalGroup, number>>;
  sharesOf: (code: string) => Partial<Record<AnimalGroup, number>> | undefined;
}

const sumValues = (r: Readonly<Record<string, number>> | undefined): number =>
  Object.values(r ?? {}).reduce((a, b) => a + b, 0);

interface CountryLand {
  haPerTonne: ItemVector;
  base: Farmland;
  /** Emitting production by group, the base of each ruminant group's relative change. */
  groups: GroupTonnes;
}

const landCache = memoPer<PreparedCountry, CountryLand>();

/** A country's hectares per tonne by item, its farmland in the base year, its animal production. */
export const countryLand = (pc: PreparedCountry, prepared: Prepared): CountryLand =>
  landCache(pc, 'land', () => {
    const { land } = prepared.data;
    const iso3 = pc.country.iso3;
    const byCode = land.cropHaPerTonne[iso3] ?? {};
    const haPerTonne = Float64Array.from(prepared.items, (item) => byCode[String(item.code)] ?? 0);
    return {
      haPerTonne,
      base: {
        cropland:
          dot(haPerTonne, pc.emitting) +
          sumValues(land.oilcakeHa?.[iso3]) +
          (land.fodderHa?.[iso3] ?? 0),
        pasture: land.pasture[pc.country.iso3]?.ha ?? 0,
      },
      groups: groupTotals(pc.emitting, prepared),
    };
  });

/**
 * Change in cropland and pasture, ha, from a change in emitting production (by item, and the
 * same summed by group). Cropland counts the crops, the cake's land as `cake` says, and the
 * fodder, which follows the ruminant groups as pasture does.
 */
export const landChangeOf = (
  pc: PreparedCountry,
  change: ItemVector,
  groupChange: GroupTonnes,
  prepared: Prepared,
  cake: CakeDemand,
): Farmland => {
  const { land } = prepared.data;
  const iso3 = pc.country.iso3;
  const own = countryLand(pc, prepared);
  const pasture = land.pasture[iso3];
  const fodder = pasture && { ha: land.fodderHa?.[iso3] ?? 0, shares: pasture.shares };
  return {
    cropland:
      dot(own.haPerTonne, change) +
      oilcakeChange(land.oilcakeHa?.[iso3], cake.sharesOf, cake.relative) +
      pastureChange(fodder, own.groups, groupChange),
    pasture: pastureChange(pasture, own.groups, groupChange),
  };
};

/** Farmland a country frees, net of the farmland it newly uses: negative when it uses more. */
export const netFreedHa = (change: Farmland): number => -farmlandTotal(change);

/**
 * CO₂ taken up each year, kg, from land freed as the shift ramps in (negative for land newly
 * used). Land freed in year y takes up CO₂ from y for `years` years, so the uptake in t is the
 * full uptake times the share of land freed between t − years and t.
 */
export const uptakePath = (
  full: number,
  years: readonly number[],
  freedShare: (year: number) => number,
  regrowthYears: number,
): number[] =>
  years.map((t) => full * (freedShare(t) - freedShare(t - Math.max(0, regrowthYears))));

/** CO₂ taken up each year as a negative emission. */
export const uptakeAsEmissions = (uptake: readonly number[]): GasVector[] =>
  uptake.map((u) => ({ co2: -u, ch4: 0, n2o: 0 }));

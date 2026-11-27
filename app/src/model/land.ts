import { ANIMAL_GROUPS, type AnimalGroup, type GasVector, type Land } from '../data/types';
import { cakeAmountChange, cakeWeights, type CakeDemand } from './cake';
import { primaryTotals } from './crops';
import type { Prepared, PreparedCountry } from './prepare';
import { dot, memoPer, sparseDot, type ItemVector } from './util';

export { cakeAmountChange, cakeWeights, type CakeDemand, type CakeWeights } from './cake';

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

const grazedTerm = (share: number, base: number, change: number): number =>
  share > 0 && base > 0 ? (share * change) / base : 0;

/** The relative change of the grazing, each ruminant group's share by its change in production. */
const grazedChange = (
  pasture: Land['pasture'][string],
  before: GroupTonnes,
  change: GroupTonnes,
): number => {
  let acc = 0;
  for (const g of ANIMAL_GROUPS) {
    acc += grazedTerm(pasture.shares[g] ?? 0, before[g] ?? 0, change[g] ?? 0);
  }
  return acc;
};

/**
 * Change in pasture: each ruminant group's share of the pasture changes by that group's
 * relative change in production; the pasture never falls below zero.
 */
export const pastureChange = (
  pasture: Land['pasture'][string] | undefined,
  before: GroupTonnes,
  change: GroupTonnes,
): number =>
  pasture && pasture.ha > 0
    ? Math.max(-pasture.ha, pasture.ha * grazedChange(pasture, before, change))
    : 0;

/** Change in the land of oilseeds crushed for cake, each oilseed's as `cakeAmountChange` says. */
export const oilcakeChange = (
  cakeHa: Readonly<Record<string, number>> | undefined,
  sharesOf: (code: string) => Partial<Record<AnimalGroup, number>> | undefined,
  relative: Partial<Record<AnimalGroup, number>>,
): number => {
  let acc = 0;
  for (const code in cakeHa) {
    acc += cakeAmountChange(cakeHa[code] as number, cakeWeights(sharesOf(code), relative));
  }
  return acc;
};

const sumValues = (r: Readonly<Record<string, number>> | undefined): number =>
  Object.values(r ?? {}).reduce((a, b) => a + b, 0);

interface CountryLand {
  haPerTonne: ItemVector;
  /** The fodder's hectares, which follow the grazing's shares; absent without pasture. */
  fodder?: Land['pasture'][string];
  base: Farmland;
  /** Emitting production by group, butter in milk tonnes: each ruminant group's base. */
  groups: GroupTonnes;
}

const landCache = memoPer<PreparedCountry, CountryLand>();

/** Cropland in the base year: the crops' land, the oilcakes' share of the crush and the fodder. */
const baseCropland = (land: Land, iso3: string, haPerTonne: ItemVector, pc: PreparedCountry) =>
  dot(haPerTonne, pc.emitting) + sumValues(land.oilcakeHa?.[iso3]) + (land.fodderHa?.[iso3] ?? 0);

const basePasture = (land: Land, iso3: string): number => land.pasture[iso3]?.ha ?? 0;

/** A country's hectares per tonne by item, its farmland in the base year, its animal production. */
export const countryLand = (pc: PreparedCountry, prepared: Prepared): CountryLand =>
  landCache(pc, 'land', () => {
    const { land } = prepared.data;
    const iso3 = pc.country.iso3;
    const byCode = land.cropHaPerTonne[iso3] ?? {};
    const haPerTonne = Float64Array.from(prepared.items, (item) => byCode[String(item.code)] ?? 0);
    const pasture = land.pasture[iso3];
    return {
      haPerTonne,
      ...(pasture ? { fodder: { ha: land.fodderHa?.[iso3] ?? 0, shares: pasture.shares } } : {}),
      base: {
        cropland: baseCropland(land, iso3, haPerTonne, pc),
        pasture: basePasture(land, iso3),
      },
      groups: primaryTotals(pc.emitting, prepared),
    };
  });

/**
 * Change in cropland and pasture, ha, from a change in emitting production (by item, and the
 * same summed by `primaryTotals`). Cropland counts the crops, the cake's land as `cake` says, and
 * the fodder, which follows the ruminant groups as pasture does.
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
  const fodder = pasture && own.fodder;
  return {
    cropland:
      sparseDot(own.haPerTonne, change) +
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
  uptake.map((u) => ({ co2: -u, ch4: 0, n2o: 0, hfc: 0 }));

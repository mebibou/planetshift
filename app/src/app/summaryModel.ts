import type { Country, CountedCause, Gas } from '../data/types';
import type { CountryResult } from '../model/api';
import { COUNTED_CAUSES, FAMILIES, type Family } from '../levers/registry';
import { shareOut } from '../model/attribution';

export interface PerCapita {
  proteinBefore: number;
  proteinAfter: number;
  kcalBefore: number;
  kcalAfter: number;
}

/** Population-weighted world mean of the per-capita supply, before and after. */
export const worldPerCapita = (
  results: CountryResult[],
  countries: Country[],
  year: number,
): PerCapita => {
  const population = new Map(
    countries.map((c) => [
      c.iso3,
      c.population[String(year)] ?? Object.values(c.population)[0] ?? 0,
    ]),
  );
  const weighted = results.map((r) => ({ r, w: population.get(r.iso3) ?? 0 }));
  const total = weighted.reduce((s, { w }) => s + w, 0);
  const mean = (f: (r: CountryResult) => number) =>
    total > 0 ? weighted.reduce((s, { r, w }) => s + f(r) * w, 0) / total : 0;
  return {
    proteinBefore: mean((r) => r.proteinBefore),
    proteinAfter: mean((r) => r.proteinAfter),
    kcalBefore: mean((r) => r.kcalBefore),
    kcalAfter: mean((r) => r.kcalAfter),
  };
};

/** Value of a yearly series at a year, or null when the year is out of range. */
export const valueAt = (
  years: number[],
  values: (number | null)[],
  year: number,
): number | null => {
  const i = years.indexOf(year);
  return i < 0 ? null : (values[i] ?? null);
};

/** The i18n key and magnitude of a gas's change: "avoided" when it falls, "added" when it rises. */
export const gasChange = (gas: Gas, avoided: number): { key: string; value: number } =>
  avoided < 0
    ? { key: `summary.${gas}Added`, value: -avoided }
    : { key: `summary.${gas}`, value: avoided };

interface Farmland {
  cropland: number;
  pasture: number;
}

/**
 * Farmland freed by the shift (or added, when it needs more), as a positive total, the change
 * in use of each part (negative when freed), and the total as a share of world farmland.
 */
export const landStat = (
  before: Farmland,
  freed: Farmland,
): { key: string; total: number; cropland: number; pasture: number; share: number } => {
  const total = freed.cropland + freed.pasture;
  const world = before.cropland + before.pasture;
  return {
    key: total < 0 ? 'summary.landAdded' : 'summary.landFreed',
    total: Math.abs(total),
    cropland: -freed.cropland,
    pasture: -freed.pasture,
    share: world > 0 ? Math.abs(total) / world : 0,
  };
};

/** A food's part of its family's, as a row of the breakdown. */
export interface FoodRow {
  food: string;
  /** °C avoided (negative when the food adds warming). */
  value: number;
  width: number;
}

export interface FamilyRow {
  family: Family;
  /** °C avoided (negative when the family adds warming). */
  value: number;
  /** |value| over the largest |value|, for the bar's length. */
  width: number;
  /** Its foods, biggest first, when it is split by food and more than one shows. */
  foods: FoodRow[];
}

export interface CauseGroup {
  cause: CountedCause;
  /** °C the levers avoid for this cause (negative when they add to it). */
  value: number;
  width: number;
  /** The families acting on it, biggest first. */
  rows: FamilyRow[];
}

/** A family's foods' warming by cause, for the families split by food. */
export type FoodWarming = Record<Family, Record<string, Record<CountedCause, number>>>;

/** The foods a family lists at most; the rest are added up as one row. */
const MOST_FOODS = 4;
/** The key of the row that adds up a family's other foods. */
export const OTHER_FOODS = 'other';

/**
 * A family's foods in a cause, biggest first: the largest that are big enough to show, then the
 * rest added up. A rest too small to show, or of the other sign than the foods together (a food
 * that adds warming among those a cutting lever saves), is shared out between the foods listed
 * by their sizes instead, so the rows always add up to the family's part.
 */
const foodsIn = (
  foods: FoodWarming,
  family: Family,
  cause: CountedCause,
  shown: number,
): { food: string; value: number }[] => {
  const all = Object.entries(foods[family] ?? {}).map(([food, byCause]) => ({
    food,
    value: byCause[cause] ?? 0,
  }));
  const listed = [...all]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .filter((f) => Math.abs(f.value) >= shown)
    .slice(0, MOST_FOODS);
  const rest = all.filter((f) => !listed.includes(f));
  const other = rest.reduce((s, f) => s + f.value, 0);
  const total = all.reduce((s, f) => s + f.value, 0);
  const apart = Math.abs(other) >= shown && other * total > 0;
  const folded = shareOut(
    listed.map((f) => f.value),
    apart ? 0 : other,
  );
  const rows = listed
    .map((f, k) => ({ food: f.food, value: folded[k] as number }))
    .sort((a, b) => b.value - a.value);
  return apart
    ? [...rows, ...(rest.length === 1 ? rest : [{ food: OTHER_FOODS, value: other }])]
    : rows;
};

/** Whether a family shows its foods in a cause: when more than one is big enough. */
const splitIn = (foods: FoodWarming, family: Family, cause: CountedCause, shown: number) =>
  foodsIn(foods, family, cause, shown).length > 1;

/**
 * The breakdown grouped by cause, as the Causes of warming chart's bands: each cause the levers
 * move, biggest first, with the families acting on it, biggest first, and under a family split
 * by food its foods. One scale for all, so a family's bar reads against its cause's; a part too
 * small to show (`shown`, °C) is left out. Empty when a single family acts and shows no foods,
 * as the headline already gives it.
 */
export const causeGroups = (
  warming: Record<Family, Record<CountedCause, number>>,
  foods: FoodWarming = {},
  epsilon = 1e-6,
  shown = 0.0005,
): CauseGroup[] => {
  const acting = FAMILIES.filter((f) =>
    COUNTED_CAUSES.some((c) => Math.abs(warming[f]?.[c] ?? 0) > epsilon),
  );
  const split = acting.some((f) => COUNTED_CAUSES.some((c) => splitIn(foods, f, c, shown)));
  return acting.length > 1 || split ? groupsOf(warming, foods, acting, shown) : [];
};

/** The causes the acting families move, each with its families and their foods, on one scale. */
const groupsOf = (
  warming: Record<Family, Record<CountedCause, number>>,
  foods: FoodWarming,
  acting: readonly Family[],
  shown: number,
): CauseGroup[] => {
  const of = (f: Family, c: CountedCause) => warming[f]?.[c] ?? 0;
  const foodRows = (f: Family, c: CountedCause) =>
    splitIn(foods, f, c, shown) ? foodsIn(foods, f, c, shown) : [];
  const totals = COUNTED_CAUSES.map((cause) => ({
    cause,
    value: acting.reduce((s, f) => s + of(f, cause), 0),
    families: acting.filter((f) => Math.abs(of(f, cause)) >= shown),
  })).filter((g) => g.families.length > 0);
  const largest = Math.max(
    0,
    ...totals.flatMap((g) => [
      Math.abs(g.value),
      ...g.families.flatMap((f) => [
        Math.abs(of(f, g.cause)),
        ...foodRows(f, g.cause).map((r) => Math.abs(r.value)),
      ]),
    ]),
  );
  const width = (v: number) => (largest > 0 ? Math.abs(v) / largest : 0);
  return totals
    .sort((a, b) => b.value - a.value)
    .map(({ cause, value, families }) => ({
      cause,
      value,
      width: width(value),
      rows: families
        .map((family) => ({
          family,
          value: of(family, cause),
          width: width(of(family, cause)),
          foods: foodRows(family, cause).map((r) => ({ ...r, width: width(r.value) })),
        }))
        .sort((a, b) => b.value - a.value),
    }));
};

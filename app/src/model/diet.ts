import { ANIMAL_GROUPS, type AnimalGroup, type Item } from '../data/types';
import type { Basis, Scenario } from './api';
import type { Prepared, PreparedCountry } from './prepare';
import { basisPerTonne, mixOf, REPLACEMENT_MIXES } from './replacement';
import { clamp, dot, isEmpty, memoPer, recordFrom, type ItemVector } from './util';

const GRAMS_PER_TONNE = 1e6;
const DAYS = 365;

const groupsRecord = (f: (g: AnimalGroup) => number): Record<AnimalGroup, number> =>
  recordFrom(ANIMAL_GROUPS, f);

/** Share of each animal group's food supply the scenario removes in this country. */
export const removalShares = (
  scenario: Scenario,
  pc: PreparedCountry,
): Record<AnimalGroup, number> =>
  scenario.where === 'highIncome' && !pc.country.highIncome
    ? groupsRecord(() => 0)
    : groupsRecord((g) => clamp(scenario.groupShifts[g] ?? scenario.shift, 0, 1));

const mixCache = memoPer<PreparedCountry, ItemVector>();

/**
 * Who receives the removed protein (or kcal): the mix, else current plants. It depends only on
 * the country's diet, so it is computed once per country and choice.
 */
export const recipientsOf = (
  scenario: Scenario,
  pc: PreparedCountry,
  prepared: Prepared,
): ItemVector => {
  const { basis } = scenario;
  return mixCache(pc, `${scenario.replacement}|${basis}`, () => {
    const mix = mixOf(REPLACEMENT_MIXES[scenario.replacement], pc.food, prepared, basis);
    return isEmpty(mix) ? mixOf(REPLACEMENT_MIXES.current, pc.food, prepared, basis) : mix;
  });
};

/** Each item's protein (t) or kcal per tonne, once per item list and basis. */
const basisCache = memoPer<readonly Item[], ItemVector>();
export const basisVector = (prepared: Prepared, basis: Basis): ItemVector =>
  basisCache(prepared.items, basis, () =>
    Float64Array.from(prepared.items, (item) => basisPerTonne(item, basis)),
  );

/** Each item's animal group, or undefined for a plant. */
const animalGroupCache = memoPer<readonly Item[], readonly (AnimalGroup | undefined)[]>();
const animalGroupsOf = (prepared: Prepared): readonly (AnimalGroup | undefined)[] =>
  animalGroupCache(prepared.items, 'groups', () =>
    prepared.items.map((item) => (item.animal ? (item.group as AnimalGroup) : undefined)),
  );

/** Each animal item's food less its group's share, tonnes, and the protein or kcal it held. */
const removedFood = (
  food: ItemVector,
  groups: readonly (AnimalGroup | undefined)[],
  shares: Record<AnimalGroup, number>,
  perTonne: ItemVector,
): { removed: ItemVector; removedBasis: number } => {
  const removed = new Float64Array(food.length);
  let total = 0;
  for (let i = 0; i < food.length; i++) {
    const t = food[i] as number;
    const group = groups[i];
    const r = group !== undefined && t > 0 ? -t * shares[group] : 0;
    removed[i] = r;
    total += r * (perTonne[i] as number);
  }
  return { removed, removedBasis: -total };
};

/** The removed food with the same protein or kcal added to the plant recipients, by share. */
const withRecipients = (
  removed: ItemVector,
  recipients: ItemVector,
  perTonne: ItemVector,
  removedBasis: number,
): ItemVector =>
  Float64Array.from(removed, (t, i) => {
    const share = recipients[i] as number;
    return share > 0 ? t + (removedBasis * share) / (perTonne[i] as number) : t;
  });

/**
 * Change in food supply, tonnes per item: each animal item loses its group's share, and the
 * same protein (or kcal) is added to the plant recipients of the mix. Loops, as this runs for
 * every country on each move of the diet.
 */
export const foodChange = (
  scenario: Scenario,
  pc: PreparedCountry,
  prepared: Prepared,
): ItemVector => {
  const perTonne = basisVector(prepared, scenario.basis);
  const { removed, removedBasis } = removedFood(
    pc.food,
    animalGroupsOf(prepared),
    removalShares(scenario, pc),
    perTonne,
  );
  return removedBasis > 0
    ? withRecipients(removed, recipientsOf(scenario, pc, prepared), perTonne, removedBasis)
    : removed;
};

/** Protein (g) or energy (kcal) per person per day in a food vector. */
export const perCapitaPerDay = (
  food: ItemVector,
  pc: PreparedCountry,
  prepared: Prepared,
  basis: Basis,
): number =>
  pc.population > 0
    ? (dot(food, basisVector(prepared, basis)) * (basis === 'protein' ? GRAMS_PER_TONNE : 1)) /
      pc.population /
      DAYS
    : 0;

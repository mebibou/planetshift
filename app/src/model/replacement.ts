import type { Item } from '../data/types';
import type { Basis, Replacement } from './api';
import type { Prepared } from './prepare';
import { isEmpty, normalise, zeros, type ItemVector } from './util';

export const SOYBEANS = '2555';
export const OATS = '2516';

/** A part of a replacement mix: a weight, and the items that share it. */
export interface MixComponent {
  weight: number;
  accepts: (item: Item) => boolean;
}

const PROTEIN_RICH_GROUPS = new Set(['cereals', 'rice', 'pulses', 'nuts']);
/** Oilseeds eaten whole for their protein (soybeans, groundnuts, sesame…), not coconuts or olives. */
export const PROTEIN_RICH_OILSEED = 0.1;

/** The plant foods that supply most plant protein: cereals, rice, pulses, nuts, oilseeds. */
export const proteinRich = (item: Item): boolean =>
  !item.animal &&
  (PROTEIN_RICH_GROUPS.has(item.group) ||
    (item.group === 'oilCrops' && item.proteinPerTonne >= PROTEIN_RICH_OILSEED));

/**
 * Replacement mixes, as shares of the protein (or kcal) added. 'current' is today's mix of the
 * protein-rich plant foods; 'legumes' and 'plantMilk' are starting values to review (see
 * docs/methodology/en/shift.md).
 */
export const REPLACEMENT_MIXES: Record<Replacement, readonly MixComponent[]> = {
  current: [{ weight: 1, accepts: proteinRich }],
  legumes: [
    { weight: 0.6, accepts: (i) => i.group === 'pulses' },
    { weight: 0.2, accepts: (i) => String(i.code) === SOYBEANS },
    { weight: 0.2, accepts: (i) => i.group === 'cereals' },
  ],
  plantMilk: [
    { weight: 0.5, accepts: (i) => String(i.code) === SOYBEANS },
    { weight: 0.5, accepts: (i) => String(i.code) === OATS },
  ],
};

export const basisPerTonne = (item: Item, basis: Basis): number =>
  basis === 'protein' ? item.proteinPerTonne : item.kcalPerTonne;

const eligible = (item: Item, component: MixComponent, basis: Basis) =>
  component.accepts(item) && basisPerTonne(item, basis) > 0;

/** Each accepted item's share of the basis in a food vector. */
const shareOfBasis = (
  food: ItemVector,
  component: MixComponent,
  prepared: Prepared,
  basis: Basis,
): ItemVector =>
  normalise(
    food.map((t, i) => {
      const item = prepared.items[i] as Item;
      return eligible(item, component, basis) ? t * basisPerTonne(item, basis) : 0;
    }),
  );

const evenSplit = (component: MixComponent, prepared: Prepared, basis: Basis): ItemVector =>
  normalise(
    Float64Array.from(prepared.items, (item) => (eligible(item, component, basis) ? 1 : 0)),
  );

/** A component's split: the country's own mix, else the world's, else equal shares. */
const componentSplit = (
  component: MixComponent,
  food: ItemVector,
  prepared: Prepared,
  basis: Basis,
): ItemVector =>
  [
    () => shareOfBasis(food, component, prepared, basis),
    () => shareOfBasis(prepared.worldFood, component, prepared, basis),
    () => evenSplit(component, prepared, basis),
  ].reduce<ItemVector | undefined>(
    (found, next) => (found && !isEmpty(found) ? found : next()),
    undefined,
  ) ?? zeros(prepared.items.length);

/**
 * Share of the added protein (or kcal) going to each item, summing to 1. Components with no
 * item at all are dropped and the others rescaled; all zero only when no item qualifies.
 */
export const mixOf = (
  components: readonly MixComponent[],
  food: ItemVector,
  prepared: Prepared,
  basis: Basis,
): ItemVector =>
  normalise(
    components
      .map((c) => ({ weight: c.weight, split: componentSplit(c, food, prepared, basis) }))
      .reduce(
        (acc, { weight, split }) => acc.map((a, i) => a + weight * (split[i] as number)),
        zeros(prepared.items.length),
      ),
  );

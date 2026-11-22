import type { SupplyRow } from '../data/types';

/**
 * Losses and seed are held as fixed shares of domestic supply, so a change of one tonne in
 * end use (food, feed, other) changes supply by 1 / (1 − their share). Processing does not
 * scale: what an item is processed into (oil, sugar, butter…) is a derived item with its own
 * supply and its own intensity. Capped as a guard against a row that is almost all losses.
 */
export const MAX_SUPPLY_MULTIPLIER = 3;

export const domesticSupply = (row: SupplyRow): number =>
  row.food + row.feed + row.losses + row.processing + row.seed + row.other;

export const supplyMultiplier = (row: SupplyRow): number => {
  const supply = domesticSupply(row);
  const scaled = supply - row.losses - row.seed;
  return supply <= 0
    ? 1
    : scaled <= 0
      ? MAX_SUPPLY_MULTIPLIER
      : Math.min(MAX_SUPPLY_MULTIPLIER, supply / scaled);
};

/**
 * The multiplier once losses before shops are cut by `lossCut` (0..1): the loss share of supply
 * becomes (1 − lossCut) × its share. Equal to supplyMultiplier's for the same row at lossCut 0.
 */
export const multiplierWith = (lossShare: number, seedShare: number, lossCut: number): number => {
  const kept = 1 - (1 - lossCut) * lossShare - seedShare;
  return kept <= 0 ? MAX_SUPPLY_MULTIPLIER : Math.min(MAX_SUPPLY_MULTIPLIER, 1 / kept);
};

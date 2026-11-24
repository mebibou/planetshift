import type { Prepared, PreparedCountry } from '../../model/prepare';
import { memoPer, type ItemVector } from '../../model/util';

const cache = memoPer<PreparedCountry, ItemVector>();

/** A country's CO₂ kept in the deep ocean per tonne less of each item produced, kg. */
export const storedPerTonne = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'deadfall', () => {
    const byCode = prepared.data.deadfall.kgCo2PerTonne[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => byCode[String(item.code)] ?? 0);
  });

/** CO₂ a year of a change in production, kg: negative when the catch falls and carbon sinks. */
export const deadfallCo2 = (change: ItemVector, perTonne: ItemVector): number =>
  perTonne.reduce((acc, f, i) => acc + f * (change[i] as number), 0);

/** Each production step's own part of the CO₂, as the steps' changes add up one on another. */
export const stepParts = (changes: readonly ItemVector[], perTonne: ItemVector): number[] =>
  changes
    .map((c) => deadfallCo2(c, perTonne))
    .map((v, k, all) => v - (k > 0 ? (all[k - 1] as number) : 0));

import { cakeAmountChange, cakeWeights, type CakeDemand } from './land';
import type { Prepared, PreparedCountry } from './prepare';
import { memoPer, sum, type ItemVector } from './util';

/**
 * A processed item made from a crop: tonnes of the crop per tonne of it, and the share of the
 * crop it carries. An oil carries its share of the crush's value, and the cake of `cake` (the
 * oilseed's code) the rest.
 */
export interface Derived {
  item: number;
  perTonne: number;
  share: number;
  cake?: string;
}

/**
 * A country's crops: the items made from each, each one's production with theirs counted back
 * (`base`), and the unprocessed production it was counted from.
 */
export interface Crops {
  derived: ReadonlyMap<number, readonly Derived[]>;
  base: ItemVector;
  emitting: ItemVector;
}

const NONE: readonly Derived[] = [];

/** Crops with nothing made from them: each item's production is its own. */
export const ownProduction = (emitting: ItemVector): Crops => ({
  derived: new Map(),
  base: emitting,
  emitting,
});

/**
 * How an item made from several crops (sugar from cane and beet) is shared between them: by
 * what the country processes of each times its rate, or equally where it processes none.
 */
export const primaryWeights = (
  rates: readonly number[],
  processed: readonly number[],
): number[] => {
  const raw = rates.map((r, k) => r * (processed[k] as number));
  const total = sum(raw);
  return raw.map((w) => (total > 0 ? w / total : 1 / raw.length));
};

const crushed = (
  prepared: Prepared,
  seed: string,
  code: string,
): Pick<Derived, 'share' | 'cake'> => {
  const crush = prepared.data.land.crush?.[seed];
  return crush?.oil === code ? { share: crush.oilShare, cake: seed } : { share: 1 };
};

/** Tonnes of an item processed, by code. */
type Processed = (code: string) => number;

/** Each processed item's links to the crops it is made from, as [crop index, link]. */
const linksOf = (prepared: Prepared, processed: Processed): [number, Derived][] =>
  Object.entries(prepared.data.land.extraction ?? {}).flatMap(([code, byCrop]) => {
    const item = prepared.indexOf.get(code);
    const rates = Object.entries(byCrop).filter(([crop]) => prepared.indexOf.has(crop));
    const weights = primaryWeights(
      rates.map(([, r]) => r),
      rates.map(([crop]) => processed(crop)),
    );
    return item === undefined
      ? []
      : rates.map(([crop, rate], k): [number, Derived] => [
          prepared.indexOf.get(crop) as number,
          { item, perTonne: (weights[k] as number) / rate, ...crushed(prepared, crop, code) },
        ]);
  });

/** Crops from each item's unprocessed production and what is processed of each. */
const cropsFrom = (prepared: Prepared, emitting: ItemVector, processed: Processed): Crops => {
  const derived = linksOf(prepared, processed).reduce(
    (m, [crop, d]) => m.set(crop, [...(m.get(crop) ?? NONE), d]),
    new Map<number, readonly Derived[]>(),
  );
  const base = Float64Array.from(emitting, (t, i) =>
    (derived.get(i) ?? NONE).reduce((a, d) => a + d.perTonne * (emitting[d.item] as number), t),
  );
  return { derived, base, emitting };
};

/** A country's crops from the items' extraction rates. */
export const cropsOf = (pc: PreparedCountry, prepared: Prepared): Crops =>
  cropsFrom(prepared, pc.emitting, (code) => pc.rows.get(code)?.processing ?? 0);

const cache = memoPer<PreparedCountry, Crops>();

/** A country's crops, once per country. */
export const countryCrops = (pc: PreparedCountry, prepared: Prepared): Crops =>
  cache(pc, 'crops', () => cropsOf(pc, prepared));

const worldCache = memoPer<Prepared, Crops>();

/**
 * The world's crops, from its production less its processing: a crop is traded raw and processed
 * where it is imported (Brazil's soybeans in China), so a country's own figures would split it
 * between the crop and its products at the wrong place.
 */
export const worldCrops = (prepared: Prepared): Crops =>
  worldCache(prepared, 'crops', () => {
    const processing = Float64Array.from(prepared.items, (item) =>
      sum(prepared.countries.map((pc) => pc.rows.get(String(item.code))?.processing ?? 0)),
    );
    const at = (code: string) => processing[prepared.indexOf.get(code) as number] as number;
    const emitting = prepared.worldProduction.map((t, i) =>
      Math.max(0, t - (processing[i] as number)),
    );
    return cropsFrom(prepared, emitting, at);
  });

/** The change in tonnes of crop a processed item's change takes, its cake's included. */
const derivedChange = (
  d: Derived,
  change: ItemVector,
  emitting: ItemVector,
  cake: CakeDemand | undefined,
): number => {
  const rest = (1 - d.share) * (emitting[d.item] as number);
  const caked =
    d.cake && cake ? cakeAmountChange(rest, cakeWeights(cake.sharesOf(d.cake), cake.relative)) : 0;
  return d.perTonne * (d.share * (change[d.item] as number) + caked);
};

/** A crop's change in tonnes: its own, and what the items made from it take. */
export const cropChange = (
  crops: Crops,
  i: number,
  change: ItemVector,
  emitting: ItemVector,
  cake: CakeDemand | undefined,
): number =>
  (crops.derived.get(i) ?? NONE).reduce(
    (a, d) => a + derivedChange(d, change, emitting, cake),
    change[i] as number,
  );

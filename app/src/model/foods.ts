import { GASES, type Gas, type GasVector } from '../data/types';
import { foodWidth, GAS_SLOTS, FOOD_GROUPS } from './foodEmissions';
import { CHAIN_CAUSES, type ChainIntensities } from './chain';
import type { CountryCakes, CountryIntensities } from './emissions';
import { groupIndicesOf, type Prepared } from './prepare';
import { cachedIn, recordFrom, type ItemVector } from './util';

export interface ItemChange {
  before: ItemVector;
  change: ItemVector;
}

export interface FoodInputs {
  emitting: ItemVector;
  change: ItemVector;
  intensities: CountryIntensities;
  cakes: CountryCakes;
  cakeChange: readonly GasVector[];
  /** The cuts' median shares added, not combined, as `emissionsChange` adds them. */
  cut: Record<Gas, ItemVector> | null;
  chain: ChainIntensities | null;
  parts: readonly (ItemChange | undefined)[];
}

const OIL_CROPS = FOOD_GROUPS.indexOf('oilCrops');

const chainCache = new WeakMap<ChainIntensities, Record<Gas, ItemVector>>();

const chainPerTonne = (ints: ChainIntensities): Record<Gas, ItemVector> =>
  cachedIn(chainCache, ints, () =>
    recordFrom(GASES, (g) =>
      CHAIN_CAUSES.reduce(
        (a, c) => a.map((v, i) => v + (ints[c][g][i] as number)),
        new Float64Array(ints[CHAIN_CAUSES[0]][g].length),
      ),
    ),
  );

const add = (out: Float64Array, at: number, v: number) => {
  out[at] = (out[at] as number) + v;
};

const byGas = (r: Record<Gas, ItemVector>): ItemVector[] => GASES.map((g) => r[g]);

const N = GASES.length;

interface PerTonne {
  kg: readonly ItemVector[];
  cut: readonly ItemVector[];
  after: readonly ItemVector[];
}

const addGases = (
  out: Float64Array,
  base: number,
  i: number,
  [t0, t]: readonly [number, number],
  { kg, cut, after }: PerTonne,
) => {
  for (let j = 0; j < N; j++) {
    const k = (kg[j] as ItemVector)[i] as number;
    const share = (cut[j] as ItemVector)[i] as number;
    const a = (after[j] as ItemVector)[i] as number;
    add(out, base + j, t0 * k);
    add(out, base + N + j, (t - share * (t0 + t)) * k);
    add(out, base + 2 * N + j, t0 * a);
    add(out, base + 3 * N + j, t * a);
  }
};

const addPart = (
  out: Float64Array,
  width: number,
  groups: Int32Array,
  p: ItemChange,
  at: number,
) => {
  for (let i = 0; i < groups.length; i++) {
    const base = (groups[i] as number) * width + at;
    add(out, base, p.before[i] as number);
    add(out, base + 1, p.change[i] as number);
  }
};

const addItems = (out: Float64Array, width: number, groups: Int32Array, x: FoodInputs) => {
  const none = GASES.map(() => new Float64Array(groups.length));
  const perTonne: PerTonne = {
    kg: byGas(x.intensities.kgPerTonne),
    cut: x.cut ? byGas(x.cut) : none,
    after: x.chain ? byGas(chainPerTonne(x.chain)) : none,
  };
  for (let i = 0; i < groups.length; i++) {
    const tonnes = [x.emitting[i] as number, x.change[i] as number] as const;
    if (tonnes[0] !== 0 || tonnes[1] !== 0) {
      addGases(out, (groups[i] as number) * width, i, tonnes, perTonne);
    }
  }
  x.parts.forEach((p, m) => p && addPart(out, width, groups, p, GAS_SLOTS + 2 * m));
};

/** An oilcake counts with its oilseed's group. */
const addCakes = (out: Float64Array, width: number, groups: Int32Array, x: FoodInputs) =>
  x.cakes.kg.forEach((own, k) => {
    const i = x.cakes.index[k] as number;
    const base = (i < 0 ? OIL_CROPS : (groups[i] as number)) * width;
    GASES.forEach((g, j) => {
      const joint = (x.cakeChange[k] as GasVector)[g];
      const share = x.cut && i >= 0 ? (x.cut[g][i] as number) : 0;
      add(out, base + j, own[g]);
      add(out, base + GASES.length + j, joint - share * (own[g] + joint));
    });
  });

/**
 * Packed as `PackedFoods` describes. The animals not raised for food are in no group, so the
 * groups add up to the country's farm emissions without them.
 */
export const countryFoods = (prepared: Prepared, x: FoodInputs): Float64Array => {
  const width = foodWidth(x.parts.length);
  const groups = groupIndicesOf(prepared.items);
  const out = new Float64Array(FOOD_GROUPS.length * width);
  addItems(out, width, groups, x);
  addCakes(out, width, groups, x);
  return out;
};

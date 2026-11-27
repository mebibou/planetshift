import {
  CHAIN_STAGES,
  GASES,
  type Chain,
  type ChainStage,
  type CountedCause,
  type Gas,
  type GasVector,
} from '../data/types';
import type { Prepared, PreparedCountry } from './prepare';
import { cachedIn, memoPer, recordFrom, type ItemVector } from './util';

/** The causes food's emissions after the farm count in: energy, waste and wastewater, refrigerants. */
export const CHAIN_CAUSES = [
  'fossilIndustry',
  'waste',
  'other',
] as const satisfies readonly CountedCause[];
export type ChainCause = (typeof CHAIN_CAUSES)[number];

const CAUSE_OF: Record<ChainStage, ChainCause> = {
  processing: 'fossilIndustry',
  transport: 'fossilIndustry',
  packaging: 'fossilIndustry',
  retail: 'fossilIndustry',
  household: 'fossilIndustry',
  waste: 'waste',
  wastewater: 'waste',
};

/** kg of each gas per tonne of each item, after the farm, by the cause it counts in. */
export type ChainIntensities = Record<ChainCause, Record<Gas, ItemVector>>;

/** A country's factor at a stage: its own, or the world's when FAOSTAT has no figures for it. */
export const factorOf = (chain: Chain, iso3: string, stage: ChainStage, gas: Gas): number => {
  const own = chain.byCountry[iso3];
  return (own ? own[stage]?.[gas] : chain.world[stage]?.[gas]) ?? 0;
};

/**
 * The cause a stage's gas counts in: the refrigerants (HFC-134a) in other human emissions, where
 * fluorinated gases sit, whatever the stage; the rest by the stage.
 */
const stageCause = (stage: ChainStage, gas: Gas): ChainCause =>
  gas === 'hfc' ? 'other' : CAUSE_OF[stage];

const BY_MASS: ReadonlySet<ChainStage> = new Set(['household', 'waste', 'wastewater']);

/** An item's weight at a stage: Poore & Nemecek's for the shared stages, 1 by mass. */
const weightOf = (chain: Chain, code: string, stage: ChainStage): number =>
  BY_MASS.has(stage) ? 1 : (chain.weights[code]?.[stage] ?? 0);

const cache = memoPer<PreparedCountry, ChainIntensities>();

/** A country's chain intensities, kg per tonne of each item, by cause and gas. */
export const chainIntensities = (pc: PreparedCountry, prepared: Prepared, chain: Chain) =>
  cache(
    pc,
    'chain',
    () =>
      Object.fromEntries(
        CHAIN_CAUSES.map((cause) => [
          cause,
          Object.fromEntries(
            GASES.map((gas) => [
              gas,
              Float64Array.from(prepared.items, (item) =>
                CHAIN_STAGES.filter((s) => stageCause(s, gas) === cause).reduce(
                  (a, s) =>
                    a +
                    factorOf(chain, pc.country.iso3, s, gas) *
                      weightOf(chain, String(item.code), s),
                  0,
                ),
              ),
            ]),
          ),
        ]),
      ) as ChainIntensities,
  );

/** kg of each gas from tonnes of production (or a change in it), by the chain's intensities. */
export const chainEmissions = (
  production: ItemVector,
  intensities: Record<Gas, ItemVector>,
): GasVector =>
  Object.fromEntries(
    GASES.map((g) => [g, production.reduce((a, t, i) => a + t * (intensities[g][i] as number), 0)]),
  ) as GasVector;

/** The sums of `chainSums`: each cause of CHAIN_CAUSES, then each gas of GASES. */
const SLOTS = CHAIN_CAUSES.length * GASES.length;

const matrices = new WeakMap<ChainIntensities, Float64Array>();

/** The intensities item by item, each item's SLOTS sums side by side, once per country. */
const slotMatrix = (ints: ChainIntensities): Float64Array =>
  cachedIn(matrices, ints, () => {
    const rows = CHAIN_CAUSES.flatMap((c) => GASES.map((g) => ints[c][g]));
    const n = (rows[0] as ItemVector).length;
    const m = new Float64Array(n * SLOTS);
    rows.forEach((row, k) => row.forEach((v, i) => (m[i * SLOTS + k] = v)));
    return m;
  });

/**
 * kg of each gas by cause from tonnes of production (or a change in it), as one flat vector of
 * CHAIN_CAUSES × GASES. One loop over the items fills all the sums in place, as this runs for
 * every country and production step of each pass.
 */
export const chainSums = (production: ItemVector, ints: ChainIntensities): Float64Array => {
  const out = new Float64Array(SLOTS);
  const m = slotMatrix(ints);
  for (let i = 0; i < production.length; i++) {
    const t = production[i] as number;
    if (t !== 0) {
      const at = i * SLOTS;
      for (let k = 0; k < SLOTS; k++) {
        out[k] = (out[k] as number) + t * (m[at + k] as number);
      }
    }
  }
  return out;
};

const gasesAt = (sums: Float64Array, base: number): GasVector => ({
  co2: sums[base] as number,
  ch4: sums[base + 1] as number,
  n2o: sums[base + 2] as number,
  hfc: sums[base + 3] as number,
});

/** Each cause's gases out of `chainSums`. */
export const byCause = (sums: Float64Array): Record<ChainCause, GasVector> => ({
  fossilIndustry: gasesAt(sums, 0),
  waste: gasesAt(sums, GASES.length),
  other: gasesAt(sums, 2 * GASES.length),
});

/** All the causes' gases together out of `chainSums`. */
export const allCauses = (sums: Float64Array): GasVector =>
  recordFrom(GASES, (_, j) =>
    CHAIN_CAUSES.reduce((a, _, c) => a + (sums[c * GASES.length + j] as number), 0),
  );

const baseCache = memoPer<PreparedCountry, GasVector>();

/** A country's emissions after the farm in the base year, once per country. */
export const chainBase = (pc: PreparedCountry, ints: ChainIntensities): GasVector =>
  baseCache(pc, 'base', () => allCauses(chainSums(pc.emitting, ints)));

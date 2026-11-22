import type { Location } from './api';
import { addVectors, zeros, type ItemVector } from './util';

/** Shares each item's world change across countries by their emitting production. */
const byShare = (
  worldChange: ItemVector,
  emitting: readonly ItemVector[],
  worldEmitting: ItemVector,
  fallback: readonly ItemVector[] | null,
): ItemVector[] => {
  const n = worldEmitting.length;
  return emitting.map((own, c) => {
    const wanted = fallback?.[c];
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const world = worldEmitting[i] as number;
      out[i] =
        world > 0
          ? ((worldChange[i] as number) * (own[i] as number)) / world
          : wanted
            ? (wanted[i] as number)
            : 0;
    }
    return out;
  });
};

/**
 * `locate` on countries given in the same order in both lists, as the model runs it: the
 * world sums add the countries in that order.
 */
export const locateAll = (
  demand: readonly ItemVector[],
  emitting: readonly ItemVector[],
  worldEmitting: ItemVector,
  location: Location,
): ItemVector[] => {
  const n = worldEmitting.length;
  if (location === 'fixedTrade')
    return byShare(addVectors(zeros(n), ...demand), emitting, worldEmitting, demand);
  const own = demand.map((d, c) => clipChange(emitting[c] as ItemVector, d).change);
  const residual = zeros(n);
  demand.forEach((d, c) => {
    const o = own[c] as ItemVector;
    for (let i = 0; i < n; i++)
      residual[i] = (residual[i] as number) + ((d[i] as number) - (o[i] as number));
  });
  const remaining = own.map((o, c) => addVectors(emitting[c] as ItemVector, o));
  const traded = byShare(residual, remaining, addVectors(zeros(n), ...remaining), null);
  return own.map((o, c) => addVectors(o, traded[c] as ItemVector));
};

/**
 * Where a change in demand is produced, on emitting production (production − processing).
 * fixedTrade: each item's world change is shared by each country's share of world emitting
 * production (an item nobody produces stays where it is demanded). domestic: each country
 * produces its own change as far as its emitting production allows; what it cannot (a cut
 * larger than what it grows) goes to world trade and is shared as in fixedTrade.
 */
export const locate = (
  demand: Readonly<Record<string, ItemVector>>,
  emitting: Readonly<Record<string, ItemVector>>,
  worldEmitting: ItemVector,
  location: Location,
): Record<string, ItemVector> => {
  const n = worldEmitting.length;
  const isos = [...new Set([...Object.keys(demand), ...Object.keys(emitting)])];
  const located = locateAll(
    isos.map((iso3) => demand[iso3] ?? zeros(n)),
    isos.map((iso3) => emitting[iso3] ?? zeros(n)),
    worldEmitting,
    location,
  );
  return Object.fromEntries(isos.map((iso3, c) => [iso3, located[c] as ItemVector]));
};

const TOLERANCE = 1e-6;

/** The change held so production stays at or above zero, and whether that bit. */
export const clipChange = (
  production: ItemVector,
  change: ItemVector,
): { change: ItemVector; clipped: boolean } => {
  const out = new Float64Array(change.length);
  let clipped = false;
  for (let i = 0; i < change.length; i++) {
    const d = change[i] as number;
    const p = production[i] as number;
    out[i] = Math.max(d, -p);
    clipped ||= p + d < -TOLERANCE;
  }
  return { change: out, clipped };
};

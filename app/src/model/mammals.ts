import type { AnimalGroup, HerdGroup } from '../data/types';

/** A country without farmed mammals in the data. */
export const NO_MAMMALS = { mammals: 0, mammalsChange: 0 } as const;

const herdChange = (group: HerdGroup, change: Record<AnimalGroup, number>): number =>
  group === 'other' ? 0 : change[group];

/**
 * A country's farmed mammals, tonnes of live weight, and their change: each herd grows or shrinks
 * with the production of the group it follows (`change`, relative, as `groupProductionChange`
 * gives it), and the animals kept for work stay.
 */
export const mammalsOf = (
  herds: Partial<Record<HerdGroup, number>>,
  change: Record<AnimalGroup, number>,
): { mammals: number; mammalsChange: number } => {
  const entries = Object.entries(herds) as [HerdGroup, number][];
  return {
    mammals: entries.reduce((s, [, t]) => s + t, 0),
    mammalsChange: entries.reduce((s, [g, t]) => s + t * herdChange(g, change), 0),
  };
};

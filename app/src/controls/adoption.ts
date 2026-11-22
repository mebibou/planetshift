import { ANIMAL_GROUPS } from '../data/types';
import { adoptionOf, PANEL_MODULES, type LeverId } from '../levers/registry';
import type { LeverModule } from '../levers/types';
import type { Levers, Scenario } from '../model/api';

/** A lever's adoption set, or left out of the scenario at 0 so the URL stays clean. */
export const withLever = (s: Scenario, id: LeverId, adoption: number): Scenario => ({
  ...s,
  levers: Object.fromEntries([
    ...Object.entries(s.levers).filter(([k]) => k !== id),
    ...(adoption > 0 ? [[id, adoption]] : []),
  ]) as Levers,
});

/** Every lever of a module set to the same adoption. */
export const withFamily = (s: Scenario, module: LeverModule, adoption: number): Scenario =>
  module.levers.reduce<Scenario>((acc, l) => withLever(acc, l.id, adoption), s);

/** The panel's id of the Diet group; the lever groups' ids are their modules'. */
export const DIET_GROUP = 'diet';

export type Level = 'zero' | 'full' | 'mixed';

/** Every value at 0, every value at 1, or anything else. */
export const levelOf = (values: readonly number[]): Level =>
  values.every((v) => v === 0) ? 'zero' : values.every((v) => v === 1) ? 'full' : 'mixed';

/** What a group's quick pair reads: the diet's main shift and each food's share, or its levers. */
export const groupValues = (s: Scenario, id: string): number[] =>
  id === DIET_GROUP
    ? [s.shift, ...ANIMAL_GROUPS.map((g) => s.groupShifts[g] ?? s.shift)]
    : (PANEL_MODULES.find((m) => m.id === id)?.levers.map((l) => adoptionOf(s.levers, l.id)) ?? []);

/** Where a set of groups stands: all at 0, all in full, or in between. */
export const groupsLevel = (s: Scenario, ids: readonly string[]): Level =>
  levelOf(ids.flatMap((id) => groupValues(s, id)));

/**
 * Every group of the set at 0 or in full, in one change of the scenario. The diet's main shift
 * takes the value and the foods set apart join it, so "100%" moves every animal food.
 */
export const withGroupsAt = (s: Scenario, ids: readonly string[], adoption: 0 | 1): Scenario =>
  ids.reduce<Scenario>((acc, id) => {
    if (id === DIET_GROUP) return { ...acc, shift: adoption, groupShifts: {} };
    const module = PANEL_MODULES.find((m) => m.id === id);
    return module ? withFamily(acc, module, adoption) : acc;
  }, s);

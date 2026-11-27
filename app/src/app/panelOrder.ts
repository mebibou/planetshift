import type { ModuleCause } from '../data/types';
import type { WorthId } from './worth';

/** A lever group of the panel: its id, the cause it mainly acts on and its worth figure. */
export interface PanelGroup {
  id: string;
  cause: ModuleCause;
  worth: WorthId;
  /** A group it stays right after, whatever their figures. */
  follows?: string;
}

export interface CauseSection {
  cause: ModuleCause;
  groups: string[];
}

/** `ids` with each group that follows another moved to right after it, in their order. */
const withFollowers = (ids: readonly string[], groups: readonly PanelGroup[]): string[] => {
  const followers = groups.filter((g) => g.follows && ids.includes(g.id));
  const moved = new Set(followers.map((g) => g.id));
  return ids
    .filter((id) => !moved.has(id))
    .flatMap((id) => [id, ...followers.filter((g) => g.follows === id).map((g) => g.id)]);
};

/**
 * The panel's lever groups under their causes: the causes biggest first by the warming they
 * cause (`causeSize`), the groups of each by the warming they would avoid in full on their own
 * (`avoided`, larger first), in their given order where a figure is missing or equal, and a
 * group that follows another right after it. A cause without a group is left out.
 */
export const panelOrder = (
  groups: readonly PanelGroup[],
  causeSize: Readonly<Partial<Record<ModuleCause, number>>>,
  avoided: (worth: WorthId) => number | undefined,
): CauseSection[] =>
  (Object.keys(causeSize) as ModuleCause[])
    .map((cause, i) => ({ cause, i }))
    .sort((a, b) => (causeSize[b.cause] ?? 0) - (causeSize[a.cause] ?? 0) || a.i - b.i)
    .map(({ cause }) => ({
      cause,
      groups: groups
        .map((g, i) => ({ g, i }))
        .filter(({ g }) => g.cause === cause)
        .sort(
          (a, b) =>
            (avoided(b.g.worth) ?? -Infinity) - (avoided(a.g.worth) ?? -Infinity) || a.i - b.i,
        )
        .map(({ g }) => g.id),
    }))
    .map((s) => ({ ...s, groups: withFollowers(s.groups, groups) }))
    .filter((s) => s.groups.length > 0);

/**
 * The key the panel's order is kept for: it moves only when an option, the horizon or the data
 * (a deferred lever file arriving) does, never with a slider.
 */
export const orderKey = (options: unknown, horizon: string, dataVersion: number): string =>
  JSON.stringify([options, horizon, dataVersion]);

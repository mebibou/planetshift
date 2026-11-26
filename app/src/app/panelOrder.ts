import type { ModuleCause } from '../data/types';
import type { WorthId } from './worth';

/** A lever group of the panel: its id, the cause it mainly acts on and its worth figure. */
export interface PanelGroup {
  id: string;
  cause: ModuleCause;
  worth: WorthId;
}

export interface CauseSection {
  cause: ModuleCause;
  groups: string[];
}

/**
 * The panel's lever groups under their causes: the causes biggest first by the warming they
 * cause (`causeSize`), the groups of each by the warming they would avoid in full on their own
 * (`avoided`, larger first), in their given order where a figure is missing or equal. A cause
 * without a group is left out.
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
    .filter((s) => s.groups.length > 0);

/**
 * The key the panel's order is kept for: it moves only when an option, the horizon or the data
 * (a deferred lever file arriving) does, never with a slider.
 */
export const orderKey = (options: unknown, horizon: string, dataVersion: number): string =>
  JSON.stringify([options, horizon, dataVersion]);

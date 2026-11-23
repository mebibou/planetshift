import { ANIMAL_GROUPS } from '../data/types';
import { withFamily, withLever } from '../controls/adoption';
import { PANEL_MODULES } from '../levers/registry';
import type { LeverModule } from '../levers/types';
import type { Options, Scenario } from '../model/api';
import { BASE_SCENARIO } from '../model/scenarios';
import type { Horizon } from './url';

/** The warming a lever, a family or the diet avoids on its own at 100%, °C (median). */
export interface Worth {
  '2050': number;
  '2100': number;
}

/** `diet`, `group:<animal group>`, `family:<module>` or `lever:<lever>`. */
export type WorthId = string;

export interface WorthJob {
  id: WorthId;
  scenario: Scenario;
}

/** No shift and no lever, but the diet's how (basis, replacement, where) and its ramp kept. */
const alone = (s: Scenario): Scenario => ({
  ...BASE_SCENARIO,
  rampEnd: s.rampEnd,
  basis: s.basis,
  replacement: s.replacement,
  where: s.where,
});

/**
 * One run per figure, each on its own against no shift and no lever: the diet and the lever
 * families first, as their headers show while closed, then each animal food and each lever.
 */
export const worthJobs = (
  s: Scenario,
  modules: readonly LeverModule[] = PANEL_MODULES,
): WorthJob[] => {
  const base = alone(s);
  return [
    { id: 'diet', scenario: { ...base, shift: 1 } },
    ...modules.map((m) => ({ id: `family:${m.id}`, scenario: withFamily(base, m, 1) })),
    ...ANIMAL_GROUPS.map((g) => ({
      id: `group:${g}`,
      scenario: { ...base, groupShifts: { [g]: 1 } },
    })),
    ...modules.flatMap((m) =>
      m.levers.map((l) => ({ id: `lever:${l.id}`, scenario: withLever(base, l.id, 1) })),
    ),
  ];
};

/** A run's identity: what it computes depends on nothing else. */
export const jobKey = (job: WorthJob, options: Options): string =>
  JSON.stringify([job.scenario, options]);

/** Headers (diet, families) and rows (foods, levers) are each drawn against their own largest. */
const scaleOf = (id: WorthId): 'header' | 'row' =>
  id === 'diet' || id.startsWith('family:') ? 'header' : 'row';

export interface WorthShown {
  /** Change in warming, °C: negative when the lever avoids warming. */
  change: number;
  /** |change| over the largest |change| of its scale, for the bar behind the figure. */
  share: number;
}

/** What a figure shows at the horizon, or null while it is not computed. */
export const worthShown = (
  values: ReadonlyMap<WorthId, Worth>,
  id: WorthId,
  horizon: Horizon,
): WorthShown | null => {
  const own = values.get(id);
  const largest = Math.max(
    0,
    ...[...values.entries()]
      .filter(([k]) => scaleOf(k) === scaleOf(id))
      .map(([, v]) => Math.abs(v[horizon])),
  );
  return own
    ? { change: -own[horizon], share: largest > 0 ? Math.abs(own[horizon]) / largest : 0 }
    : null;
};

/** Runs `task` once the page has been quiet for `delayMs` and the browser is idle; returns a cancel. */
export type Idle = (task: () => void, delayMs: number) => () => void;

export const browserIdle: Idle = (task, delayMs) => {
  let idle = 0;
  const timer = setTimeout(() => {
    idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(task, { timeout: 2000 })
        : (setTimeout(task, 0) as unknown as number);
  }, delayMs);
  return () => {
    clearTimeout(timer);
    if (idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
    else clearTimeout(idle);
  };
};

export interface WorthCacheDeps {
  run: (s: Scenario, o: Options) => Promise<Worth | null>;
  onChange: (values: ReadonlyMap<WorthId, Worth>) => void;
  idle?: Idle;
  /** Quiet time after the last request before the first run, so slider moves stay smooth. */
  quietMs?: number;
  /** Runs kept, the oldest dropped first. */
  limit?: number;
  jobs?: (s: Scenario) => WorthJob[];
}

export interface WorthCache {
  /** The figures for these settings: those known at once, the others computed one at a time. */
  request: (s: Scenario, o: Options) => void;
  values: () => ReadonlyMap<WorthId, Worth>;
  /** Cancels the runs still to come, when the view is dropped. */
  stop: () => void;
}

export const worthCache = (deps: WorthCacheDeps): WorthCache => {
  const { run, onChange, idle = browserIdle, quietMs = 400, limit = 600, jobs = worthJobs } = deps;
  const cache = new Map<string, Worth | null>();
  let current: { id: WorthId; key: string; scenario: Scenario }[] = [];
  let options: Options | null = null;
  let cancel = () => {};
  const values = (): ReadonlyMap<WorthId, Worth> =>
    new Map(
      current.flatMap(({ id, key }) => {
        const v = cache.get(key);
        return v ? [[id, v] as const] : [];
      }),
    );
  const remember = (key: string, v: Worth | null) => {
    cache.set(key, v);
    if (cache.size > limit) cache.delete(cache.keys().next().value as string);
  };
  let busy = false;
  let stopped = false;
  const missing = () => current.some((j) => !cache.has(j.key));
  const step = () => {
    const next = current.find((j) => !cache.has(j.key));
    if (next && options && !busy && !stopped) {
      busy = true;
      void run(next.scenario, options).then((v) => {
        busy = false;
        remember(next.key, v);
        onChange(values());
        if (!stopped && missing()) cancel = idle(step, 0);
      });
    }
  };
  return {
    request: (s, o) => {
      options = o;
      const keyed = jobs(s).map((j) => ({ ...j, key: jobKey(j, o) }));
      const same =
        keyed.length === current.length && keyed.every((j, i) => j.key === current[i]?.key);
      current = keyed;
      cancel();
      if (!same) onChange(values());
      if (missing()) cancel = idle(step, quietMs);
    },
    values,
    stop: () => {
      stopped = true;
      cancel();
    },
  };
};

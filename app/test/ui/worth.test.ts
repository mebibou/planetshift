import { describe, expect, it } from 'vitest';
import { jobKey, worthCache, worthJobs, worthShown, type Idle } from '../../src/app/worth';
import { LEVERS, PANEL_MODULES } from '../../src/levers/registry';
import { DEFAULT_OPTIONS, type Scenario } from '../../src/model/api';
import { BASE_SCENARIO } from '../../src/model/scenarios';

const scenario: Scenario = {
  ...BASE_SCENARIO,
  shift: 0.4,
  groupShifts: { dairy: 0.2 },
  basis: 'kcal',
  rampEnd: 2040,
  levers: { feedAdditives: 0.5 },
};

/** An idle scheduler the test runs by hand. */
const manual = () => {
  const queue: (() => void)[] = [];
  const idle: Idle = (task) => {
    queue.push(task);
    return () => queue.splice(queue.indexOf(task), 1);
  };
  return {
    idle,
    queue,
    flush: () => {
      while (queue.length) queue.shift()?.();
    },
  };
};

describe('worth', () => {
  it('runs each figure alone: the diet, each family, each food and each lever', () => {
    const jobs = worthJobs(scenario);
    expect(jobs).toHaveLength(1 + PANEL_MODULES.length + 6 + LEVERS.length);
    expect(jobs.slice(0, 1 + PANEL_MODULES.length).map((j) => j.id)).toEqual([
      'diet',
      ...PANEL_MODULES.map((m) => `family:${m.id}`),
    ]);
    const lever = jobs.find((j) => j.id === 'lever:feedAdditives')?.scenario;
    expect(lever).toMatchObject({ shift: 0, groupShifts: {}, levers: { feedAdditives: 1 } });
    expect(lever).toMatchObject({ rampEnd: 2040, basis: 'kcal' });
    expect(jobs.find((j) => j.id === 'diet')?.scenario).toMatchObject({ shift: 1, levers: {} });
    expect(jobs.find((j) => j.id === 'group:dairy')?.scenario).toMatchObject({
      shift: 0,
      groupShifts: { dairy: 1 },
    });
  });

  it('keys a run by what it computes, not by the sliders it ignores', () => {
    const [a, b] = [worthJobs(scenario), worthJobs({ ...scenario, shift: 0.9, levers: {} })];
    expect(a.map((j) => jobKey(j, DEFAULT_OPTIONS))).toEqual(
      b.map((j) => jobKey(j, DEFAULT_OPTIONS)),
    );
    expect(jobKey(a[0]!, DEFAULT_OPTIONS)).not.toBe(
      jobKey(a[0]!, { ...DEFAULT_OPTIONS, ssp: 'ssp126' }),
    );
  });

  it('shows the change in warming against the largest of its kind', () => {
    const values = new Map([
      ['diet', { '2050': 0.2, '2100': 0.3 }],
      ['family:energy', { '2050': 0.1, '2100': 0.6 }],
      ['lever:biochar', { '2050': 0.01, '2100': 0.02 }],
      ['lever:flyLess', { '2050': -0.005, '2100': 0.01 }],
    ]);
    expect(worthShown(values, 'diet', '2050')).toEqual({ change: -0.2, share: 1 });
    expect(worthShown(values, 'family:energy', '2050')).toEqual({ change: -0.1, share: 0.5 });
    expect(worthShown(values, 'lever:flyLess', '2050')).toEqual({ change: 0.005, share: 0.5 });
    expect(worthShown(values, 'lever:nope', '2050')).toBeNull();
  });

  it('computes one figure per idle slice, keeps them, and waits for quiet', () => {
    const { idle, queue, flush } = manual();
    let runs = 0;
    const seen: number[] = [];
    const cache = worthCache({
      run: (s) => (runs++, { '2050': s.shift, '2100': s.shift }),
      onChange: (v) => seen.push(v.size),
      idle,
      jobs: (s) => worthJobs(s).slice(0, 3),
    });
    cache.request(scenario, DEFAULT_OPTIONS);
    expect(runs).toBe(0);
    expect(queue).toHaveLength(1);
    cache.request({ ...scenario, shift: 0.5 }, DEFAULT_OPTIONS);
    expect(queue).toHaveLength(1);
    queue.shift()?.();
    expect(runs).toBe(1);
    flush();
    expect(runs).toBe(3);
    expect(cache.values().get('diet')).toEqual({ '2050': 1, '2100': 1 });
    expect(seen.at(-1)).toBe(3);
    cache.request({ ...scenario, shift: 0.7 }, DEFAULT_OPTIONS);
    expect(queue).toHaveLength(0);
    cache.request(scenario, { ...DEFAULT_OPTIONS, ssp: 'ssp370' });
    expect(cache.values().size).toBe(0);
    flush();
    expect(runs).toBe(6);
    cache.request(scenario, DEFAULT_OPTIONS);
    expect(cache.values().size).toBe(3);
    expect(queue).toHaveLength(0);
  });
});

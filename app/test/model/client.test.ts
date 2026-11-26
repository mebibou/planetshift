import { describe, expect, it } from 'vitest';
import type { ModelData } from '../../src/data/types';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import {
  changedFiles,
  inProcessPort,
  modelClient,
  shownResult,
  type Port,
} from '../../src/model/client';
import { respond, serve, type Reply, type Request, type RunResult } from '../../src/model/engine';
import { runScenario } from '../../src/model/run';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

/**
 * A port that keeps what is posted and answers only when told: a run's result at once, its
 * breakdown kept in `later` until sent.
 */
const recording = () => {
  const posted: Request[] = [];
  const later: Reply[] = [];
  let data: ModelData | null = null;
  let on: (r: Reply) => void = () => {};
  const port: Port = {
    post: (req) => posted.push(req),
    listen: (f) => (on = f),
    close: () => undefined,
  };
  const answer = (req: Request) => {
    const out = respond(data, req);
    data = out.data;
    if (out.reply) {
      on(out.reply);
    }
    if (out.later) {
      later.push(out.later());
    }
  };
  const deliver = (reply: Reply) => on(reply);
  return { port, posted, answer, later, deliver };
};

const scenarioOf = (shift: number) => ({ ...BASE_SCENARIO, shift });

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('the model client', () => {
  const data = loadFixtures();

  it('runs only the latest of the requests made while a run is out', () => {
    const { port, posted, answer } = recording();
    const client = modelClient(port);
    const shifts: (number | undefined)[] = [];
    client.onResult((r) => shifts.push(r?.summary.avoidedWarming2100.median));
    client.setData(data);
    [0.1, 0.2, 0.3].forEach((shift) =>
      client.run({ ...BASE_SCENARIO, shift }, DEFAULT_OPTIONS, CURRENT_YEAR),
    );
    expect(posted.map((r) => r.kind)).toEqual(['data', 'run']);
    posted.forEach(answer);
    expect(posted.map((r) => r.kind)).toEqual(['data', 'run', 'run']);
    answer(posted[2]!);
    const runs = posted.filter((r) => r.kind === 'run');
    expect(runs.map((r) => ('scenario' in r ? r.scenario.shift : null))).toEqual([0.1, 0.3]);
    expect(shifts).toHaveLength(0);
  });

  it('shows a first result once its breakdown comes, the whole run', () => {
    const { port, posted, answer, later, deliver } = recording();
    const client = modelClient(port);
    const shown: (RunResult | null)[] = [];
    client.onResult((r) => shown.push(r));
    client.setData(data);
    client.run(scenarioOf(0.4), DEFAULT_OPTIONS, CURRENT_YEAR);
    posted.forEach(answer);
    expect(shown).toHaveLength(0);
    later.forEach(deliver);
    expect(JSON.stringify(shown)).toEqual(
      JSON.stringify([runScenario(data, scenarioOf(0.4), DEFAULT_OPTIONS, CURRENT_YEAR)]),
    );
  });

  it('shows a result at once with the last breakdown, then fills in its own', () => {
    const { port, posted, answer, later, deliver } = recording();
    const client = modelClient(port);
    const shown: (RunResult | null)[] = [];
    client.onResult((r) => shown.push(r));
    client.setData(data);
    client.run(scenarioOf(0.2), DEFAULT_OPTIONS, CURRENT_YEAR);
    posted.forEach(answer);
    deliver(later[0]!);
    client.run(scenarioOf(1), DEFAULT_OPTIONS, CURRENT_YEAR);
    answer(posted[2]!);
    const whole = runScenario(data, scenarioOf(1), DEFAULT_OPTIONS, CURRENT_YEAR);
    expect(shown).toHaveLength(2);
    expect(shown[1]?.summary.avoidedWarming2100).toEqual(whole.summary.avoidedWarming2100);
    expect(shown[1]?.summary.byFamily).toEqual(shown[0]?.summary.byFamily);
    deliver(later[1]!);
    expect(shown).toHaveLength(3);
    expect(shown[2]).toEqual(whole);
  });

  it('drops the breakdown of a result a newer one has replaced', () => {
    const { port, posted, answer, later, deliver } = recording();
    const client = modelClient(port);
    const shown: (RunResult | null)[] = [];
    client.onResult((r) => shown.push(r));
    client.setData(data);
    client.run(scenarioOf(0.2), DEFAULT_OPTIONS, CURRENT_YEAR);
    posted.forEach(answer);
    deliver(later[0]!);
    client.run(scenarioOf(0.5), DEFAULT_OPTIONS, CURRENT_YEAR);
    client.run(scenarioOf(1), DEFAULT_OPTIONS, CURRENT_YEAR);
    answer(posted[2]!);
    answer(posted[3]!);
    expect(shown).toHaveLength(3);
    deliver(later[1]!);
    expect(shown).toHaveLength(3);
    deliver(later[2]!);
    expect(shown[3]).toEqual(runScenario(data, scenarioOf(1), DEFAULT_OPTIONS, CURRENT_YEAR));
  });

  it('keeps a failed run null, with no breakdown to wait for', () => {
    expect(shownResult(null, null)).toBeNull();
    const out = respond(null, {
      kind: 'run',
      id: 3,
      scenario: BASE_SCENARIO,
      options: DEFAULT_OPTIONS,
      year: CURRENT_YEAR,
    });
    expect(out.later).toBeUndefined();
  });
  it('sends a deferred file alone once it is loaded', () => {
    const { port, posted } = recording();
    const client = modelClient(port);
    client.setData(data);
    client.setData(data);
    const waste = { ...data.waste };
    client.setData({ ...data, waste });
    expect(posted.map((r) => r.kind)).toEqual(['data', 'files']);
    expect(posted[1]).toEqual({ kind: 'files', files: { waste } });
    expect(changedFiles(data, data)).toEqual({});
  });

  it('answers on this thread too, and gives what each scenario avoids', async () => {
    const client = modelClient(inProcessPort());
    client.setData(data);
    let result: unknown = undefined;
    client.onResult((r) => (result = r));
    client.run({ ...BASE_SCENARIO, shift: 1 }, DEFAULT_OPTIONS, CURRENT_YEAR);
    const avoided = await client.avoided(
      { ...BASE_SCENARIO, shift: 1 },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    await settle();
    expect(result).not.toBeNull();
    expect(avoided?.['2100']).toBeGreaterThan(0);
  });

  it('answers null for a run it cannot make', () => {
    expect(
      respond(null, {
        kind: 'run',
        id: 1,
        scenario: BASE_SCENARIO,
        options: DEFAULT_OPTIONS,
        year: 2025,
      }),
    ).toEqual({ data: null, reply: { id: 1, result: null } });
  });
});

describe('the model server', () => {
  const data = loadFixtures();
  const run = (id: number, shift: number, kind: 'run' | 'avoided' = 'run'): Request => ({
    kind,
    id,
    scenario: scenarioOf(shift),
    options: DEFAULT_OPTIONS,
    year: CURRENT_YEAR,
  });
  /** A server whose deferred tasks wait in `tasks` until run, with what it sent. */
  const served = () => {
    const sent: Reply[] = [];
    const tasks: { task: () => void; cancelled: boolean }[] = [];
    const answer = serve(
      (r) => sent.push(r),
      (task) => {
        const t = { task, cancelled: false };
        tasks.push(t);
        return () => (t.cancelled = true);
      },
    );
    const flush = () => tasks.filter((t) => !t.cancelled).forEach((t) => t.task());
    return { sent, answer, flush };
  };
  const kinds = (sent: Reply[]) =>
    sent.map(
      (r) => `${r.id}:${'result' in r ? 'result' : 'breakdown' in r ? 'breakdown' : 'avoided'}`,
    );

  it("sends a run's result first, then its breakdown on a later task", () => {
    const { sent, answer, flush } = served();
    answer({ kind: 'data', data });
    answer(run(1, 0.5));
    expect(kinds(sent)).toEqual(['1:result']);
    flush();
    expect(kinds(sent)).toEqual(['1:result', '1:breakdown']);
  });

  it('drops a breakdown not yet started when a newer run comes', () => {
    const { sent, answer, flush } = served();
    answer({ kind: 'data', data });
    answer(run(1, 0.5));
    answer(run(2, 1));
    flush();
    expect(kinds(sent)).toEqual(['1:result', '2:result', '2:breakdown']);
  });

  it("keeps a breakdown while the panel's figures are asked for", () => {
    const { sent, answer, flush } = served();
    answer({ kind: 'data', data });
    answer(run(1, 0.5));
    answer(run(2, 1, 'avoided'));
    flush();
    expect(kinds(sent)).toEqual(['1:result', '2:avoided', '1:breakdown']);
  });
});

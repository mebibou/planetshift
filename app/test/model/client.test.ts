import { describe, expect, it } from 'vitest';
import type { ModelData } from '../../src/data/types';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { changedFiles, inProcessPort, modelClient, type Port } from '../../src/model/client';
import { respond, type Reply, type Request } from '../../src/model/engine';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

/** A port that keeps what is posted and answers only when told. */
const recording = () => {
  const posted: Request[] = [];
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
    if (out.reply) on(out.reply);
  };
  return { port, posted, answer };
};

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
    expect(shifts).toHaveLength(2);
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
      }).reply,
    ).toEqual({ id: 1, result: null });
  });
});

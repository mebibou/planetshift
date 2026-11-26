import { attempt } from '../app/attempt';
import type { ModelData } from '../data/types';
import type { Breakdown, FirstResult, Options, Scenario, ScenarioResult } from './api';
import { startScenario, type SplitRun } from './run';

/** The warming a scenario avoids, °C (median), in 2050 and 2100. */
export interface Avoided {
  '2050': number;
  '2100': number;
}

interface Job {
  id: number;
  scenario: Scenario;
  options: Options;
  year: number;
}

export type Request =
  | { kind: 'data'; data: ModelData }
  | { kind: 'files'; files: Partial<ModelData> }
  | ({ kind: 'run' } & Job)
  | ({ kind: 'avoided' } & Job);

/** A run's result, as the page receives it once its breakdown has come. */
export type RunResult = ScenarioResult;

/** A run's result comes first, then its breakdown in a reply of its own for the same id. */
export type Reply =
  | { id: number; result: FirstResult | null }
  | { id: number; breakdown: Breakdown | null }
  | { id: number; avoided: Avoided | null };

const runOn = (data: ModelData | null, job: Job): SplitRun | null =>
  data ? attempt(() => startScenario(data, job.scenario, job.options, job.year), null) : null;

const avoidedOf = (r: FirstResult | null | undefined): Avoided | null =>
  r
    ? { '2050': r.summary.avoidedWarming2050.median, '2100': r.summary.avoidedWarming2100.median }
    : null;

/** What a request answers: a reply now, and for a run, its breakdown to compute after. */
interface Answer {
  data: ModelData | null;
  reply: Reply | null;
  later?: () => Reply;
}

const runAnswer = (data: ModelData | null, id: number, run: SplitRun | null): Answer => ({
  data,
  reply: { id, result: run?.result ?? null },
  ...(run ? { later: () => ({ id, breakdown: attempt(run.breakdown, null) }) } : {}),
});

const STEPS: {
  [K in Request['kind']]: (data: ModelData | null, req: Extract<Request, { kind: K }>) => Answer;
} = {
  data: (_, req) => ({ data: req.data, reply: null }),
  files: (data, req) => ({ data: data && { ...data, ...req.files }, reply: null }),
  run: (data, req) => runAnswer(data, req.id, runOn(data, req)),
  avoided: (data, req) => ({
    data,
    reply: { id: req.id, avoided: avoidedOf(runOn(data, req)?.result) },
  }),
};

/** What the model holds after a request, and what it answers: runs on the data it was last sent. */
export const respond = (data: ModelData | null, req: Request): Answer =>
  (STEPS[req.kind] as (d: ModelData | null, r: Request) => Answer)(data, req);

/** Runs a task on a later task of the thread; returns a cancel. */
export type Defer = (task: () => void) => () => void;

const nextTask: Defer = (task) => {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
};

/**
 * Answers requests in turn, each run's breakdown on a later task so its result goes out first. A
 * newer run drops a breakdown not yet started: the page would not show it.
 */
export const serve = (send: (reply: Reply) => void, defer: Defer = nextTask) => {
  let data: ModelData | null = null;
  let cancel = () => {};
  return (req: Request) => {
    if (req.kind === 'run') {
      cancel();
    }
    const out = respond(data, req);
    data = out.data;
    if (out.reply) {
      send(out.reply);
    }
    const later = out.later;
    cancel = later ? defer(() => send(later())) : cancel;
  };
};

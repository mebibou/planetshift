import { attempt } from '../app/attempt';
import type { ModelData } from '../data/types';
import type { Options, Scenario, ScenarioResult } from './api';
import { runScenario } from './run';

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

export type Reply =
  { id: number; result: ScenarioResult | null } | { id: number; avoided: Avoided | null };

const runOn = (data: ModelData | null, job: Job): ScenarioResult | null =>
  data ? attempt(() => runScenario(data, job.scenario, job.options, job.year), null) : null;

const avoidedOf = (r: ScenarioResult | null): Avoided | null =>
  r && { '2050': r.summary.avoidedWarming2050.median, '2100': r.summary.avoidedWarming2100.median };

const STEPS: {
  [K in Request['kind']]: (
    data: ModelData | null,
    req: Extract<Request, { kind: K }>,
  ) => { data: ModelData | null; reply: Reply | null };
} = {
  data: (_, req) => ({ data: req.data, reply: null }),
  files: (data, req) => ({ data: data && { ...data, ...req.files }, reply: null }),
  run: (data, req) => ({ data, reply: { id: req.id, result: runOn(data, req) } }),
  avoided: (data, req) => ({ data, reply: { id: req.id, avoided: avoidedOf(runOn(data, req)) } }),
};

/** What the model holds after a request, and what it answers: runs on the data it was last sent. */
export const respond = (
  data: ModelData | null,
  req: Request,
): { data: ModelData | null; reply: Reply | null } =>
  (STEPS[req.kind] as (d: ModelData | null, r: Request) => ReturnType<typeof respond>)(data, req);

import type { ModelData } from '../data/types';
import {
  withBreakdown,
  type Breakdown,
  type FirstResult,
  type Options,
  type Scenario,
} from './api';
import type { Avoided, Reply, Request, RunResult } from './engine';

/** Where requests go and replies come from: a Worker, or the same thread. */
export interface Port {
  post: (req: Request) => void;
  listen: (on: (reply: Reply) => void) => void;
  close: () => void;
}

/**
 * The model on this thread, answering on a later task as a Worker would. Its code is loaded only
 * here, so the page's bundle holds none of it when Workers run it.
 */
export const inProcessPort = (): Port => {
  let on: (reply: Reply) => void = () => {};
  let queue = Promise.resolve();
  let serving: Promise<(req: Request) => void> | null = null;
  const answer = () =>
    (serving ??= import('./engine').then(({ serve }) =>
      serve((reply) => setTimeout(() => on(reply), 0)),
    ));
  return {
    post: (req) => {
      queue = queue.then(answer).then((f) => f(req));
    },
    listen: (f) => (on = f),
    close: () => (on = () => {}),
  };
};

/** The model in a Worker, so a run never blocks the page; this thread where Workers are missing. */
export const workerPort = (): Port => {
  const worker =
    typeof Worker === 'function'
      ? new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      : null;
  return worker
    ? {
        post: (req) => worker.postMessage(req),
        listen: (on) => worker.addEventListener('message', (e: MessageEvent<Reply>) => on(e.data)),
        close: () => worker.terminate(),
      }
    : inProcessPort();
};

/** The top-level files of `next` that are not those of `sent`: a deferred file once loaded. */
export const changedFiles = (sent: ModelData, next: ModelData): Partial<ModelData> =>
  Object.fromEntries(
    Object.entries(next).filter(([k, v]) => sent[k as keyof ModelData] !== v),
  ) as Partial<ModelData>;

export interface ModelClient {
  /** Sends the data, or only the files that changed since it was last sent. */
  setData: (data: ModelData) => void;
  /**
   * Runs the scenario; while a run is out, only the latest request waits to follow it. A result
   * shows with the breakdown before it until its own comes; one of an older result is dropped.
   */
  run: (scenario: Scenario, options: Options, year: number) => void;
  onResult: (on: (result: RunResult | null) => void) => void;
  /** The warming a scenario avoids, for the panel's figures. */
  avoided: (scenario: Scenario, options: Options, year: number) => Promise<Avoided | null>;
  close: () => void;
}

type Job = { scenario: Scenario; options: Options; year: number };

/**
 * What the page shows of a run: its result with its breakdown, or the latest breakdown kept until
 * its own comes; undefined while there is none to show yet, null for a failed run.
 */
export const shownResult = (
  result: FirstResult | null,
  breakdown: Breakdown | null,
): RunResult | null | undefined =>
  result && (breakdown ? withBreakdown(result, breakdown) : undefined);

export const modelClient = (port: Port): ModelClient => {
  let sent: ModelData | null = null;
  let next = 1;
  let running: number | null = null;
  let waiting: Job | null = null;
  let shown: { id: number; result: FirstResult | null } | null = null;
  let kept: Breakdown | null = null;
  let onResult: (r: RunResult | null) => void = () => {};
  const pending = new Map<number, (a: Avoided | null) => void>();
  const send = (job: Job) => {
    running = next++;
    port.post({ kind: 'run', id: running, ...job });
  };
  const show = (r: RunResult | null | undefined) => {
    if (r !== undefined) {
      onResult(r);
    }
  };
  const arrived = ({ id, result }: { id: number; result: FirstResult | null }) => {
    if (id === running) {
      running = null;
      shown = { id, result };
      show(shownResult(result, kept));
      if (waiting) {
        send(waiting);
      }
      waiting = null;
    }
  };
  const filled = ({ id, breakdown }: { id: number; breakdown: Breakdown | null }) => {
    if (shown && id === shown.id) {
      kept = breakdown ?? kept;
      show(shownResult(shown.result, breakdown));
    }
  };
  const answered = ({ id, avoided }: { id: number; avoided: Avoided | null }) => {
    pending.get(id)?.(avoided);
    pending.delete(id);
  };
  const received = (reply: Reply) =>
    'result' in reply ? arrived(reply) : 'breakdown' in reply ? filled(reply) : answered(reply);
  port.listen(received);
  return {
    setData: (data) => {
      if (data !== sent) {
        port.post(
          sent ? { kind: 'files', files: changedFiles(sent, data) } : { kind: 'data', data },
        );
      }
      sent = data;
    },
    run: (scenario, options, year) => {
      if (running === null) {
        send({ scenario, options, year });
      } else {
        waiting = { scenario, options, year };
      }
    },
    onResult: (on) => (onResult = on),
    avoided: (scenario, options, year) =>
      new Promise((resolve) => {
        const id = next++;
        pending.set(id, resolve);
        port.post({ kind: 'avoided', id, scenario, options, year });
      }),
    close: () => port.close(),
  };
};

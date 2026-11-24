import type { ModelData } from '../data/types';
import type { Options, Scenario } from './api';
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
  let data: ModelData | null = null;
  let on: (reply: Reply) => void = () => {};
  let queue = Promise.resolve();
  return {
    post: (req) => {
      queue = queue.then(() =>
        import('./engine').then(({ respond }) => {
          const out = respond(data, req);
          data = out.data;
          const reply = out.reply;
          if (reply) {
            setTimeout(() => on(reply), 0);
          }
        }),
      );
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
  /** Runs the scenario; while a run is out, only the latest request waits to follow it. */
  run: (scenario: Scenario, options: Options, year: number) => void;
  onResult: (on: (result: RunResult | null) => void) => void;
  /** The warming a scenario avoids, for the panel's figures. */
  avoided: (scenario: Scenario, options: Options, year: number) => Promise<Avoided | null>;
  close: () => void;
}

type Job = { scenario: Scenario; options: Options; year: number };

export const modelClient = (port: Port): ModelClient => {
  let sent: ModelData | null = null;
  let next = 1;
  let running: number | null = null;
  let waiting: Job | null = null;
  let onResult: (r: RunResult | null) => void = () => {};
  const pending = new Map<number, (a: Avoided | null) => void>();
  const send = (job: Job) => {
    running = next++;
    port.post({ kind: 'run', id: running, ...job });
  };
  const received = (reply: Reply) => {
    if ('result' in reply && reply.id === running) {
      running = null;
      onResult(reply.result);
      if (waiting) {
        send(waiting);
      }
      waiting = null;
    } else if ('avoided' in reply) {
      pending.get(reply.id)?.(reply.avoided);
      pending.delete(reply.id);
    }
  };
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

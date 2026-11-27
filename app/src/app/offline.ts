/**
 * The service worker's side in the page (its code: scripts/sw-template.js). A new build's worker
 * waits until the reader reloads from the prompt, or until every tab of the old one is closed, so
 * a page never runs one build's code on another's data.
 */

export type UpdateState = 'none' | 'waiting' | 'dismissed' | 'reloading';
export type UpdateEvent = 'found' | 'dismiss' | 'reload';

const NEXT: Record<UpdateState, Partial<Record<UpdateEvent, UpdateState>>> = {
  none: { found: 'waiting' },
  waiting: { dismiss: 'dismissed', reload: 'reloading' },
  dismissed: { found: 'waiting' },
  reloading: {},
};

export const nextUpdate = (state: UpdateState, event: UpdateEvent): UpdateState =>
  NEXT[state][event] ?? state;

type Worker = Pick<ServiceWorker, 'postMessage' | 'state' | 'addEventListener'>;
type Registration = Pick<ServiceWorkerRegistration, 'waiting' | 'addEventListener' | 'update'> & {
  installing: Worker | null;
};
export type Container = Pick<
  ServiceWorkerContainer,
  'controller' | 'addEventListener' | 'register' | 'ready'
>;

export interface Updates {
  state: () => UpdateState;
  subscribe: (listener: () => void) => () => void;
  found: (worker: Worker) => void;
  dismiss: () => void;
  reload: () => void;
}

/** The update prompt's state; `reload` hands control to the waiting worker, then reloads. */
export const createUpdates = (container: () => Container | null, reload: () => void): Updates => {
  let state: UpdateState = 'none';
  let waiting: Worker | null = null;
  const listeners = new Set<() => void>();
  const send = (event: UpdateEvent) => {
    state = nextUpdate(state, event);
    listeners.forEach((l) => l());
  };
  return {
    state: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    found: (worker) => {
      waiting = worker;
      send('found');
    },
    dismiss: () => send('dismiss'),
    reload: () => {
      send('reload');
      container()?.addEventListener('controllerchange', reload, { once: true });
      waiting?.postMessage({ type: 'skip-waiting' });
    },
  };
};

/** Calls `found` with a new build's worker once it is installed and waiting behind this page's. */
export const watchRegistration = (
  registration: Registration,
  container: Container,
  found: (worker: Worker) => void,
): void => {
  if (registration.waiting && container.controller) {
    found(registration.waiting);
  }
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && container.controller) {
        found(worker);
      }
    });
  });
};

/**
 * Registers the worker at the site's root. A first visit's page is handed to it only when both
 * come from the same build, so the data it fetches later comes from that build's cache.
 */
export const registerOffline = async (
  container: Container,
  script: string,
  version: string,
  updates: Updates,
): Promise<void> => {
  const registration = await container.register(script);
  watchRegistration(registration as unknown as Registration, container, updates.found);
  (await container.ready).active?.postMessage({ type: 'claim', version });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => undefined);
    }
  });
};

/** The build a page comes from, which scripts/sw.mjs names in it; none before the site is built. */
export const buildOf = (doc: Document): string | null =>
  doc.querySelector('meta[name="planetshift:build"]')?.getAttribute('content') ?? null;

export const serviceWorkers = (): Container | null =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : null;

export const UPDATES = createUpdates(serviceWorkers, () => location.reload());

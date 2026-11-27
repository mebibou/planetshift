import { describe, expect, it, vi } from 'vitest';
import {
  createUpdates,
  nextUpdate,
  watchRegistration,
  type Container,
  type UpdateEvent,
  type UpdateState,
} from '../../src/app/offline';

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing';
  postMessage = vi.fn();
  install() {
    this.state = 'installed';
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = vi.fn(() => Promise.resolve());
  found(worker: FakeWorker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
}

const container = (controlled: boolean) =>
  Object.assign(new EventTarget(), {
    controller: controlled ? {} : null,
  }) as unknown as Container & EventTarget;

const watch = (registration: FakeRegistration, controlled: boolean) => {
  const found = vi.fn();
  watchRegistration(registration as never, container(controlled), found);
  return found;
};

describe('the update prompt', () => {
  it.each<[UpdateState, UpdateEvent, UpdateState]>([
    ['none', 'found', 'waiting'],
    ['waiting', 'dismiss', 'dismissed'],
    ['waiting', 'reload', 'reloading'],
    ['dismissed', 'found', 'waiting'],
    ['none', 'reload', 'none'],
    ['none', 'dismiss', 'none'],
    ['reloading', 'found', 'reloading'],
    ['reloading', 'dismiss', 'reloading'],
  ])('goes from %s on %s to %s', (state, event, next) => {
    expect(nextUpdate(state, event)).toBe(next);
  });

  it('hands control to the waiting worker and reloads only once it has taken over', () => {
    const workers = container(true);
    const reload = vi.fn();
    const updates = createUpdates(() => workers, reload);
    const listener = vi.fn();
    updates.subscribe(listener);
    const worker = new FakeWorker();
    updates.found(worker);
    expect(updates.state()).toBe('waiting');
    expect(listener).toHaveBeenCalledTimes(1);
    updates.reload();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'skip-waiting' });
    expect(reload).not.toHaveBeenCalled();
    workers.dispatchEvent(new Event('controllerchange'));
    workers.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stays dismissed until another build arrives', () => {
    const updates = createUpdates(() => null, vi.fn());
    updates.found(new FakeWorker());
    updates.dismiss();
    expect(updates.state()).toBe('dismissed');
    updates.found(new FakeWorker());
    expect(updates.state()).toBe('waiting');
  });

  it('stops telling a listener that unsubscribed', () => {
    const updates = createUpdates(() => null, vi.fn());
    const listener = vi.fn();
    updates.subscribe(listener)();
    updates.found(new FakeWorker());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('watching the registration', () => {
  it('finds a worker already waiting behind the page', () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    expect(watch(registration, true)).toHaveBeenCalledWith(registration.waiting);
  });

  it('finds a new worker once it is installed', () => {
    const registration = new FakeRegistration();
    const found = watch(registration, true);
    const worker = new FakeWorker();
    registration.found(worker);
    expect(found).not.toHaveBeenCalled();
    worker.install();
    expect(found).toHaveBeenCalledWith(worker);
  });

  it("offers nothing on a first visit, when the worker is the page's first", () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    const found = watch(registration, false);
    const worker = new FakeWorker();
    registration.found(worker);
    worker.install();
    expect(found).not.toHaveBeenCalled();
  });
});

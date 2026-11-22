export interface Store<S> {
  get: () => S;
  update: (change: (s: S) => S) => void;
  subscribe: (listener: (s: S, previous: S) => void) => () => void;
}

export const createStore = <S>(initial: S): Store<S> => {
  let state = initial;
  const listeners = new Set<(s: S, previous: S) => void>();
  return {
    get: () => state,
    update: (change) => {
      const previous = state;
      state = change(state);
      if (state !== previous) listeners.forEach((l) => l(state, previous));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

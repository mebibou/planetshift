/** Where each key moves from tab `i` of `n`, wrapping around. */
const MOVES: ReadonlyMap<string, (i: number, n: number) => number> = new Map([
  ['ArrowRight', (i: number, n: number) => (i + 1) % n],
  ['ArrowLeft', (i: number, n: number) => (i - 1 + n) % n],
  ['Home', () => 0],
  ['End', (_: number, n: number) => n - 1],
]);

/** The tab a key moves to from `current`, wrapping around; null for any other key. */
export const tabAfter = <V>(tabs: readonly V[], current: V, key: string): V | null => {
  const move = MOVES.get(key);
  return move && tabs.length > 0 ? (tabs[move(tabs.indexOf(current), tabs.length)] ?? null) : null;
};

/** The tab pattern's keys on one tab: selects the tab the key moves to and focuses it. */
export const tabKeys =
  <V>(tabs: readonly V[], current: V, select: (tab: V) => void, idOf: (tab: V) => string) =>
  (e: Event): void => {
    const target = tabAfter(tabs, current, (e as KeyboardEvent).key);
    if (target !== null) {
      e.preventDefault();
      select(target);
      document.getElementById(idOf(target))?.focus();
    }
  };

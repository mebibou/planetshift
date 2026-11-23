/** The tab a key moves to from `current`, wrapping around; null for any other key. */
export const tabAfter = <V>(tabs: readonly V[], current: V, key: string): V | null => {
  const i = tabs.indexOf(current);
  const n = tabs.length;
  const target =
    key === 'ArrowRight'
      ? (i + 1) % n
      : key === 'ArrowLeft'
        ? (i - 1 + n) % n
        : key === 'Home'
          ? 0
          : key === 'End'
            ? n - 1
            : null;
  return target === null || n === 0 ? null : (tabs[target] ?? null);
};

/** The tab pattern's keys on one tab: selects the tab the key moves to and focuses it. */
export const tabKeys =
  <V>(tabs: readonly V[], current: V, select: (tab: V) => void, idOf: (tab: V) => string) =>
  (e: Event): void => {
    const target = tabAfter(tabs, current, (e as KeyboardEvent).key);
    if (target === null) return;
    e.preventDefault();
    select(target);
    document.getElementById(idOf(target))?.focus();
  };

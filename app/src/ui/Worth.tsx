import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { worthText } from '../controls/panelModel';
import type { T } from '../i18n/i18n';
import type { Options, Scenario } from '../model/api';
import type { Horizon } from '../app/url';
import { worthCache, worthShown, type Worth, type WorthId } from '../app/worth';

export interface WorthState {
  values: ReadonlyMap<WorthId, Worth>;
  horizon: Horizon;
  t: T;
  locale: string;
}

export const WorthContext = createContext<WorthState | null>(null);

/**
 * What each lever, family and food is worth on its own, computed in the background one run at a
 * time; a new cache once `data` changes, as a deferred file arriving changes the figures.
 * `current` is false while the figures shown are still those of the previous data.
 */
export const useWorth = (
  run: (s: Scenario, o: Options) => Promise<Worth | null>,
  scenario: Scenario,
  options: Options,
  data: unknown,
): { values: ReadonlyMap<WorthId, Worth>; current: boolean } => {
  const [tagged, setTagged] = useState<{ data: unknown; values: ReadonlyMap<WorthId, Worth> }>(
    () => ({ data, values: new Map() }),
  );
  const cache = useMemo(
    () => worthCache({ run, onChange: (values) => setTagged({ data, values }) }),
    // `run` reads the latest data itself; the cache starts anew only when the data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  useEffect(() => () => cache.stop(), [cache]);
  useEffect(() => cache.request(scenario, options), [cache, scenario, options]);
  return { values: tagged.values, current: tagged.data === data };
};

interface Shown {
  text: string;
  sentence: string;
  share: string;
  added: boolean;
}

const PILL =
  'worth flex-none whitespace-nowrap rounded-full border border-rule bg-[linear-gradient(to_right,var(--accent-soft)_var(--share,0%),var(--surface)_var(--share,0%))] px-1.5 py-px text-[0.75rem] font-bold tabular-nums';

/** What a figure says at the horizon, or null while it is not known. */
const shownOf = (ctx: WorthState | null, id: WorthId): Shown | null => {
  const shown = ctx && worthShown(ctx.values, id, ctx.horizon);
  const text = shown && ctx ? worthText(ctx.locale, shown.change) : '';
  return shown && ctx
    ? {
        text,
        sentence: ctx.t('worth.title', { value: text, year: ctx.horizon }),
        share: `${(shown.share * 100).toFixed(0)}%`,
        added: shown.change > 0,
      }
    : null;
};

/** What a lever, a family or a food is worth at the horizon; hidden while not known. */
export const WorthPill = ({ id }: { id: WorthId }) => {
  const shown = shownOf(useContext(WorthContext), id);
  return shown ? (
    <span
      className={`${PILL} ${shown.added ? 'is-added text-danger' : 'text-ink'}`}
      data-worth={id}
      title={shown.sentence}
      style={{ '--share': shown.share } as CSSProperties}
    >
      <span aria-hidden="true">{shown.text}</span>
      <span className="visually-hidden">{shown.sentence}</span>
    </span>
  ) : (
    <span className={PILL} data-worth={id} hidden />
  );
};

import { h } from '../app/dom';
import type { Worth, WorthId } from '../app/worth';
import { worthShown } from '../app/worth';
import type { Horizon } from '../app/url';
import type { T } from '../i18n/i18n';
import { formatTemperature } from '../i18n/format';

export interface Group {
  /** The disclosure, or, with a quick pair, the row holding both. */
  el: HTMLElement;
  /** The one line under the title saying what is set, shown open or closed. */
  setMeta: (text: string) => void;
}

/**
 * A collapsible group of the panel: a native disclosure, so the keyboard and screen readers
 * open and close it; its summary holds the title, what is set, and what it is worth. A quick
 * pair sits beside the summary, outside it, so its buttons neither open nor close the group.
 */
export const group = (
  spec: { id: string; title: string; open?: boolean; worth?: WorthId; quick?: HTMLElement },
  ...children: (Node | null)[]
): Group => {
  const meta = h('span', { class: 'group-meta' });
  const el = h(
    'details',
    { class: 'group', 'data-group': spec.id, open: spec.open ?? false },
    h(
      'summary',
      {},
      h('span', { class: 'group-head' }, h('span', { class: 'group-title' }, spec.title), meta),
      spec.worth && spec.quick
        ? h('span', { class: 'group-side' }, worthPill(spec.worth))
        : spec.worth
          ? worthPill(spec.worth)
          : null,
    ),
    h('div', { class: 'group-body' }, ...children),
  );
  return {
    el: spec.quick ? h('div', { class: 'group-wrap' }, el, spec.quick) : el,
    setMeta: (text) => (meta.textContent = text),
  };
};

/** A placeholder for what a lever, a food or a group is worth, filled in by `paintWorth`. */
export const worthPill = (id: WorthId): HTMLElement =>
  h('span', { class: 'worth', 'data-worth': id, hidden: true });

/** −0.012 °C, or < 0.001 °C either way for a change too small to show. */
export const worthText = (locale: string, change: number): string =>
  Math.abs(change) < 0.0005
    ? `< ${formatTemperature(locale, 0.001, 3)}`
    : formatTemperature(locale, change, Math.abs(change) < 0.01 ? 3 : 2, true);

/** Fills every figure under `root` with its value at the horizon, hiding those not yet known. */
export const paintWorth = (
  root: ParentNode,
  values: ReadonlyMap<WorthId, Worth>,
  horizon: Horizon,
  t: T,
  locale: string,
): void =>
  root.querySelectorAll<HTMLElement>('[data-worth]').forEach((el) => {
    const shown = worthShown(values, el.dataset.worth ?? '', horizon);
    el.hidden = shown === null;
    if (!shown) return;
    const text = worthText(locale, shown.change);
    const sentence = t('worth.title', { value: text, year: horizon });
    el.replaceChildren(
      h('span', { 'aria-hidden': 'true' }, text),
      h('span', { class: 'visually-hidden' }, sentence),
    );
    el.classList.toggle('is-added', shown.change > 0);
    el.style.setProperty('--share', `${(shown.share * 100).toFixed(0)}%`);
    el.title = sentence;
  });

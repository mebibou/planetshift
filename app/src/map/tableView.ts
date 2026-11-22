import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatPercent } from '../i18n/format';
import { measureOf, type LayerSpec } from './layers';
import { sourceInText } from './sources';
import {
  columnsOf,
  defaultSort,
  filterRows,
  nextSort,
  PAGE_SIZE,
  pageOf,
  sortRows,
  type Column,
  type Sort,
  type TableRow,
} from './table';
import { formatMeasure } from './tooltip';

export interface TableView {
  el: HTMLElement;
  update: (rows: TableRow[], spec: LayerSpec, caption: string) => void;
}

const HEADS: Record<Column, string> = {
  name: 'map.country',
  before: 'map.tooltip.before',
  after: 'map.tooltip.after',
  change: 'map.tooltip.change',
  tier: 'map.tooltip.tier',
};

/** Every country of the layer: sortable columns, a search by name in both languages, pages of 20. */
export const tableView = (t: T, locale: string): TableView => {
  let state: { query: string; sort: Sort | null; page: number; layer: string } = {
    query: '',
    sort: null,
    page: 1,
    layer: '',
  };
  let last: { rows: TableRow[]; spec: LayerSpec; caption: string } | null = null;
  const search = h('input', {
    type: 'search',
    id: 'map-table-search',
    class: 'table-search-input',
    autocomplete: 'off',
    spellcheck: 'false',
    oninput: (e: Event) => {
      state = { ...state, query: (e.target as HTMLInputElement).value, page: 1 };
      render();
    },
  });
  const count = h('p', { class: 'table-count', role: 'status', 'aria-live': 'polite' });
  const captionEl = h('caption', { class: 'visually-hidden' });
  const headRow = h('tr');
  const body = h('tbody');
  const prev = h(
    'button',
    { type: 'button', class: 'pager-button pager-prev', onclick: () => go(-1) },
    h('span', { 'aria-hidden': 'true' }, '‹ '),
    t('map.pager.previous'),
  );
  const next = h(
    'button',
    { type: 'button', class: 'pager-button pager-next', onclick: () => go(1) },
    t('map.pager.next'),
    h('span', { 'aria-hidden': 'true' }, ' ›'),
  );
  const position = h('span', { class: 'pager-position' });
  const pager = h(
    'nav',
    { class: 'pager', 'aria-label': t('map.pager.label') },
    prev,
    position,
    next,
  );
  const go = (step: number) => {
    state = { ...state, page: state.page + step };
    render();
  };
  const sortBy = (column: Column) => {
    if (!last) return;
    state = { ...state, sort: nextSort(state.sort ?? defaultSort(last.spec), column), page: 1 };
    render();
    headRow.querySelector<HTMLButtonElement>(`[data-column="${column}"] button`)?.focus();
  };
  const cell = (row: TableRow, column: Column, spec: LayerSpec): HTMLElement => {
    if (column === 'name') return h('th', { scope: 'row' }, row.name);
    if (column === 'tier') {
      const link = row.source ? sourceInText(row.source) : null;
      return h(
        'td',
        { class: 'tier-cell' },
        row.tier === null ? '–' : t(`tiers.${row.tier}`),
        link
          ? h(
              'span',
              { class: 'tier-source' },
              link.url
                ? h('a', { href: link.url, target: '_blank', rel: 'noopener' }, link.label)
                : link.label,
            )
          : null,
      );
    }
    const measure = formatMeasure(locale, measureOf(spec));
    const text =
      column === 'change'
        ? row.change === null
          ? '–'
          : formatPercent(locale, row.change, 1, true)
        : measure(row[column]);
    return h('td', { class: 'num' }, text);
  };
  const render = () => {
    if (!last) return;
    const { rows, spec, caption } = last;
    const sort = state.sort ?? defaultSort(spec);
    const columns = columnsOf(spec);
    captionEl.textContent = caption;
    headRow.replaceChildren(
      ...columns.map((column) =>
        h(
          'th',
          {
            scope: 'col',
            'data-column': column,
            class: column === 'name' || column === 'tier' ? '' : 'num',
            'aria-sort': sort.column === column ? sort.direction : 'none',
          },
          h(
            'button',
            { type: 'button', class: 'sort-button', onclick: () => sortBy(column) },
            t(HEADS[column]),
            h('span', { class: 'sort-mark', 'aria-hidden': 'true' }),
          ),
        ),
      ),
    );
    const found = filterRows(rows, state.query);
    const page = pageOf(sortRows(found, sort, locale), state.page, PAGE_SIZE);
    state = { ...state, page: page.page };
    body.replaceChildren(
      ...page.rows.map((row) =>
        h('tr', { 'data-iso3': row.iso3 }, ...columns.map((c) => cell(row, c, spec))),
      ),
    );
    count.textContent = page.total
      ? t('map.pager.showing', { from: page.from, to: page.to, total: page.total })
      : t('map.pager.none', { query: state.query.trim() });
    position.textContent = t('map.pager.page', { page: page.page, pages: page.pages });
    prev.disabled = page.page <= 1;
    next.disabled = page.page >= page.pages;
    pager.hidden = page.pages <= 1;
  };
  const el = h(
    'div',
    { class: 'table-view' },
    h(
      'div',
      { class: 'table-tools' },
      h(
        'div',
        { class: 'field table-search' },
        h('label', { for: 'map-table-search' }, t('map.search')),
        search,
      ),
      count,
    ),
    h(
      'div',
      {
        class: 'table-scroll',
        role: 'region',
        tabindex: '0',
        'aria-label': t('map.tableLabel'),
      },
      h('table', { class: 'data-table' }, captionEl, h('thead', {}, headRow), body),
    ),
    pager,
  );
  return {
    el,
    update: (rows, spec, caption) => {
      if (spec.layer !== state.layer) state = { ...state, sort: null, page: 1, layer: spec.layer };
      last = { rows, spec, caption };
      render();
    },
  };
};

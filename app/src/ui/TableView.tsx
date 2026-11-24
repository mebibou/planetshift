import { useState } from 'react';
import { formatPercent } from '../i18n/format';
import type { T } from '../i18n/i18n';
import { measureOf, type LayerSpec } from '../map/layers';
import { sourceInText } from '../map/sources';
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
} from '../map/table';
import { formatMeasure } from '../map/tooltip';
import { FIELD, FIELD_LABEL, OUTLINE_BUTTON } from './classes';

export interface TableViewProps {
  t: T;
  locale: string;
  rows: TableRow[];
  spec: LayerSpec;
  caption: string;
}

const HEADS: Record<Column, string> = {
  name: 'map.country',
  before: 'map.tooltip.before',
  after: 'map.tooltip.after',
  change: 'map.tooltip.change',
  tier: 'map.tooltip.tier',
};

const CELL = 'border-b border-rule px-2 py-1.5 align-top';
const TEXT_CELL = `${CELL} text-left`;
const NUM_CELL = `num ${CELL} text-right whitespace-nowrap`;
const PAGER_BUTTON = `pager-button ${OUTLINE_BUTTON} enabled:hover:bg-accent-soft disabled:cursor-default disabled:text-muted disabled:opacity-60`;
const SORT_MARK =
  "sort-mark after:font-normal after:text-muted after:content-['↕'] [[aria-sort=ascending]_&]:after:text-ink [[aria-sort=ascending]_&]:after:content-['↑'] [[aria-sort=descending]_&]:after:text-ink [[aria-sort=descending]_&]:after:content-['↓']";

const TierCell = ({ t, row }: { t: T; row: TableRow }) => {
  const link = row.source ? sourceInText(row.source) : null;
  return (
    <td className={`tier-cell ${TEXT_CELL} min-w-[13em]`}>
      {row.tier === null ? '–' : t(`tiers.${row.tier}`)}
      {link && (
        <span className="tier-source block text-[0.78rem] text-muted">
          {link.url ? (
            <a href={link.url} target="_blank" rel="noopener">
              {link.label}
            </a>
          ) : (
            link.label
          )}
        </span>
      )}
    </td>
  );
};

const numberText = (
  locale: string,
  row: TableRow,
  column: 'before' | 'after' | 'change',
  spec: LayerSpec,
) =>
  column !== 'change'
    ? formatMeasure(locale, measureOf(spec))(row[column])
    : row.change === null
      ? '–'
      : formatPercent(locale, row.change, 1, true);

const Cell = ({
  t,
  locale,
  row,
  column,
  spec,
}: {
  t: T;
  locale: string;
  row: TableRow;
  column: Column;
  spec: LayerSpec;
}) =>
  column === 'name' ? (
    <th scope="row" className={`${TEXT_CELL} font-normal`}>
      {row.name}
    </th>
  ) : column === 'tier' ? (
    <TierCell t={t} row={row} />
  ) : (
    <td className={NUM_CELL}>{numberText(locale, row, column, spec)}</td>
  );

const Pager = ({
  t,
  page,
  pages,
  go,
}: {
  t: T;
  page: number;
  pages: number;
  go: (step: number) => void;
}) => (
  <nav
    className="pager mt-3 flex items-center justify-center gap-3"
    aria-label={t('map.pager.label')}
    hidden={pages <= 1}
  >
    <button
      type="button"
      className={`${PAGER_BUTTON} pager-prev`}
      disabled={page <= 1}
      onClick={() => go(-1)}
    >
      <span aria-hidden="true">‹ </span>
      {t('map.pager.previous')}
    </button>
    <span className="pager-position text-[0.88rem] tabular-nums">
      {t('map.pager.page', { page, pages })}
    </span>
    <button
      type="button"
      className={`${PAGER_BUTTON} pager-next`}
      disabled={page >= pages}
      onClick={() => go(1)}
    >
      {t('map.pager.next')}
      <span aria-hidden="true"> ›</span>
    </button>
  </nav>
);

/**
 * Every country of the layer: sortable columns, a search by name in both languages, pages of 20.
 * Keyed by the layer where it is used, so a new layer starts from its own default order.
 */
export const TableView = ({ t, locale, rows, spec, caption }: TableViewProps) => {
  const [query, setQuery] = useState('');
  const [chosen, setSort] = useState<Sort | null>(null);
  const [wanted, setPage] = useState(1);
  const sort = chosen ?? defaultSort(spec);
  const columns = columnsOf(spec);
  const page = pageOf(sortRows(filterRows(rows, query), sort, locale), wanted, PAGE_SIZE);
  return (
    <div className="table-view">
      <div className="table-tools mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className={`${FIELD} table-search max-w-[280px] flex-[1_1_220px]`}>
          <label htmlFor="map-table-search" className={FIELD_LABEL}>
            {t('map.search')}
          </label>
          <input
            type="search"
            id="map-table-search"
            className="table-search-input min-h-9 w-[min(100%,280px)] rounded-lg border border-rule bg-surface px-2.5 py-1.5"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <p
          className="table-count m-0 text-[0.85rem] text-muted tabular-nums"
          role="status"
          aria-live="polite"
        >
          {page.total
            ? t('map.pager.showing', { from: page.from, to: page.to, total: page.total })
            : t('map.pager.none', { query: query.trim() })}
        </p>
      </div>
      <div
        className="table-scroll max-w-full overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-label={t('map.tableLabel')}
      >
        <table className="data-table w-full border-collapse text-[0.88rem] tabular-nums">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  data-column={column}
                  className={`border-b-2 border-rule p-0 align-top whitespace-nowrap ${column === 'name' || column === 'tier' ? 'text-left' : 'num text-right'}`}
                  aria-sort={sort.column === column ? sort.direction : 'none'}
                >
                  <button
                    type="button"
                    className={`sort-button inline-flex w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-2 text-[0.85rem] font-bold [text-align:inherit] ${column === 'name' || column === 'tier' ? '' : 'justify-end'}`}
                    onClick={() => {
                      setSort(nextSort(sort, column));
                      setPage(1);
                    }}
                  >
                    {t(HEADS[column])}
                    <span className={SORT_MARK} aria-hidden="true" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.iso3} data-iso3={row.iso3}>
                {columns.map((c) => (
                  <Cell key={c} t={t} locale={locale} row={row} column={c} spec={spec} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager t={t} page={page.page} pages={page.pages} go={(step) => setPage(page.page + step)} />
    </div>
  );
};

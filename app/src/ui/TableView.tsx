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

const TierCell = ({ t, row }: { t: T; row: TableRow }) => {
  const link = row.source ? sourceInText(row.source) : null;
  return (
    <td className="tier-cell">
      {row.tier === null ? '–' : t(`tiers.${row.tier}`)}
      {link && (
        <span className="tier-source">
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
    <th scope="row">{row.name}</th>
  ) : column === 'tier' ? (
    <TierCell t={t} row={row} />
  ) : (
    <td className="num">{numberText(locale, row, column, spec)}</td>
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
  <nav className="pager" aria-label={t('map.pager.label')} hidden={pages <= 1}>
    <button
      type="button"
      className="pager-button pager-prev"
      disabled={page <= 1}
      onClick={() => go(-1)}
    >
      <span aria-hidden="true">‹ </span>
      {t('map.pager.previous')}
    </button>
    <span className="pager-position">{t('map.pager.page', { page, pages })}</span>
    <button
      type="button"
      className="pager-button pager-next"
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
      <div className="table-tools">
        <div className="field table-search">
          <label htmlFor="map-table-search">{t('map.search')}</label>
          <input
            type="search"
            id="map-table-search"
            className="table-search-input"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <p className="table-count" role="status" aria-live="polite">
          {page.total
            ? t('map.pager.showing', { from: page.from, to: page.to, total: page.total })
            : t('map.pager.none', { query: query.trim() })}
        </p>
      </div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label={t('map.tableLabel')}>
        <table className="data-table">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  data-column={column}
                  className={column === 'name' || column === 'tier' ? '' : 'num'}
                  aria-sort={sort.column === column ? sort.direction : 'none'}
                >
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => {
                      setSort(nextSort(sort, column));
                      setPage(1);
                    }}
                  >
                    {t(HEADS[column])}
                    <span className="sort-mark" aria-hidden="true" />
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

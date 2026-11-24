import { useMemo } from 'react';
import {
  cellText,
  futuresAt,
  levelsText,
  readImpacts,
  rowInfo,
  type Futures,
  type GroupReading,
  type RowReading,
} from '../app/impacts';
import type { Horizon } from '../app/url';
import type { Impacts as ImpactsData } from '../data/types';
import { formatTemperature } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { CARD, FOLD, FOLD_SUMMARY, HINT_TEXT } from './classes';
import { Icon, type IconName } from './Icon';
import { Info } from './Info';

export interface ImpactsProps {
  t: T;
  locale: string;
  impacts: ImpactsData;
  result: ScenarioResult | null;
  horizon: Horizon;
}

const CELL = 'px-2 py-1.5 align-top';
const VALUE = `impact-value ${CELL} text-right font-bold tabular-nums`;

const methodHref = (): string => {
  const query = new URLSearchParams(window.location.search);
  query.set('view', 'methodology');
  return `?${query}#method-impacts`;
};

type GroupReadingRow = { group: GroupReading['group']; r: RowReading };

const Row = ({ t, locale, group, r }: { t: T; locale: string } & GroupReadingRow) => {
  const label = t(`impacts.rows.${r.row.id}.label`);
  return (
    <tr className="impact-row border-t border-rule" data-row={r.row.id}>
      <th scope="row" className={`${CELL} text-left font-normal`}>
        <span className="inline-flex items-start gap-1.5">
          <span>{label}</span>
          <Info label={t('impacts.info', { name: label })} text={rowInfo(t, locale, group, r)} />
        </span>
      </th>
      {r.cells.map((c, i) => (
        <td key={i} className={VALUE}>
          {cellText(t, locale, r.row.unit, c)}
        </td>
      ))}
    </tr>
  );
};

const Group = ({ t, locale, reading }: { t: T; locale: string; reading: GroupReading }) => {
  const { group } = reading;
  return (
    <tbody className="impact-group" data-group={group.id}>
      <tr>
        <th
          scope="colgroup"
          colSpan={3}
          className="impact-source bg-surface-2 px-2 py-1.5 text-left"
        >
          <a href={group.url} className="text-[0.88rem] font-bold text-ink">
            {t(`impacts.groups.${group.id}.title`)}
          </a>
          <span className="impact-levels block text-[0.78rem] font-normal text-muted">
            {t(group.jointly ? 'impacts.levelsOnly' : 'impacts.levels', {
              levels: levelsText(locale, group.levels),
            })}
          </span>
        </th>
      </tr>
      {reading.rows.map((r) => (
        <Row key={r.row.id} t={t} locale={locale} group={group} r={r} />
      ))}
    </tbody>
  );
};

const Head = ({ t, locale, futures }: { t: T; locale: string; futures: Futures }) => (
  <thead>
    <tr className="align-bottom text-[0.8rem] text-muted">
      <th scope="col" className={`${CELL} text-left font-normal`}>
        {t('impacts.impact')}
      </th>
      {(['baseline', 'scenario'] as const).map((k) => (
        <th key={k} scope="col" className={`impact-future ${CELL} w-[24%] text-right font-normal`}>
          {t(`impacts.${k}`)}
          <span className="block text-[0.95rem] font-bold text-ink tabular-nums">
            {formatTemperature(locale, futures[k], 1)}
          </span>
        </th>
      ))}
    </tr>
  </thead>
);

/** Both futures' warming, or one figure when the levers change nothing at this precision. */
const futuresText = (t: T, locale: string, futures: Futures): string => {
  const without = formatTemperature(locale, futures.baseline, 1);
  const withLevers = formatTemperature(locale, futures.scenario, 1);
  return without === withLevers
    ? t('impacts.futureSame', { without })
    : t('impacts.futures', { without, with: withLevers });
};

/** The impacts people relate to most, the same at every horizon, each with its icon. */
const HEADLINE: Record<string, IconName> = {
  extinction: 'species',
  coral: 'coral',
  arctic: 'ice',
  heatwave: 'heatwave',
  hot50: 'heat',
  drought10: 'drought',
};

/** Whether both futures have a figure: a value, or at least the top level's. */
const figured = (r: RowReading): boolean =>
  r.cells.every((c) => c.kind === 'value' || c.kind === 'atLeast');

/** The headline rows in their order, those a future lies beyond what was assessed last. */
export const headlineRows = (groups: readonly GroupReading[]): GroupReadingRow[] => {
  const rows = groups.flatMap(({ group, rows }) => rows.map((r) => ({ group, r })));
  const ordered = Object.keys(HEADLINE).flatMap((id) => rows.filter((x) => x.r.row.id === id));
  return [...ordered.filter((x) => figured(x.r)), ...ordered.filter((x) => !figured(x.r))];
};

/** Without → with, each a figure or the level its source stops at. */
const TileFigure = ({ t, locale, r }: { t: T; locale: string; r: RowReading }) => {
  const [without, withLevers] = r.cells.map((c) => cellText(t, locale, r.row.unit, c));
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
      {without !== withLevers && (
        <>
          <span className="text-[1.05rem] text-muted">{without}</span>
          <span className="text-muted" aria-hidden="true">
            →
          </span>
        </>
      )}
      <span
        className={
          figured(r)
            ? 'text-[1.35rem] leading-tight font-bold text-ink'
            : 'text-[0.95rem] leading-tight text-muted'
        }
      >
        {withLevers}
      </span>
    </span>
  );
};

const Tile = ({ t, locale, group, r }: { t: T; locale: string } & GroupReadingRow) => {
  const label = t(`impacts.rows.${r.row.id}.label`);
  return (
    <li
      className="impact-tile grid content-start gap-1.5 rounded-lg bg-surface-2 p-3"
      data-row={r.row.id}
    >
      <span className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-surface text-accent">
          <Icon name={HEADLINE[r.row.id] ?? 'heat'} size={22} />
        </span>
        <TileFigure t={t} locale={locale} r={r} />
      </span>
      <span className="flex items-start justify-between gap-2 text-[0.85rem] leading-snug">
        <span>{t(`impacts.rows.${r.row.id}.short`)}</span>
        <Info label={t('impacts.info', { name: label })} text={rowInfo(t, locale, group, r)} />
      </span>
    </li>
  );
};

/** What the IPCC assessed at the warming each future reaches by the horizon. */
export const Impacts = ({ t, locale, impacts, result, horizon }: ImpactsProps) => {
  const futures = useMemo(
    () => (result ? futuresAt(result.temperature, Number(horizon)) : null),
    [result, horizon],
  );
  const groups = useMemo(() => (futures ? readImpacts(impacts, futures) : []), [impacts, futures]);
  return (
    <section
      className={`${CARD} impacts-card lg:[grid-area:impacts]`}
      aria-labelledby="impacts-title"
      aria-busy={futures === null}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="impacts-title" className="m-0">
          {t('impacts.title')}
        </h2>
        {futures && (
          <span className="impacts-futures text-[0.88rem] text-muted tabular-nums">
            {futuresText(t, locale, futures)}
          </span>
        )}
      </div>
      <p className="impacts-intro m-0 mt-1 text-[0.88rem] text-muted">
        {t('impacts.intro', { year: horizon })}
      </p>
      {futures && (
        <>
          <ul className="impact-tiles m-0 mt-3 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-3">
            {headlineRows(groups).map((x) => (
              <Tile key={x.r.row.id} t={t} locale={locale} {...x} />
            ))}
          </ul>
          <details className={`${FOLD} mt-3`}>
            <summary className={FOLD_SUMMARY}>{t('impacts.all')}</summary>
            <table className="impacts-table w-full border-collapse text-[0.85rem]">
              <Head t={t} locale={locale} futures={futures} />
              {groups.map((g) => (
                <Group key={g.group.id} t={t} locale={locale} reading={g} />
              ))}
            </table>
          </details>
        </>
      )}
      <p className={`impacts-note ${HINT_TEXT} m-0 mt-3`}>
        {t('impacts.note')} <a href={methodHref()}>{t('impacts.more')}</a>
      </p>
    </section>
  );
};

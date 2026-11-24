import { useEffect, useState } from 'react';
import { milestones } from '../app/milestones';
import { LIVE_DELAY_MS, parisLines, summaryNote, summaryStats, type Stat } from '../app/summary';
import { causeGroups, type PerCapita } from '../app/summaryModel';
import type { Horizon } from '../app/url';
import { formatTemperature } from '../i18n/format';
import type { T } from '../i18n/i18n';
import { familyLabel } from '../levers/registry';
import type { Mammals } from '../data/types';
import type { Options, ScenarioResult } from '../model/api';

export interface SummaryProps {
  t: T;
  locale: string;
  currentYear: number;
  result: ScenarioResult | null;
  perCapita: PerCapita | null;
  completeYear: number;
  horizon: Horizon;
  options: Options;
  /** The world's wild mammals, for the farmed mammals' figure. */
  wild?: Mammals['wild'] | undefined;
}

const STAT = {
  plain: {
    item: '',
    label: 'text-[0.8rem] text-muted',
    value: 'text-[1.3rem] font-bold',
  },
  hero: {
    item: 'col-span-2 border-l-4 border-l-[var(--series-scenario)] pl-3 max-xs:col-[1/-1]',
    label: 'text-[0.9rem] font-bold text-ink',
    value: 'text-[length:clamp(2rem,4vw,2.8rem)] leading-[1.05] font-black',
  },
};
const DETAIL = 'stat-detail text-[0.78rem] text-muted';
const STATS =
  'summary-stats m-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3.5';
const TITLE = 'breakdown-title m-0 mb-2 text-[0.9rem] font-bold';
const ROW = 'breakdown-row grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 text-[0.82rem]';
const VALUE = 'breakdown-value font-bold tabular-nums';
const BAR = {
  plain: 'bg-[var(--bar-colour,var(--muted))]',
  added:
    'is-added bg-[repeating-linear-gradient(45deg,var(--bar-colour,var(--muted))_0_3px,transparent_3px_6px)]',
};

const StatItem = ({ label, value, detail, className }: Stat) => {
  const s = STAT[className === 'stat-hero' ? 'hero' : 'plain'];
  return (
    <div className={`stat grid content-start gap-0.5 ${className ?? ''} ${s.item}`}>
      <dt className={s.label}>{label}</dt>
      <dd className="m-0 grid">
        <span className={`stat-value tracking-[-0.01em] tabular-nums ${s.value}`}>{value}</span>
        {detail && <span className={DETAIL}>{detail}</span>}
      </dd>
    </div>
  );
};

const Bar = ({ width, added, faint }: { width: number; added: boolean; faint?: boolean }) => (
  <span
    className="breakdown-track col-[1/-1] h-1.5 overflow-hidden rounded-[3px] bg-surface-2"
    aria-hidden="true"
  >
    <span
      className={`breakdown-bar block h-full rounded-[3px] ${BAR[added ? 'added' : 'plain']} ${faint ? 'opacity-70' : ''}`}
      style={{ width: `${(width * 100).toFixed(1)}%` }}
    />
  </span>
);

/** The warming each cause and each family of levers avoids by the horizon. */
const Breakdown = ({ t, locale, result, horizon }: SummaryProps & { result: ScenarioResult }) => {
  const s = result.summary;
  const groups = causeGroups(
    horizon === '2100' ? s.byFamilyCause.avoidedWarming2100 : s.byFamilyCause.avoidedWarming2050,
  );
  const valueText = (v: number) =>
    v < 0
      ? t('summary.byFamily.added', { value: formatTemperature(locale, -v, 3) })
      : formatTemperature(locale, v, 3);
  return (
    <div className="lever-breakdown mt-4 border-t border-rule pt-3" hidden={groups.length === 0}>
      <h3 className={TITLE}>{t('summary.byFamily.title', { year: horizon })}</h3>
      <ul className="breakdown-list m-0 mb-1.5 grid list-none gap-1.5 p-0">
        {groups.map((g) => (
          <li
            key={g.cause}
            className={`breakdown-cause cause-row-${g.cause} grid gap-1`}
            data-cause={g.cause}
          >
            <div className={`${ROW} breakdown-head`}>
              <span className="breakdown-label inline-flex items-center gap-1.5 font-bold">
                <span className={`key key-cause-${g.cause}`} aria-hidden="true" />
                {t(`link.causes.${g.cause}`)}
              </span>
              <span className={VALUE}>{valueText(g.value)}</span>
              <Bar width={g.width} added={g.value < 0} />
            </div>
            <ul className="breakdown-families m-0 grid list-none gap-1 py-0 pr-0 pl-4">
              {g.rows.map((r) => (
                <li key={r.family} className={ROW} data-family={r.family}>
                  <span className="breakdown-label">{t(familyLabel(r.family))}</span>
                  <span className={VALUE}>{valueText(r.value)}</span>
                  <Bar width={r.width} added={r.value < 0} faint />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className={DETAIL}>{t('summary.byFamily.note')}</p>
    </div>
  );
};

/** What the live region says, once the page has been quiet, so a slider drag is read once. */
const useLive = (text: string): string => {
  const [said, setSaid] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setSaid(text), LIVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);
  return said;
};

type Shown = SummaryProps & { result: ScenarioResult; perCapita: PerCapita };

/** The figures, the Paris Agreement's levels, the breakdown and the note, from a result. */
const Body = (props: Shown) => {
  const { t, locale, currentYear, result, perCapita, completeYear, horizon, options, wild } = props;
  return (
    <>
      <dl className={STATS}>
        {summaryStats(t, locale, result, perCapita, completeYear, horizon, options, wild).map(
          (s) => (
            <StatItem key={s.label} {...s} />
          ),
        )}
      </dl>
      <div className="milestones-summary mt-4 border-t border-rule pt-3">
        <h3 className={TITLE}>{t('milestones.title')}</h3>
        <ul className="milestone-list m-0 grid gap-1 py-0 pr-0 pl-[1.1em] text-[0.82rem]">
          {parisLines(milestones(result.temperature, currentYear), t, locale).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <Breakdown {...props} />
      <p className="summary-note m-0 mt-3 text-[0.8rem] text-muted">{summaryNote(t, result)}</p>
    </>
  );
};

const liveText = (props: SummaryProps): string => {
  const w =
    props.result?.summary[props.horizon === '2100' ? 'avoidedWarming2100' : 'avoidedWarming2050'];
  return w
    ? props.t('summary.live', {
        year: props.horizon,
        value: formatTemperature(props.locale, w.median, 3),
      })
    : '';
};

/** Avoided emissions by gas and as CO₂e, protein and kcal kept, avoided warming by the horizon. */
export const Summary = (props: SummaryProps) => {
  const { t, result, perCapita } = props;
  const live = useLive(liveText(props));
  return (
    <section
      className="summary rounded-card border border-rule bg-surface p-4 lg:[grid-area:summary] xl:sticky xl:top-[calc(var(--header-h)+20px)] xl:max-h-[calc(100dvh-var(--header-h)-32px)] xl:overflow-y-auto"
      aria-labelledby="summary-title"
    >
      <h2 id="summary-title" className="visually-hidden">
        {t('summary.title')}
      </h2>
      <p className="visually-hidden" role="status">
        {live}
      </p>
      {result && perCapita ? (
        <Body {...props} result={result} perCapita={perCapita} />
      ) : (
        <dl className={STATS} />
      )}
    </section>
  );
};

import { useEffect, useState } from 'react';
import { milestones } from '../app/milestones';
import { LIVE_DELAY_MS, parisLines, summaryNote, summaryStats, type Stat } from '../app/summary';
import { causeGroups, type PerCapita } from '../app/summaryModel';
import type { Horizon } from '../app/url';
import { formatTemperature } from '../i18n/format';
import type { T } from '../i18n/i18n';
import { familyLabel } from '../levers/registry';
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
}

const StatItem = ({ label, value, detail, className }: Stat) => (
  <div className={`stat ${className ?? ''}`}>
    <dt>{label}</dt>
    <dd>
      <span className="stat-value">{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </dd>
  </div>
);

const Bar = ({ width, added }: { width: number; added: boolean }) => (
  <span className="breakdown-track" aria-hidden="true">
    <span
      className={added ? 'breakdown-bar is-added' : 'breakdown-bar'}
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
    <div className="lever-breakdown" hidden={groups.length === 0}>
      <h3 className="breakdown-title">{t('summary.byFamily.title', { year: horizon })}</h3>
      <ul className="breakdown-list">
        {groups.map((g) => (
          <li key={g.cause} className={`breakdown-cause cause-row-${g.cause}`} data-cause={g.cause}>
            <div className="breakdown-row breakdown-head">
              <span className="breakdown-label">
                <span className={`key key-cause-${g.cause}`} aria-hidden="true" />
                {t(`link.causes.${g.cause}`)}
              </span>
              <span className="breakdown-value">{valueText(g.value)}</span>
              <Bar width={g.width} added={g.value < 0} />
            </div>
            <ul className="breakdown-families">
              {g.rows.map((r) => (
                <li key={r.family} className="breakdown-row" data-family={r.family}>
                  <span className="breakdown-label">{t(familyLabel(r.family))}</span>
                  <span className="breakdown-value">{valueText(r.value)}</span>
                  <Bar width={r.width} added={r.value < 0} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="stat-detail">{t('summary.byFamily.note')}</p>
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
  const { t, locale, currentYear, result, perCapita, completeYear, horizon, options } = props;
  return (
    <>
      <dl className="summary-stats">
        {summaryStats(t, locale, result, perCapita, completeYear, horizon, options).map((s) => (
          <StatItem key={s.label} {...s} />
        ))}
      </dl>
      <div className="milestones-summary">
        <h3 className="breakdown-title">{t('milestones.title')}</h3>
        <ul className="milestone-list">
          {parisLines(milestones(result.temperature, currentYear), t, locale).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <Breakdown {...props} />
      <p className="summary-note">{summaryNote(t, result)}</p>
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
    <section className="summary" aria-labelledby="summary-title">
      <h2 id="summary-title" className="visually-hidden">
        {t('summary.title')}
      </h2>
      <p className="visually-hidden" role="status">
        {live}
      </p>
      {result && perCapita ? (
        <Body {...props} result={result} perCapita={perCapita} />
      ) : (
        <dl className="summary-stats" />
      )}
    </section>
  );
};

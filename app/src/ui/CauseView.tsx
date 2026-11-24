import { useEffect } from 'react';
import { attributionChart } from '../chart/attribution';
import { avoidedOf, nowTexts, scenarioText, titleTexts } from '../chart/cause';
import { attributionFor, CAUSE_GASES, type CauseGas } from '../chart/series';
import type { Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { Segmented } from './Segmented';
import { useDrawn } from './useDrawn';

export interface CauseViewProps {
  t: T;
  locale: string;
  currentYear: number;
  result: ScenarioResult | null;
  climate: Climate;
  ssp: Ssp;
  temperature: TemperatureSource;
  from: number;
  end: number;
  gas: CauseGas;
  onGas: (gas: CauseGas) => void;
}

/**
 * The chart tab Causes of warming: what each cause has done to the temperature so far, and
 * warming by cause, of every emission or of one greenhouse gas, with what the levers take off
 * each.
 */
export const CauseView = (props: CauseViewProps) => {
  const { t, locale, currentYear, result, climate, ssp, temperature, from, end, gas } = props;
  const [stacked, stackedRef] = useDrawn(() => attributionChart(t, locale, currentYear));
  const split = climate.attributionByGas !== undefined;
  const shown: CauseGas = split ? gas : 'all';
  useEffect(
    () =>
      stacked.update({
        attribution: attributionFor(climate, ssp, shown, result?.temperature),
        gas: shown,
        observed: shown === 'all' ? climate.observed[temperature] : null,
        from,
        end,
        avoided: result ? avoidedOf(result, shown) : null,
      }),
    [stacked, climate, ssp, shown, temperature, from, end, result],
  );
  const lines = { t, locale };
  const now = nowTexts(
    lines,
    attributionFor(climate, ssp, 'all', result?.temperature),
    currentYear,
  );
  const titles = titleTexts(t, shown, from);
  return (
    <div className="cause-view">
      <div className="cause-intro" aria-live="polite">
        <p className="headline">{now.headline}</p>
        <p className="headline-parts">{now.parts}</p>
        <p className="headline-sub">{scenarioText(lines, result, ssp, end)}</p>
      </div>
      <h3 className="chart-subtitle">{titles.title}</h3>
      <Segmented<CauseGas>
        name="causegas"
        legend={t('link.gas')}
        options={CAUSE_GASES.map((value) => ({ value, label: t(`link.gasChoices.${value}`) }))}
        value={shown}
        hidden={!split}
        onChange={props.onGas}
      />
      <p className="card-text">{titles.text}</p>
      <div className="drawn" ref={stackedRef} />
      <details className="fold cause-notes">
        <summary>{t('link.whyTitle')}</summary>
        <p>{t('link.intro')}</p>
        <p>{t('link.whyMethane')}</p>
        <p>{t('link.whyNitrous')}</p>
        <p>{t('link.whyCo2')}</p>
      </details>
    </div>
  );
};

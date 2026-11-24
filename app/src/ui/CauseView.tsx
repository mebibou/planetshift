import { useEffect } from 'react';
import { attributionChart } from '../chart/attribution';
import { avoidedOf, scenarioText, titleTexts } from '../chart/cause';
import { attributionFor, type CauseGas } from '../chart/series';
import type { Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { CHART_SUBTITLE, FOLD, FOLD_SUMMARY } from './classes';
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
  /** 'all' when the build has no split by gas. */
  gas: CauseGas;
}

/**
 * The chart tab Causes of warming: what each cause has done to the temperature so far, and
 * warming by cause, of every emission or of one greenhouse gas, with what the levers take off
 * each.
 */
export const CauseView = (props: CauseViewProps) => {
  const { t, locale, currentYear, result, climate, ssp, temperature, from, end } = props;
  const [stacked, stackedRef] = useDrawn(() => attributionChart(t, locale, currentYear));
  const shown = props.gas;
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
  const titles = titleTexts(t, shown, from);
  return (
    <div className="cause-view grid gap-2">
      <div className="cause-intro mb-2" aria-live="polite">
        <p className="headline-sub pl-[18px] text-[1.05rem]">
          {scenarioText(lines, result, ssp, end)}
        </p>
      </div>
      <h3 className={CHART_SUBTITLE}>{titles.title}</h3>
      <p className="m-0 mb-1 text-[0.88rem] text-muted">{titles.text}</p>
      <div className="drawn" ref={stackedRef} />
      <details className={`${FOLD} cause-notes [&_p]:text-[0.9rem]`}>
        <summary className={FOLD_SUMMARY}>{t('link.whyTitle')}</summary>
        <p>{t('link.intro')}</p>
        <p>{t('link.whyMethane')}</p>
        <p>{t('link.whyNitrous')}</p>
        <p>{t('link.whyCo2')}</p>
      </details>
    </div>
  );
};

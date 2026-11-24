import { useEffect } from 'react';
import { attributionChart } from '../chart/attribution';
import { avoidedOf, scenarioText } from '../chart/cause';
import { attributionFor, type CauseGas } from '../chart/series';
import type { Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
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
  return (
    <div className="cause-view grid gap-2">
      <div className="drawn" ref={stackedRef} />
      <div className="cause-intro" aria-live="polite">
        <p className="headline-sub m-0 pl-[18px] text-[1.05rem]">
          {scenarioText(lines, result, ssp, end)}
        </p>
      </div>
    </div>
  );
};

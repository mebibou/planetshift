import type { Cause, Ssp } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatTemperature } from '../i18n/format';
import { COUNTED_CAUSES } from '../levers/registry';
import type { ScenarioResult, Summary } from '../model/api';
import type { AvoidedByCause } from './attribution';
import type { CauseGas } from './series';

/** What the levers avoid in the causes of a gas choice. */
export const avoidedOf = (result: ScenarioResult, gas: CauseGas): AvoidedByCause => ({
  years: result.temperature.years,
  byCause: gas === 'all' ? result.temperature.avoidedByCause : result.temperature.avoidedByGas[gas],
});

interface Lines {
  t: T;
  locale: string;
}

/** A cause and its warming, as one item of a list. */
const partText = ({ t, locale }: Lines, cause: Cause, value: number): string =>
  t('link.part', {
    cause: t(`link.causes.${cause}`),
    value: formatTemperature(locale, value, 2, true),
  });

/** What the levers avoid at the horizon, overall and by cause, when it is large enough to tell. */
const avoidedAt = (summary: Summary | undefined, end: number) => {
  const horizon = end >= 2100 ? '2100' : '2050';
  const median = summary?.[`avoidedWarming${horizon}`].median ?? 0;
  return summary && Math.abs(median) >= 0.0005
    ? { median, byCause: summary.byCause[`avoidedWarming${horizon}`] }
    : null;
};

/** What the levers avoid at the horizon, and of each cause that shows at two decimals. */
export const scenarioText = (
  lines: Lines,
  result: ScenarioResult | null,
  ssp: Ssp,
  end: number,
): string => {
  const { t, locale } = lines;
  const avoided = avoidedAt(result?.summary, end);
  return avoided
    ? t('link.scenario', {
        avoided: formatTemperature(locale, avoided.median, 3),
        ssp: t(`options.ssp.${ssp}`),
        year: end,
        parts: [...COUNTED_CAUSES]
          .filter((c) => Math.abs(avoided.byCause[c]) >= 0.005)
          .sort((a, b) => Math.abs(avoided.byCause[b]) - Math.abs(avoided.byCause[a]))
          .map((c) => partText(lines, c, -avoided.byCause[c]))
          .join(t('link.separator')),
      })
    : '';
};

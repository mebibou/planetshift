import { h } from '../app/dom';
import type { Cause, Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatTemperature } from '../i18n/format';
import { COUNTED_CAUSES } from '../levers/registry';
import type { ScenarioResult, Summary } from '../model/api';
import { segmented } from '../controls/segmented';
import { attributionChart, type AvoidedByCause } from './attribution';
import {
  attributionOf,
  CAUSE_GASES,
  causesAt,
  causesBySize,
  type Attribution,
  type CauseGas,
} from './series';

export interface CauseView {
  el: HTMLElement;
  update: (
    result: ScenarioResult | null,
    climate: Climate,
    choice: {
      ssp: Ssp;
      temperature: TemperatureSource;
      from: number;
      end: number;
      gas: CauseGas;
    },
  ) => void;
}

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

/** The warming so far, and what each cause adds or takes away, in the current year. */
const nowTexts = (lines: Lines, attribution: Attribution, year: number) => {
  const { t, locale } = lines;
  const now = causesAt(attribution, year);
  return now
    ? {
        headline: t('link.headline', { total: formatTemperature(locale, now.total, 2), year }),
        parts: t('link.parts', {
          parts: causesBySize(attribution, year)
            .map((c) => partText(lines, c, now.byCause[c]))
            .join(t('link.separator')),
        }),
      }
    : { headline: '', parts: '' };
};

/** What the levers avoid at the horizon, overall and by cause, when it is large enough to tell. */
const avoidedAt = (summary: Summary | undefined, end: number) => {
  const horizon = end >= 2100 ? '2100' : '2050';
  const median = summary?.[`avoidedWarming${horizon}`].median ?? 0;
  return summary && Math.abs(median) >= 0.0005
    ? { median, byCause: summary.byCause[`avoidedWarming${horizon}`] }
    : null;
};

/** What the levers avoid at the horizon and of each cause, or nothing when it is too small. */
const scenarioText = (
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
          .filter((c) => Math.abs(avoided.byCause[c]) >= 0.0005)
          .sort((a, b) => Math.abs(avoided.byCause[b]) - Math.abs(avoided.byCause[a]))
          .map((c) => partText(lines, c, -avoided.byCause[c]))
          .join(t('link.separator')),
      })
    : '';
};

/** The stacked chart's title and text, for every cause or for one gas. */
const titleTexts = (t: T, shown: CauseGas, from: number) =>
  shown === 'all'
    ? { title: t('link.attributionTitle', { from }), text: t('link.attributionText') }
    : {
        title: t('link.gasTitle', { gas: t(`link.gasNames.${shown}`), from }),
        text: t('link.gasText'),
      };

/**
 * The chart tab Causes of warming: what each cause has done to the temperature so far, and
 * warming by cause, of every emission or of one greenhouse gas, with what the levers take off
 * each.
 */
export const causeView = (
  t: T,
  locale: string,
  currentYear: number,
  onGas: (gas: CauseGas) => void,
): CauseView => {
  const headline = h('p', { class: 'headline' });
  const partsLine = h('p', { class: 'headline-parts' });
  const scenarioLine = h('p', { class: 'headline-sub' });
  const stacked = attributionChart(t, locale, currentYear);
  const gasSwitch = segmented<CauseGas>({
    name: 'causegas',
    legend: t('link.gas'),
    options: CAUSE_GASES.map((value) => ({ value, label: t(`link.gasChoices.${value}`) })),
    value: 'all',
    onChange: onGas,
  });
  const attributionTitle = h('h3', { class: 'chart-subtitle' });
  const attributionText = h('p', { class: 'card-text' });
  const el = h(
    'div',
    { class: 'cause-view' },
    h('div', { class: 'cause-intro', 'aria-live': 'polite' }, headline, partsLine, scenarioLine),
    attributionTitle,
    gasSwitch.el,
    attributionText,
    stacked.el,
    h(
      'details',
      { class: 'fold cause-notes' },
      h('summary', {}, t('link.whyTitle')),
      h('p', {}, t('link.intro')),
      h('p', {}, t('link.whyMethane')),
      h('p', {}, t('link.whyNitrous')),
      h('p', {}, t('link.whyCo2')),
    ),
  );
  const update: CauseView['update'] = (result, climate, { ssp, temperature, from, end, gas }) => {
    const attribution = climate.attribution[ssp];
    const split = climate.attributionByGas !== undefined;
    const shown: CauseGas = split ? gas : 'all';
    gasSwitch.el.hidden = !split;
    gasSwitch.set(shown);
    const lines = { t, locale };
    const now = nowTexts(lines, attribution, currentYear);
    headline.textContent = now.headline;
    partsLine.textContent = now.parts;
    scenarioLine.textContent = scenarioText(lines, result, ssp, end);
    const titles = titleTexts(t, shown, from);
    attributionTitle.textContent = titles.title;
    attributionText.textContent = titles.text;
    stacked.update({
      attribution: attributionOf(climate, ssp, shown),
      gas: shown,
      observed: shown === 'all' ? climate.observed[temperature] : null,
      from,
      end,
      avoided: result ? avoidedOf(result, shown) : null,
    });
  };
  return { el, update };
};

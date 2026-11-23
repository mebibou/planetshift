import { h } from '../app/dom';
import type { Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatTemperature } from '../i18n/format';
import { COUNTED_CAUSES } from '../levers/registry';
import type { ScenarioResult } from '../model/api';
import { segmented } from '../controls/segmented';
import { attributionChart, type AvoidedByCause } from './attribution';
import { attributionOf, CAUSE_GASES, causesAt, causesBySize, type CauseGas } from './series';

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
    const now = causesAt(attribution, currentYear);
    const part = (label: string, value: number) =>
      t('link.part', { cause: label, value: formatTemperature(locale, value, 2, true) });
    headline.textContent = now
      ? t('link.headline', { total: formatTemperature(locale, now.total, 2), year: currentYear })
      : '';
    partsLine.textContent = now
      ? t('link.parts', {
          parts: causesBySize(attribution, currentYear)
            .map((c) => part(t(`link.causes.${c}`), now.byCause[c]))
            .join(t('link.separator')),
        })
      : '';
    const avoided = result
      ? end >= 2100
        ? result.summary.avoidedWarming2100
        : result.summary.avoidedWarming2050
      : null;
    const byCause = result
      ? end >= 2100
        ? result.summary.byCause.avoidedWarming2100
        : result.summary.byCause.avoidedWarming2050
      : null;
    attributionTitle.textContent =
      shown === 'all'
        ? t('link.attributionTitle', { from })
        : t('link.gasTitle', { gas: t(`link.gasNames.${shown}`), from });
    attributionText.textContent = t(shown === 'all' ? 'link.attributionText' : 'link.gasText');
    scenarioLine.textContent =
      avoided && byCause && Math.abs(avoided.median) >= 0.0005
        ? t('link.scenario', {
            avoided: formatTemperature(locale, avoided.median, 3),
            ssp: t(`options.ssp.${ssp}`),
            year: end,
            parts: [...COUNTED_CAUSES]
              .filter((c) => Math.abs(byCause[c]) >= 0.0005)
              .sort((a, b) => Math.abs(byCause[b]) - Math.abs(byCause[a]))
              .map((c) => part(t(`link.causes.${c}`), -byCause[c]))
              .join(t('link.separator')),
          })
        : '';
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

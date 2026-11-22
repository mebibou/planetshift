import { h } from '../app/dom';
import type { Climate, Ssp, TemperatureSource } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatTemperature } from '../i18n/format';
import { COUNTED_CAUSES } from '../levers/registry';
import type { ScenarioResult } from '../model/api';
import { attributionChart } from './attribution';
import { gasMultiples } from './gases';
import { causesAt, causesBySize } from './series';

export interface CauseView {
  el: HTMLElement;
  update: (
    result: ScenarioResult | null,
    climate: Climate,
    choice: { ssp: Ssp; temperature: TemperatureSource; from: number; end: number },
  ) => void;
}

/**
 * The chart tab Causes of warming: what each cause has done to the temperature so far, warming
 * by cause with what the levers take off each, farm emissions by gas.
 */
export const causeView = (t: T, locale: string, currentYear: number): CauseView => {
  const headline = h('p', { class: 'headline' });
  const partsLine = h('p', { class: 'headline-parts' });
  const scenarioLine = h('p', { class: 'headline-sub' });
  const stacked = attributionChart(t, locale, currentYear);
  const gases = gasMultiples(t, locale, currentYear);
  const attributionTitle = h('h3', { class: 'chart-subtitle' });
  const el = h(
    'div',
    { class: 'cause-view' },
    h('div', { class: 'cause-intro', 'aria-live': 'polite' }, headline, partsLine, scenarioLine),
    attributionTitle,
    h('p', { class: 'card-text' }, t('link.attributionText')),
    stacked.el,
    h('h3', { class: 'chart-subtitle' }, t('link.gasesTitle')),
    h('p', { class: 'card-text' }, t('link.gasesText')),
    gases.el,
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
  const update: CauseView['update'] = (result, climate, { ssp, temperature, from, end }) => {
    const attribution = climate.attribution[ssp];
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
    attributionTitle.textContent = t('link.attributionTitle', { from });
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
    stacked.update(
      attribution,
      climate.observed[temperature],
      from,
      end,
      result
        ? { years: result.temperature.years, byCause: result.temperature.avoidedByCause }
        : null,
    );
    gases.update(climate.agricultureEmissions[ssp], from, end);
  };
  return { el, update };
};

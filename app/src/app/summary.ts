import { h } from './dom';
import type { T } from '../i18n/i18n';
import {
  formatArea,
  formatMass,
  formatNumber,
  formatPercent,
  formatSignedArea,
  formatTemperature,
  massUnit,
} from '../i18n/format';
import { familyLabel, SUMMARY_MODULES } from '../levers/registry';
import type { Format } from '../levers/types';
import type { Options, ScenarioResult } from '../model/api';
import { causeGroups, gasChange, landStat, type PerCapita } from './summaryModel';
import { milestones, type Milestone, type Milestones } from './milestones';

export interface Summary {
  el: HTMLElement;
  update: (
    result: ScenarioResult | null,
    perCapita: PerCapita | null,
    completeYear: number,
    horizon: '2050' | '2100',
    options: Options,
  ) => void;
}

/** Quiet time after the last change before the live sentence is rewritten, so a slider drag is read once. */
const LIVE_DELAY_MS = 800;

const stat = (label: string, value: string, detail = '', className = '') =>
  h(
    'div',
    { class: `stat ${className}` },
    h('dt', {}, label),
    h(
      'dd',
      {},
      h('span', { class: 'stat-value' }, value),
      detail ? h('span', { class: 'stat-detail' }, detail) : null,
    ),
  );

const levelText = (locale: string, level: number) =>
  formatTemperature(locale, level, Number.isInteger(level) ? 0 : 1);

/** When a level is crossed without and with the levers, and the scenario's likely range of it. */
export const crossingLine = (m: Milestone, end: number, t: T, locale: string): string => {
  const { baseline: base, scenario: scen, early, late } = m;
  const text =
    base === null && scen === null
      ? t('milestones.never', { end })
      : base === scen
        ? t('milestones.reached', { year: base ?? end })
        : [
            base === null
              ? t('milestones.withoutNever', { end })
              : t('milestones.without', { year: base }),
            scen === null
              ? t('milestones.withNever', { end })
              : t('milestones.with', { year: scen }),
          ].join(t('milestones.separator'));
  const range =
    early === null || (early === scen && late === scen)
      ? ''
      : late === null
        ? t('milestones.rangeFrom', { early })
        : t('milestones.range', { early, late });
  return t('milestones.line', {
    level: levelText(locale, m.level),
    text: range ? `${text} (${range})` : text,
  });
};

/** The share of the gap to each level the shift closes in the last year. */
export const gapLine = (ms: Milestones, t: T, locale: string): string => {
  const parts = ms.levels.map((m) =>
    m.closed === null
      ? t('milestones.below', { level: levelText(locale, m.level) })
      : t(m.closed < 0 ? 'milestones.gapWidened' : 'milestones.gapPart', {
          share: formatPercent(locale, Math.abs(m.closed)),
          level: levelText(locale, m.level),
        }),
  );
  return t('milestones.gap', { year: ms.end, parts: parts.join(t('milestones.separator')) });
};

export const peakLine = (ms: Milestones, t: T, locale: string): string =>
  ms.peak === null
    ? ''
    : t(ms.peak.rising ? 'milestones.peakRising' : 'milestones.peak', {
        value: formatTemperature(locale, ms.peak.value, 2),
        year: ms.peak.year,
      });

/** Avoided emissions by gas and as CO₂e, protein and kcal kept, avoided warming by the horizon. */
export const summary = (t: T, locale: string, currentYear: number): Summary => {
  const body = h('dl', { class: 'summary-stats' });
  const note = h('p', { class: 'summary-note' });
  const breakdownTitle = h('h3', { class: 'breakdown-title' });
  const breakdownList = h('ul', { class: 'breakdown-list' });
  const breakdown = h(
    'div',
    { class: 'lever-breakdown', hidden: true },
    breakdownTitle,
    breakdownList,
    h('p', { class: 'stat-detail' }, t('summary.byFamily.note')),
  );
  const parisList = h('ul', { class: 'milestone-list' });
  const paris = h(
    'div',
    { class: 'milestones-summary' },
    h('h3', { class: 'breakdown-title' }, t('milestones.title')),
    parisList,
  );
  const live = h('p', { class: 'visually-hidden', role: 'status' });
  let announce = 0;
  const say = (text: string) => {
    clearTimeout(announce);
    announce = window.setTimeout(() => {
      if (live.textContent !== text) live.textContent = text;
    }, LIVE_DELAY_MS);
  };
  const el = h(
    'section',
    { class: 'summary', 'aria-labelledby': 'summary-title' },
    h('h2', { id: 'summary-title', class: 'visually-hidden' }, t('summary.title')),
    live,
    body,
    paris,
    breakdown,
    note,
  );
  const valueText = (v: number) =>
    v < 0
      ? t('summary.byFamily.added', { value: formatTemperature(locale, -v, 3) })
      : formatTemperature(locale, v, 3);
  const bar = (width: number, added: boolean) =>
    h(
      'span',
      { class: 'breakdown-track', 'aria-hidden': 'true' },
      h('span', {
        class: `breakdown-bar${added ? ' is-added' : ''}`,
        style: `width: ${(width * 100).toFixed(1)}%`,
      }),
    );
  const showBreakdown = (warming: Parameters<typeof causeGroups>[0], year: string) => {
    const groups = causeGroups(warming);
    breakdown.hidden = groups.length === 0;
    breakdownTitle.textContent = t('summary.byFamily.title', { year });
    breakdownList.replaceChildren(
      ...groups.map((g) =>
        h(
          'li',
          { class: `breakdown-cause cause-row-${g.cause}`, 'data-cause': g.cause },
          h(
            'div',
            { class: 'breakdown-row breakdown-head' },
            h(
              'span',
              { class: 'breakdown-label' },
              h('span', { class: `key key-cause-${g.cause}`, 'aria-hidden': 'true' }),
              t(`link.causes.${g.cause}`),
            ),
            h('span', { class: 'breakdown-value' }, valueText(g.value)),
            bar(g.width, g.value < 0),
          ),
          h(
            'ul',
            { class: 'breakdown-families' },
            ...g.rows.map((r) =>
              h(
                'li',
                { class: 'breakdown-row', 'data-family': r.family },
                h('span', { class: 'breakdown-label' }, t(familyLabel(r.family))),
                h('span', { class: 'breakdown-value' }, valueText(r.value)),
                bar(r.width, r.value < 0),
              ),
            ),
          ),
        ),
      ),
    );
  };
  const format: Format = {
    t,
    mass: (kg) => formatMass(locale, kg),
    percent: (share, digits) => formatPercent(locale, share, digits),
  };
  const update: Summary['update'] = (result, perCapita, completeYear, horizon, options) => {
    if (!result || !perCapita) {
      say('');
      body.replaceChildren();
      breakdown.hidden = true;
      paris.hidden = true;
      return;
    }
    const ms = milestones(result.temperature, currentYear);
    paris.hidden = false;
    parisList.replaceChildren(
      ...[
        ...ms.levels.map((m) => crossingLine(m, ms.end, t, locale)),
        gapLine(ms, t, locale),
        peakLine(ms, t, locale),
      ]
        .filter(Boolean)
        .map((line) => h('li', {}, line)),
    );
    const s = result.summary;
    const w = horizon === '2100' ? s.avoidedWarming2100 : s.avoidedWarming2050;
    const co2eUnit = massUnit(s.avoidedCo2e);
    const land = landStat(s.landBefore, s.landFreed);
    say(t('summary.live', { year: horizon, value: formatTemperature(locale, w.median, 3) }));
    body.replaceChildren(
      stat(
        t('summary.warming', { year: horizon }),
        formatTemperature(locale, w.median, 3),
        t('summary.range', {
          low: formatTemperature(locale, Math.min(w.p05, w.p95), 3),
          high: formatTemperature(locale, Math.max(w.p05, w.p95), 3),
        }),
        'stat-hero',
      ),
      stat(
        t('summary.co2e', { year: completeYear }),
        `${formatMass(locale, s.avoidedCo2e, co2eUnit)}`,
        t('summary.co2eDetail'),
      ),
      ...(['ch4', 'n2o', 'co2'] as const).map((gas) => {
        const { key, value } = gasChange(gas, s.avoided[gas]);
        return stat(t(key), formatMass(locale, value));
      }),
      stat(
        t(land.key),
        formatArea(locale, land.total),
        t('summary.landDetail', {
          cropland: formatSignedArea(locale, land.cropland),
          pasture: formatSignedArea(locale, land.pasture),
          share: formatPercent(locale, land.share, 1),
        }),
        'stat-land',
      ),
      ...SUMMARY_MODULES.flatMap((m) => {
        const own = m.ui.stat?.(result, options, completeYear, format);
        return own ? [stat(own.label, own.value, own.detail, own.className)] : [];
      }),
      stat(
        t('summary.protein'),
        t('summary.beforeAfter', {
          before: formatNumber(locale, perCapita.proteinBefore, 1),
          after: formatNumber(locale, perCapita.proteinAfter, 1),
        }),
        t('summary.gPerDay'),
      ),
      stat(
        t('summary.kcal'),
        t('summary.beforeAfter', {
          before: formatNumber(locale, perCapita.kcalBefore, 0),
          after: formatNumber(locale, perCapita.kcalAfter, 0),
        }),
        t('summary.kcalPerDay'),
      ),
    );
    showBreakdown(
      horizon === '2100' ? s.byFamilyCause.avoidedWarming2100 : s.byFamilyCause.avoidedWarming2050,
      horizon,
    );
    note.textContent = [
      t('summary.scope'),
      s.clipped.length ? t('summary.clipped', { count: s.clipped.length }) : '',
    ]
      .filter(Boolean)
      .join(' ');
  };
  return { el, update };
};

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
import { SUMMARY_MODULES } from '../levers/registry';
import type { Format } from '../levers/types';
import type { Options, ScenarioResult } from '../model/api';
import { gasChange, landStat, type PerCapita } from './summaryModel';
import type { Milestone, Milestones } from './milestones';

/** Quiet time after the last change before the live sentence is rewritten, so a slider drag is read once. */
export const LIVE_DELAY_MS = 800;

const levelText = (locale: string, level: number) =>
  formatTemperature(locale, level, Number.isInteger(level) ? 0 : 1);

/** The year a level is crossed, or that it is not by `end`. */
const yearText = (t: T, year: number | null, end: number, key: 'with' | 'without'): string =>
  year === null ? t(`milestones.${key}Never`, { end }) : t(`milestones.${key}`, { year });

/** When a level is crossed: never, the same year with and without the levers, or each year. */
const crossingText = (m: Milestone, end: number, t: T): string =>
  m.baseline === null && m.scenario === null
    ? t('milestones.never', { end })
    : m.baseline === m.scenario
      ? t('milestones.reached', { year: m.baseline ?? end })
      : [yearText(t, m.baseline, end, 'without'), yearText(t, m.scenario, end, 'with')].join(
          t('milestones.separator'),
        );

/** The scenario's likely range of the crossing, when it is more than its median year. */
const rangeText = ({ early, late, scenario }: Milestone, t: T): string =>
  early === null || (early === scenario && late === scenario)
    ? ''
    : late === null
      ? t('milestones.rangeFrom', { early })
      : t('milestones.range', { early, late });

/** When a level is crossed without and with the levers, and the scenario's likely range of it. */
export const crossingLine = (m: Milestone, end: number, t: T, locale: string): string => {
  const text = crossingText(m, end, t);
  const range = rangeText(m, t);
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

export interface Stat {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}

/** The lines on the Paris Agreement's levels: when each is crossed, the gap closed, the peak. */
export const parisLines = (ms: Milestones, t: T, locale: string): string[] =>
  [
    ...ms.levels.map((m) => crossingLine(m, ms.end, t, locale)),
    gapLine(ms, t, locale),
    peakLine(ms, t, locale),
  ].filter(Boolean);

const beforeAfter = (t: T, locale: string, before: number, after: number, digits: number) =>
  t('summary.beforeAfter', {
    before: formatNumber(locale, before, digits),
    after: formatNumber(locale, after, digits),
  });

/**
 * The summary's figures: the warming avoided by the horizon, the emissions avoided as CO₂e and by
 * gas, the land freed, each module's own figure, and the protein and calories per person.
 */
export const summaryStats = (
  t: T,
  locale: string,
  result: ScenarioResult,
  perCapita: PerCapita,
  completeYear: number,
  horizon: '2050' | '2100',
  options: Options,
): Stat[] => {
  const s = result.summary;
  const w = horizon === '2100' ? s.avoidedWarming2100 : s.avoidedWarming2050;
  const land = landStat(s.landBefore, s.landFreed);
  const format: Format = {
    t,
    mass: (kg) => formatMass(locale, kg),
    percent: (share, digits) => formatPercent(locale, share, digits),
  };
  return [
    {
      label: t('summary.warming', { year: horizon }),
      value: formatTemperature(locale, w.median, 3),
      detail: t('summary.range', {
        low: formatTemperature(locale, Math.min(w.p05, w.p95), 3),
        high: formatTemperature(locale, Math.max(w.p05, w.p95), 3),
      }),
      className: 'stat-hero',
    },
    {
      label: t('summary.co2e', { year: completeYear }),
      value: formatMass(locale, s.avoidedCo2e, massUnit(s.avoidedCo2e)),
      detail: t('summary.co2eDetail'),
    },
    ...(['ch4', 'n2o', 'co2'] as const).map((gas) => {
      const { key, value } = gasChange(gas, s.avoided[gas]);
      return { label: t(key), value: formatMass(locale, value) };
    }),
    {
      label: t(land.key),
      value: formatArea(locale, land.total),
      detail: t('summary.landDetail', {
        cropland: formatSignedArea(locale, land.cropland),
        pasture: formatSignedArea(locale, land.pasture),
        share: formatPercent(locale, land.share, 1),
      }),
      className: 'stat-land',
    },
    ...SUMMARY_MODULES.flatMap((m) => {
      const own = m.ui.stat?.(result, options, completeYear, format);
      return own ? [own] : [];
    }),
    {
      label: t('summary.protein'),
      value: beforeAfter(t, locale, perCapita.proteinBefore, perCapita.proteinAfter, 1),
      detail: t('summary.gPerDay'),
    },
    {
      label: t('summary.kcal'),
      value: beforeAfter(t, locale, perCapita.kcalBefore, perCapita.kcalAfter, 0),
      detail: t('summary.kcalPerDay'),
    },
  ];
};

/** What the summary's note says: its scope, and how many countries' changes were clipped. */
export const summaryNote = (t: T, result: ScenarioResult): string =>
  [
    t('summary.scope'),
    result.summary.clipped.length
      ? t('summary.clipped', { count: result.summary.clipped.length })
      : '',
  ]
    .filter(Boolean)
    .join(' ');

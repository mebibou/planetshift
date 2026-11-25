import type { T } from '../i18n/i18n';
import {
  formatArea,
  formatMass,
  formatNumber,
  formatPercent,
  formatSignificant,
  formatSignedArea,
  formatTemperature,
  massUnit,
} from '../i18n/format';
import { SUMMARY_MODULES } from '../levers/registry';
import type { Format } from '../levers/types';
import type { Mammals, Species } from '../data/types';
import type { Options, ScenarioResult } from '../model/api';
import { mammalRatio, type MammalRatio } from './mammals';
import { fishTotal, speciesTotal, type FishTotal, type SpeciesTotal } from './species';
import { gasChange, landStat, type PerCapita } from './summaryModel';
import type { Milestone, Milestones } from './milestones';

/** The emissions figures, shown together under the year the levers are in full. */
export const GAS_STAT = 'stat-gas';

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

/** Farmed mammals for each wild one, today and with the levers, and the tonnes behind it. */
export const mammalStat = (t: T, locale: string, m: MammalRatio): Stat => ({
  label: t('summary.mammals.label'),
  value: t('summary.beforeAfter', {
    before: t('summary.mammals.ratio', { value: formatNumber(locale, m.before, 1) }),
    after: t('summary.mammals.ratio', { value: formatNumber(locale, m.after, 1) }),
  }),
  detail: t('summary.mammals.detail', {
    before: formatMass(locale, m.farmedBefore * 1000),
    after: formatMass(locale, m.farmedAfter * 1000),
    wild: formatMass(locale, m.wild * 1000),
  }),
  className: 'stat-mammals',
});

/**
 * Species committed to extinction by farmland, today and with the levers, as a count and a share
 * of the described species; the note says whether freed farmland gives any back.
 */
export const speciesStat = (t: T, locale: string, s: SpeciesTotal, regrows: boolean): Stat => ({
  label: t('summary.species.label'),
  value: t('summary.beforeAfter', {
    before: formatSignificant(locale, s.before, 2),
    after: formatSignificant(locale, s.after, 2),
  }),
  detail: t(regrows ? 'summary.species.detailRegrows' : 'summary.species.detail', {
    before: formatPercent(locale, s.before / s.described, 1),
    after: formatPercent(locale, s.after / s.described, 1),
    described: formatNumber(locale, s.described, 0),
  }),
  className: 'stat-species',
});

/** The fish the fisheries target, as a share of an unfished ocean's, today and with the levers. */
export const fishStat = (t: T, locale: string, f: FishTotal): Stat => ({
  label: t('summary.fish.label'),
  value: t('summary.beforeAfter', {
    before: formatPercent(locale, f.before / f.unfished),
    after: formatPercent(locale, f.after / f.unfished),
  }),
  detail: t('summary.fish.detail', {
    before: formatMass(locale, f.before * 1000),
    after: formatMass(locale, f.after * 1000),
    unfished: formatMass(locale, f.unfished * 1000),
    change: formatPercent(locale, f.catchChange, 0, true),
  }),
  className: 'stat-fish',
});

/** The species and fish figures, where the data has species.json. */
const natureStats = (
  t: T,
  locale: string,
  result: ScenarioResult,
  options: Options,
  species?: Species,
) => {
  const s = speciesTotal(result.countries, species);
  const f = fishTotal(result.countries, species?.fish);
  return [
    ...(s ? [speciesStat(t, locale, s, options.regrowth === 'natural')] : []),
    ...(f ? [fishStat(t, locale, f)] : []),
  ];
};

const cm = (locale: string, m: number) => formatNumber(locale, m * 100, 1);
const metres = (locale: string, m: number) => formatNumber(locale, m, 2);

/** The sea-level rise avoided by 2100 against AR6's rise without the levers, where the data has it. */
const seaLevelStats = (t: T, locale: string, result: ScenarioResult): Stat[] => {
  const sea = result.summary.seaLevel2100;
  return sea
    ? [
        {
          label: t('summary.seaLevel.label'),
          value: t('summary.seaLevel.value', { value: cm(locale, sea.avoided.median) }),
          detail: t('summary.seaLevel.detail', {
            low: cm(locale, Math.min(sea.avoided.low, sea.avoided.high)),
            high: cm(locale, Math.max(sea.avoided.low, sea.avoided.high)),
            baseline: metres(locale, sea.baseline.median),
            baselineLow: metres(locale, sea.baseline.low),
            baselineHigh: metres(locale, sea.baseline.high),
          }),
          className: 'stat-sea-level',
        },
      ]
    : [];
};

/** The mammals' figure, where the data has farmed and wild mammals. */
const mammalStats = (t: T, locale: string, result: ScenarioResult, wild?: Mammals['wild']) => {
  const m = mammalRatio(result.countries, wild);
  return m ? [mammalStat(t, locale, m)] : [];
};

/**
 * The summary's figures: the warming avoided by the horizon, the emissions avoided as CO₂e and by
 * gas, the land freed, farmed against wild mammals, species committed to extinction and the
 * fish left in the ocean, each module's own figure, and the protein and
 * calories per person.
 */
export const summaryStats = (
  t: T,
  locale: string,
  result: ScenarioResult,
  perCapita: PerCapita,
  completeYear: number,
  horizon: '2050' | '2100',
  options: Options,
  wild?: Mammals['wild'],
  species?: Species,
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
      label: t('summary.co2e'),
      value: formatMass(locale, s.avoidedCo2e, massUnit(s.avoidedCo2e)),
      className: GAS_STAT,
    },
    ...(['ch4', 'n2o', 'co2'] as const).map((gas) => {
      const { key, value } = gasChange(gas, s.avoided[gas]);
      return { label: t(key), value: formatMass(locale, value), className: GAS_STAT };
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
    ...seaLevelStats(t, locale, result),
    ...mammalStats(t, locale, result, wild),
    ...natureStats(t, locale, result, options, species),
    ...SUMMARY_MODULES.flatMap((m) => {
      const own = m.ui.stat?.(result, options, completeYear, format);
      return own ? [own] : [];
    }),
    {
      label: t('summary.protein'),
      value: beforeAfter(t, locale, perCapita.proteinBefore, perCapita.proteinAfter, 1),
      detail: t('summary.gPerDay'),
      className: 'stat-protein',
    },
    {
      label: t('summary.kcal'),
      value: beforeAfter(t, locale, perCapita.kcalBefore, perCapita.kcalAfter, 0),
      detail: t('summary.kcalPerDay'),
      className: 'stat-kcal',
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

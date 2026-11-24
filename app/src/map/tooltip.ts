import type { CountryResult } from '../model/api';
import type { T } from '../i18n/i18n';
import { formatArea, formatMass, formatPercent, formatPerKm2 } from '../i18n/format';
import {
  beforeAfter,
  farmland,
  relativeChange,
  type LandUseCo2,
  type LayerSpec,
  type Measure,
} from './layers';
import { sourceInText, type TierSource } from './sources';

export interface TooltipModel {
  title: string;
  rows: [string, string][];
  source?: { label: string; url: string | null };
}

/** A share, with a decimal under 10% so small shares do not all read 0%. */
const formatShare = (locale: string, v: number): string =>
  formatPercent(locale, v, v > 0 && v < 0.1 ? 1 : 0);

const FORMATS: Record<Measure, (locale: string, v: number) => string> = {
  production: (locale, v) => formatMass(locale, v * 1000),
  emissions: formatMass,
  land: formatArea,
  deforestation: formatArea,
  landShare: formatShare,
  landCo2: formatMass,
  mammals: formatPerKm2,
};

/** A layer's quantity in its unit: tonnes of product, kg of gas, hectares, or a share of land. */
export const formatMeasure =
  (locale: string, kind: Measure) =>
  (v: number): string =>
    FORMATS[kind](locale, v);

/** The CO₂ the clearing releases, today and with the levers. */
const clearingCo2Row = (
  c: CountryResult,
  t: T,
  locale: string,
  label = 'map.tooltip.deforestationCo2',
): [string, string] => [
  t(label),
  t('map.tooltip.beforeAfter', {
    before: formatMass(locale, c.deforestationCo2 ?? 0),
    after: formatMass(locale, (c.deforestationCo2 ?? 0) + (c.deforestationChange ?? 0)),
  }),
];

/** Farmed mammals' live weight, today and with the levers. */
const mammalsRow = (c: CountryResult, t: T, locale: string): [string, string] => [
  t('map.tooltip.mammalsWeight'),
  t('map.tooltip.beforeAfter', {
    before: formatMass(locale, c.mammals * 1000),
    after: formatMass(locale, (c.mammals + c.mammalsChange) * 1000),
  }),
];

/** Cropland and pasture together, hectares today and with the levers. */
const farmlandRow = (c: CountryResult, t: T, locale: string): [string, string] => [
  t('map.tooltip.land'),
  t('map.tooltip.beforeAfter', {
    before: formatArea(locale, farmland(c.land)),
    after: formatArea(locale, farmland(c.land) + farmland(c.landChange)),
  }),
];

const landRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  (['cropland', 'pasture'] as const).map((part) => [
    t(`map.tooltip.${part}`),
    t('map.tooltip.beforeAfter', {
      before: formatArea(locale, c.land[part]),
      after: formatArea(locale, c.land[part] + c.landChange[part]),
    }),
  ]);

interface Extra {
  rows: [string, string][];
  source?: TooltipModel['source'];
}

/** The worst intensity tier and its source, for the layers made from intensities. */
const tierExtra = (c: CountryResult, t: T, worst: TierSource | null): Extra => ({
  rows: [[t('map.tooltip.tier'), t(`tiers.${worst?.tier ?? c.worstTier}`)]],
  source: worst ? sourceInText(worst.source) : undefined,
});

/** What a measure's tooltip is about, and the rows it adds after the change. */
const MEASURE_TOOLTIPS: Record<
  Measure,
  {
    what: (t: T, spec: LayerSpec) => string;
    extra: (c: CountryResult, t: T, locale: string, worst: TierSource | null) => Extra;
  }
> = {
  production: {
    what: (t, spec) => t('map.tooltip.production', { group: t(`groups.${spec.group}`) }),
    extra: (c, t, _, worst) => tierExtra(c, t, worst),
  },
  emissions: {
    what: (t, spec) => t('map.tooltip.emissions', { gas: t(`gases.${spec.gas}`) }),
    extra: (c, t, _, worst) => tierExtra(c, t, worst),
  },
  deforestation: {
    what: (t) => t('map.tooltip.deforestation'),
    extra: (c, t, locale) => ({ rows: [clearingCo2Row(c, t, locale)] }),
  },
  landShare: {
    what: (t) => t('map.tooltip.landShare'),
    extra: (c, t, locale) => ({ rows: [farmlandRow(c, t, locale), ...landRows(c, t, locale)] }),
  },
  land: {
    what: (t) => t('map.tooltip.land'),
    extra: (c, t, locale) => ({ rows: landRows(c, t, locale) }),
  },
  mammals: {
    what: (t) => t('map.tooltip.mammals'),
    extra: (c, t, locale) => ({ rows: [mammalsRow(c, t, locale)] }),
  },
  landCo2: {
    what: (t) => t('map.tooltip.landCo2'),
    extra: (c, t, locale) => ({
      rows: [
        clearingCo2Row(c, t, locale, 'map.tooltip.clearing'),
        ...(c.regrowthCo2 === undefined
          ? []
          : [[t('map.tooltip.regrowth'), formatMass(locale, c.regrowthCo2)] as [string, string]]),
      ],
    }),
  },
};

/** Net land-use CO₂ today and with the levers, then the parts the levers change. */
const landCo2Tooltip = (
  name: string,
  c: CountryResult | undefined,
  landUse: LandUseCo2,
  spec: LayerSpec,
  t: T,
  locale: string,
): TooltipModel => {
  const own = MEASURE_TOOLTIPS.landCo2;
  const ba = c && landUse.has(c.iso3) ? beforeAfter(c, spec, landUse) : null;
  return c && ba
    ? {
        title: name,
        rows: [
          [own.what(t, spec), ''],
          [t('map.tooltip.before'), formatMass(locale, ba.before)],
          [t('map.tooltip.after'), formatMass(locale, ba.after)],
          ...own.extra(c, t, locale, null).rows,
        ],
      }
    : noData(name, t);
};

const noData = (name: string, t: T): TooltipModel => ({
  title: name,
  rows: [[t('map.tooltip.noData'), '']],
});

/** A country's before and after numbers, then the measure's own rows. */
const countryTooltip = (
  name: string,
  c: CountryResult,
  spec: LayerSpec,
  t: T,
  locale: string,
  worst: TierSource | null,
): TooltipModel => {
  const ba = beforeAfter(c, spec);
  const measure = formatMeasure(locale, ba.kind);
  const own = MEASURE_TOOLTIPS[ba.kind];
  const change = relativeChange(ba);
  const extra = own.extra(c, t, locale, worst);
  return {
    title: name,
    rows: [
      [own.what(t, spec), ''],
      [t('map.tooltip.before'), measure(ba.before)],
      [t('map.tooltip.after'), measure(ba.after)],
      [t('map.tooltip.change'), change === null ? '–' : formatPercent(locale, change, 1, true)],
      ...extra.rows,
    ],
    ...(extra.source ? { source: extra.source } : {}),
  };
};

/** Before and after numbers, then the measure's own rows: the tier and its source, or land's parts. */
export const tooltipModel = (
  name: string,
  c: CountryResult | undefined,
  spec: LayerSpec,
  t: T,
  locale: string,
  worst: TierSource | null = null,
  landUse: LandUseCo2 = new Map(),
): TooltipModel =>
  spec.layer === 'landCo2'
    ? landCo2Tooltip(name, c, landUse, spec, t, locale)
    : c
      ? countryTooltip(name, c, spec, t, locale, worst)
      : noData(name, t);

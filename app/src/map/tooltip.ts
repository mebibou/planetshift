import type { CountryResult } from '../model/api';
import type { T } from '../i18n/i18n';
import { formatArea, formatMass, formatPercent } from '../i18n/format';
import { beforeAfter, relativeChange, type BeforeAfter, type LayerSpec } from './layers';
import { sourceInText, type TierSource } from './sources';

export interface TooltipModel {
  title: string;
  rows: [string, string][];
  source?: { label: string; url: string | null };
}

/** A layer's quantity in its unit: tonnes of product, kg of gas or CO₂, or hectares. */
export const formatMeasure =
  (locale: string, kind: BeforeAfter['kind']) =>
  (v: number): string =>
    kind === 'land'
      ? formatArea(locale, v)
      : formatMass(locale, kind === 'production' ? v * 1000 : v);

const landRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  (['cropland', 'pasture'] as const).map((part) => [
    t(`map.tooltip.${part}`),
    t('map.tooltip.beforeAfter', {
      before: formatArea(locale, c.land[part]),
      after: formatArea(locale, c.land[part] + c.landChange[part]),
    }),
  ]);

/** Before and after numbers, the worst intensity tier and its source; for land, its two parts. */
export const tooltipModel = (
  name: string,
  c: CountryResult | undefined,
  spec: LayerSpec,
  t: T,
  locale: string,
  worst: TierSource | null = null,
): TooltipModel => {
  if (!c) return { title: name, rows: [[t('map.tooltip.noData'), '']] };
  const ba = beforeAfter(c, spec);
  const measure = formatMeasure(locale, ba.kind);
  const what =
    ba.kind === 'production'
      ? t('map.tooltip.production', { group: t(`groups.${spec.group}`) })
      : ba.kind === 'emissions'
        ? t('map.tooltip.emissions', { gas: t(`gases.${spec.gas}`) })
        : ba.kind === 'deforestation'
          ? t('map.tooltip.deforestation')
          : t('map.tooltip.land');
  const change = relativeChange(ba);
  const tier = worst?.tier ?? c.worstTier;
  const rows: [string, string][] = [
    [what, ''],
    [t('map.tooltip.before'), measure(ba.before)],
    [t('map.tooltip.after'), measure(ba.after)],
    [t('map.tooltip.change'), change === null ? '–' : formatPercent(locale, change, 1, true)],
  ];
  return ba.kind === 'land'
    ? { title: name, rows: [...rows, ...landRows(c, t, locale)] }
    : ba.kind === 'deforestation'
      ? { title: name, rows }
      : {
          title: name,
          rows: [...rows, [t('map.tooltip.tier'), t(`tiers.${tier}`)]],
          source: worst ? sourceInText(worst.source) : undefined,
        };
};

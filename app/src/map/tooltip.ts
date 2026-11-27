import type { CountryResult } from '../model/api';
import { speciesAfter } from '../model/species';
import type { T } from '../i18n/i18n';
import {
  formatArea,
  formatMass,
  formatPercent,
  formatPerKm2,
  formatSpecies,
  formatSpeciesPerMha,
  formatVolume,
} from '../i18n/format';
import { WASTE_TREATMENTS, WASTE_TYPES } from '../data/types';
import { FOOD_STAGES } from '../levers/waste/foodWaste';
import { WASTE_SECTORS } from '../levers/wasteMethane/data';
import {
  beforeAfter,
  farmland,
  gasValue,
  hasFireData,
  hasWasteData,
  measureOf,
  relativeChange,
  type GasChoice,
  type LandUseCo2,
  type LayerSpec,
  type Measure,
  UNCHANGED,
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

/** Tonnes of carbon, in the mass's unit with C after it. */
const formatCarbon = (locale: string, tonnes: number): string =>
  `${formatMass(locale, tonnes * 1000)}\u00a0C`;

const FORMATS: Record<Measure, (locale: string, v: number) => string> = {
  production: (locale, v) => formatMass(locale, v * 1000),
  emissions: formatMass,
  land: formatArea,
  deforestation: formatArea,
  landShare: formatShare,
  landCo2: formatMass,
  mammals: formatPerKm2,
  species: formatSpecies,
  speciesDensity: formatSpeciesPerMha,
  water: (locale, v) => formatVolume(locale, v),
  waterScarcity: (locale, v) => formatVolume(locale, v, true),
  foodWaste: (locale, v) => formatMass(locale, v * 1000),
  municipalWaste: (locale, v) => formatMass(locale, v * 1000),
  oceanPlastic: (locale, v) => formatMass(locale, v * 1000),
  fossilMethane: formatMass,
  wasteMethane: formatMass,
  fireAnomaly: (locale, v) => formatPercent(locale, v, 0, true),
  forestFireAnomaly: (locale, v) => formatPercent(locale, v, 0, true),
  fireCarbon: (locale, v) => formatCarbon(locale, v),
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

const WHAT_A_WASTE = 'https://datacatalog.worldbank.org/search/dataset/0039597';
const MEIJER = 'https://doi.org/10.1126/sciadv.aaz5803';
const CEDS = 'https://doi.org/10.5281/zenodo.12803197';
const STATE_OF_WILDFIRES = {
  label: 'State of Wildfires 2025-26',
  url: 'https://doi.org/10.5281/zenodo.21262381',
};

/** Food's emissions after the farm in a gas, today and with the levers; none without the file. */
const chainRows = (c: CountryResult, gas: GasChoice, t: T, locale: string): [string, string][] =>
  c.chain && c.chainChange
    ? [
        [
          t('map.tooltip.chain'),
          t('map.tooltip.beforeAfter', {
            before: formatMass(locale, gasValue(c.chain, gas)),
            after: formatMass(locale, gasValue(c.chain, gas) + gasValue(c.chainChange, gas)),
          }),
        ],
      ]
    : [];

/** A mass today and with the levers, under a label. */
const beforeAfterRow = (
  label: string,
  before: number,
  change: number,
  t: T,
  locale: string,
): [string, string] => [
  label,
  t('map.tooltip.beforeAfter', {
    before: formatMass(locale, before),
    after: formatMass(locale, before + change),
  }),
];

/** The CO₂ of the drained organic soils under the country's farming, today and with the levers. */
const drainedRow = (c: CountryResult, t: T, locale: string): [string, string] =>
  beforeAfterRow(t('map.tooltip.drainedCo2'), c.drainedCo2 ?? 0, c.drainedChange ?? 0, t, locale);

/** The N₂O of the same soils, when they emit any. */
const drainedN2oRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  (c.drainedN2o ?? 0) > 0
    ? [
        beforeAfterRow(
          t('map.tooltip.drainedN2o'),
          c.drainedN2o ?? 0,
          c.drainedN2oChange ?? 0,
          t,
          locale,
        ),
      ]
    : [];

/** The methane of the drained soils the levers rewet, when they rewet any. */
const rewettedRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  (c.rewettedCh4 ?? 0) > 0
    ? [[t('map.tooltip.rewettedCh4'), formatMass(locale, c.rewettedCh4 ?? 0)]]
    : [];

/** The CO₂ of clearing forest for farming and of drained soils, in a gas that has CO₂ only. */
const clearingRows = (c: CountryResult, gas: GasChoice, t: T, locale: string) =>
  c.deforestationCo2 !== undefined && (gas === 'co2' || gas === 'co2e')
    ? [
        clearingCo2Row(c, t, locale, 'map.tooltip.clearingCo2'),
        ...((c.drainedCo2 ?? 0) > 0 ? [drainedRow(c, t, locale)] : []),
      ]
    : [];

/** What the food eaten in the country emits per person, in a gas; none without a figure. */
const footprintRows = (c: CountryResult, gas: GasChoice, t: T, locale: string) =>
  c.footprint && c.footprintChange
    ? [
        [
          t('map.tooltip.footprint'),
          t('map.tooltip.beforeAfter', {
            before: formatMass(locale, gasValue(c.footprint, gas)),
            after: formatMass(
              locale,
              gasValue(c.footprint, gas) + gasValue(c.footprintChange, gas),
            ),
          }),
        ] as [string, string],
      ]
    : [];

/**
 * The Emissions layer's food emissions beyond the farm: the chain after it, the clearing, and
 * the footprint per person of the food eaten in the country.
 */
const beyondFarmRows = (c: CountryResult, spec: LayerSpec, t: T, locale: string) =>
  spec.layer === 'emissions'
    ? [
        ...chainRows(c, spec.gas, t, locale),
        ...clearingRows(c, spec.gas, t, locale),
        ...footprintRows(c, spec.gas, t, locale),
      ]
    : [];

/** Farmed mammals' live weight, today and with the levers. */
const mammalsRow = (c: CountryResult, t: T, locale: string): [string, string] => [
  t('map.tooltip.mammalsWeight'),
  t('map.tooltip.beforeAfter', {
    before: formatMass(locale, c.mammals * 1000),
    after: formatMass(locale, (c.mammals + c.mammalsChange) * 1000),
  }),
];

/** The species the farmland commits, today and with the levers. */
const speciesRow = (c: CountryResult, t: T, locale: string): [string, string] => [
  t('map.tooltip.species'),
  t('map.tooltip.beforeAfter', {
    before: formatSpecies(locale, c.species),
    after: formatSpecies(locale, speciesAfter(c)),
  }),
];

/** The land equipped for irrigation, where FAOSTAT gives it. */
const irrigationRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  c.irrigatedHa ? [[t('map.tooltip.irrigated'), formatArea(locale, c.irrigatedHa)]] : [];

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

/** Each stage's food lost or wasted, today and with the levers. */
const foodStageRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  FOOD_STAGES.map((stage) => {
    const before = c.foodWaste?.[stage] ?? 0;
    return [
      t(`map.tooltip.foodStages.${stage}`),
      t('map.tooltip.beforeAfter', {
        before: formatMass(locale, before * 1000),
        after: formatMass(locale, (before + (c.foodWasteChange?.[stage] ?? 0)) * 1000),
      }),
    ];
  });

/** The three largest shares of a record, as "name share" rows under a heading. */
const largestShares = <K extends string>(
  shares: Record<K, number>,
  keys: readonly K[],
  label: (k: K) => string,
  locale: string,
): [string, string][] =>
  [...keys]
    .sort((a, b) => shares[b] - shares[a])
    .slice(0, 3)
    .map((k) => [label(k), formatShare(locale, shares[k])]);

/** Municipal waste per person, its largest types and treatments, and whether they were filled. */
const municipalRows = (c: CountryResult, t: T, locale: string): [string, string][] => {
  const m = c.municipalWaste;
  return m
    ? [
        [t('map.tooltip.perPerson'), formatMass(locale, m.kgPerPerson)],
        [t('map.tooltip.largestTypes'), ''],
        ...largestShares(m.types, WASTE_TYPES, (k) => t(`waste.types.${k}`), locale),
        [t('map.tooltip.largestTreatments'), ''],
        ...largestShares(m.treatment, WASTE_TREATMENTS, (k) => t(`waste.treatments.${k}`), locale),
        ...(m.filled?.length ? [[t('map.tooltip.filled'), ''] as [string, string]] : []),
      ]
    : [];
};

/** A country's leaked methane from oil and gas, and from coal mines. */
const leakRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  c.fossilMethane
    ? [
        [t('map.tooltip.oilGasMethane'), formatMass(locale, c.fossilMethane.oilGas)],
        [t('map.tooltip.coalMineMethane'), formatMass(locale, c.fossilMethane.coal)],
      ]
    : [];
/** Landfills' and wastewater's methane, today and with the levers. */
const wasteSectorRows = (c: CountryResult, t: T, locale: string): [string, string][] =>
  WASTE_SECTORS.map((sector) => {
    const before = c.wasteMethane?.before[sector] ?? 0;
    return [
      t(`map.tooltip.wasteSectors.${sector}`),
      t('map.tooltip.beforeAfter', {
        before: formatMass(locale, before),
        after: formatMass(locale, before + (c.wasteMethane?.change[sector] ?? 0)),
      }),
    ];
  });

/** A figure of the fire season, with its anomaly where the file gives one. */
const withAnomaly = (value: string, anomaly: number | undefined, t: T, locale: string): string =>
  anomaly === undefined
    ? value
    : t('map.tooltip.fires.withAnomaly', {
        value,
        anomaly: formatPercent(locale, anomaly, 0, true),
      });

/** The season's area burned, forest burned and carbon, each against the mean. */
const fireRows = (c: CountryResult, t: T, locale: string): [string, string][] => {
  const f = c.fire;
  return f
    ? [
        [
          t('map.tooltip.fires.burned'),
          withAnomaly(formatArea(locale, f.burned * 100), f.burnedAnomaly, t, locale),
        ],
        [
          t('map.tooltip.fires.forest'),
          withAnomaly(formatArea(locale, f.forest * 100), f.forestAnomaly, t, locale),
        ],
        ...(f.carbon === undefined
          ? []
          : [
              [
                t('map.tooltip.fires.carbon'),
                withAnomaly(formatCarbon(locale, f.carbon), f.carbonAnomaly, t, locale),
              ] as [string, string],
            ]),
      ]
    : [];
};

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
  species: {
    what: (t) => t('map.tooltip.species'),
    extra: (c, t, locale) => ({ rows: [farmlandRow(c, t, locale)] }),
  },
  speciesDensity: {
    what: (t) => t('map.tooltip.speciesDensity'),
    extra: (c, t, locale) => ({ rows: [speciesRow(c, t, locale), farmlandRow(c, t, locale)] }),
  },
  water: {
    what: (t) => t('map.tooltip.water'),
    extra: (c, t, locale) => ({ rows: irrigationRows(c, t, locale) }),
  },
  waterScarcity: {
    what: (t) => t('map.tooltip.waterScarcity'),
    extra: (_, t) => ({ rows: [[t('map.tooltip.waterScarcityCoverage'), '']] }),
  },
  foodWaste: {
    what: (t) => t('map.tooltip.foodWaste'),
    extra: (c, t, locale) => ({ rows: foodStageRows(c, t, locale) }),
  },
  municipalWaste: {
    what: (t) => t('map.tooltip.municipalWaste'),
    extra: (c, t, locale) => ({
      rows: municipalRows(c, t, locale),
      source: { label: 'What a Waste 3.0', url: WHAT_A_WASTE },
    }),
  },
  oceanPlastic: {
    what: (t) => t('map.tooltip.oceanPlastic'),
    extra: () => ({ rows: [], source: { label: 'Meijer et al. (2021)', url: MEIJER } }),
  },
  fossilMethane: {
    what: (t) => t('map.tooltip.fossilMethane'),
    extra: (c, t, locale) => ({ rows: leakRows(c, t, locale) }),
  },
  wasteMethane: {
    what: (t) => t('map.tooltip.wasteMethane'),
    extra: (c, t, locale) => ({
      rows: wasteSectorRows(c, t, locale),
      source: { label: 'CEDS v_2024_07_08', url: CEDS },
    }),
  },
  fireAnomaly: {
    what: (t) => t('map.tooltip.fireAnomaly'),
    extra: (c, t, locale) => ({ rows: fireRows(c, t, locale), source: STATE_OF_WILDFIRES }),
  },
  forestFireAnomaly: {
    what: (t) => t('map.tooltip.forestFireAnomaly'),
    extra: (c, t, locale) => ({ rows: fireRows(c, t, locale), source: STATE_OF_WILDFIRES }),
  },
  fireCarbon: {
    what: (t) => t('map.tooltip.fireCarbon'),
    extra: (c, t, locale) => ({ rows: fireRows(c, t, locale), source: STATE_OF_WILDFIRES }),
  },
  landCo2: {
    what: (t) => t('map.tooltip.landCo2'),
    extra: (c, t, locale) => ({
      rows: [
        clearingCo2Row(c, t, locale, 'map.tooltip.clearing'),
        ...((c.drainedCo2 ?? 0) > 0 ? [drainedRow(c, t, locale)] : []),
        ...drainedN2oRows(c, t, locale),
        ...rewettedRows(c, t, locale),
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

/** The fire measure the layer shows, then the season's three figures; no lever changes them. */
const fireTooltip = (
  name: string,
  c: CountryResult | undefined,
  spec: LayerSpec,
  t: T,
  locale: string,
): TooltipModel => {
  const kind = measureOf(spec);
  const own = MEASURE_TOOLTIPS[kind];
  const extra = c && hasFireData(c, kind) ? own.extra(c, t, locale, null) : null;
  return c && extra
    ? {
        title: name,
        rows: [
          [own.what(t, spec), formatMeasure(locale, kind)(beforeAfter(c, spec).before)],
          ...extra.rows,
          [t('map.tooltip.unchanged'), ''],
        ],
        ...(extra.source ? { source: extra.source } : {}),
      }
    : noData(name, t);
};

const noData = (name: string, t: T): TooltipModel => ({
  title: name,
  rows: [[t('map.tooltip.noData'), '']],
});

/** The rows of a measure no lever changes: its value, and that the levers leave it as it is. */
const unchangedRows = (what: string, value: string, t: T): [string, string][] => [
  [what, ''],
  [t('map.tooltip.before'), value],
  [t('map.tooltip.unchanged'), ''],
];

/** The rows of a measure the levers change: today, with the levers and the change. */
const changedRows = (
  what: string,
  measure: (v: number) => string,
  ba: ReturnType<typeof beforeAfter>,
  t: T,
  locale: string,
): [string, string][] => {
  const change = relativeChange(ba);
  return [
    [what, ''],
    [t('map.tooltip.before'), measure(ba.before)],
    [t('map.tooltip.after'), measure(ba.after)],
    [t('map.tooltip.change'), change === null ? '–' : formatPercent(locale, change, 1, true)],
  ];
};

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
  const extra = own.extra(c, t, locale, worst);
  const what = own.what(t, spec);
  return {
    title: name,
    rows: [
      ...(UNCHANGED.includes(ba.kind)
        ? unchangedRows(what, measure(ba.before), t)
        : changedRows(what, measure, ba, t, locale)),
      ...beyondFarmRows(c, spec, t, locale),
      ...extra.rows,
    ],
    ...(extra.source ? { source: extra.source } : {}),
  };
};

/** Whether the layer has data for a country: every layer but waste and leaked methane has it for every country. */
const hasData = (c: CountryResult, spec: LayerSpec): boolean =>
  spec.layer === 'fossilMethane'
    ? c.fossilMethane !== undefined
    : spec.layer !== 'waste' || hasWasteData(c, measureOf(spec));

/** A country's tooltip on a layer the run gives it data for, or no data. */
const runTooltip = (
  name: string,
  c: CountryResult | undefined,
  spec: LayerSpec,
  t: T,
  locale: string,
  worst: TierSource | null,
): TooltipModel =>
  c && hasData(c, spec) ? countryTooltip(name, c, spec, t, locale, worst) : noData(name, t);

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
    : spec.layer === 'fires'
      ? fireTooltip(name, c, spec, t, locale)
      : runTooltip(name, c, spec, t, locale, worst);

import { GASES, type Gas, type GasVector, type Group, type LandUse } from '../data/types';
import { GWP100, type CountryResult } from '../model/api';

export const LAYERS = [
  'production',
  'emissions',
  'land',
  'deforestation',
  'landCo2',
  'change',
  'quality',
] as const;
export type Layer = (typeof LAYERS)[number];
export const CHANGE_OF = ['production', 'emissions', 'land'] as const;
export type ChangeOf = (typeof CHANGE_OF)[number];
/**
 * What a layer measures: a quantity the Change layer also offers, the forest area cleared, the
 * share of a country's land that is farmed, or its net land-use CO₂.
 */
export type Measure = ChangeOf | 'deforestation' | 'landShare' | 'landCo2';
export type GasChoice = Gas | 'co2e';
export const GAS_CHOICES: GasChoice[] = ['co2e', ...GASES];
export type GroupChoice = Group | 'all';

export interface LayerSpec {
  layer: Layer;
  changeOf: ChangeOf;
  group: GroupChoice;
  gas: GasChoice;
}

/** Each country's net land-use CO₂, kg a year; no lever changes it. */
export type LandUseCo2 = ReadonlyMap<string, number>;

export const landUseCo2 = (file: LandUse | undefined): LandUseCo2 =>
  new Map(Object.entries(file?.byCountry ?? {}).map(([iso3, t]) => [iso3, t * 1000]));

export const co2e = (v: GasVector): number => GASES.reduce((s, g) => s + v[g] * GWP100[g], 0);

export const gasValue = (v: GasVector, gas: GasChoice): number =>
  gas === 'co2e' ? co2e(v) : v[gas];

export const groupValue = (rec: Partial<Record<Group, number>>, group: GroupChoice): number =>
  group === 'all'
    ? Object.values(rec).reduce((s: number, v) => s + (v ?? 0), 0)
    : (rec[group] ?? 0);

/** Hectares of cropland and pasture together. */
export const farmland = (l: { cropland: number; pasture: number }): number =>
  l.cropland + l.pasture;

/**
 * What the layer measures for a country, before and after: tonnes of product, kg of gas,
 * hectares of farmland, hectares of forest cleared or kg of land-use CO₂.
 */
export interface BeforeAfter {
  kind: Measure;
  before: number;
  after: number;
}

export const measureOf = (spec: Pick<LayerSpec, 'layer' | 'changeOf'>): Measure =>
  spec.layer === 'change'
    ? spec.changeOf
    : spec.layer === 'land'
      ? 'landShare'
      : spec.layer === 'emissions' || spec.layer === 'deforestation' || spec.layer === 'landCo2'
        ? spec.layer
        : 'production';

/** The deforestation module's fields of a country: forest cleared a year, ha, and its change. */
const clearing = (c: CountryResult): [number, number] => [
  c.deforestationHa ?? 0,
  c.deforestationHaChange ?? 0,
];

/** Farmland as a share of the country's land area, and its change; none without the area. */
const landShare = (c: CountryResult): [number, number] =>
  c.landArea > 0 ? [farmland(c.land) / c.landArea, farmland(c.landChange) / c.landArea] : [0, 0];

const MEASURES: Record<
  Measure,
  (c: CountryResult, spec: LayerSpec, landUse: LandUseCo2) => [number, number]
> = {
  production: (c, spec) => [
    groupValue(c.production, spec.group),
    groupValue(c.productionChange, spec.group),
  ],
  emissions: (c, spec) => [gasValue(c.emissions, spec.gas), gasValue(c.emissionsChange, spec.gas)],
  deforestation: clearing,
  land: (c) => [farmland(c.land), farmland(c.landChange)],
  landShare,
  landCo2: (c, _, landUse) => [landUse.get(c.iso3) ?? 0, 0],
};

export const beforeAfter = (
  c: CountryResult,
  spec: LayerSpec,
  landUse: LandUseCo2 = new Map(),
): BeforeAfter => {
  const kind = measureOf(spec);
  const [before, change] = MEASURES[kind](c, spec, landUse);
  return { kind, before, after: before + change };
};

/** Relative change, or null when there was nothing before. */
export const relativeChange = ({ before, after }: BeforeAfter): number | null =>
  before > 0 ? (after - before) / before : null;

type Value = (c: CountryResult, ba: BeforeAfter, landUse: LandUseCo2) => number | null;

const positiveAfter: Value = (_, ba) => (ba.after > 0 ? ba.after : null);

const VALUES: Partial<Record<Layer, Value>> = {
  quality: (c) => c.worstTier,
  change: (_, ba) => relativeChange(ba),
  landCo2: (c, _, landUse) => landUse.get(c.iso3) ?? null,
};

/** The number the map colours a country by, or null for no data. */
export const layerValue = (
  c: CountryResult,
  spec: LayerSpec,
  landUse: LandUseCo2 = new Map(),
): number | null => (VALUES[spec.layer] ?? positiveAfter)(c, beforeAfter(c, spec), landUse);

export const layerValues = (
  countries: CountryResult[],
  spec: LayerSpec,
  landUse: LandUseCo2 = new Map(),
): Map<string, number | null> =>
  new Map(countries.map((c) => [c.iso3, layerValue(c, spec, landUse)]));

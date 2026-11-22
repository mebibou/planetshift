import { GASES, type Gas, type GasVector, type Group } from '../data/types';
import { GWP100, type CountryResult } from '../model/api';

export const LAYERS = [
  'production',
  'emissions',
  'land',
  'deforestation',
  'change',
  'quality',
] as const;
export type Layer = (typeof LAYERS)[number];
export const CHANGE_OF = ['production', 'emissions', 'land'] as const;
export type ChangeOf = (typeof CHANGE_OF)[number];
/** What a layer measures: a quantity the Change layer also offers, or forest clearing's CO₂. */
export type Measure = ChangeOf | 'deforestation';
export type GasChoice = Gas | 'co2e';
export const GAS_CHOICES: GasChoice[] = ['co2e', ...GASES];
export type GroupChoice = Group | 'all';

export interface LayerSpec {
  layer: Layer;
  changeOf: ChangeOf;
  group: GroupChoice;
  gas: GasChoice;
}

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
 * hectares of farmland or kg of CO₂ from forest clearing.
 */
export interface BeforeAfter {
  kind: Measure;
  before: number;
  after: number;
}

export const measureOf = (spec: Pick<LayerSpec, 'layer' | 'changeOf'>): Measure =>
  spec.layer === 'change'
    ? spec.changeOf
    : spec.layer === 'emissions' || spec.layer === 'land' || spec.layer === 'deforestation'
      ? spec.layer
      : 'production';

/** The deforestation module's fields of a country: CO₂ from clearing a year, and its change. */
const clearing = (c: CountryResult): [number, number] => [
  c.deforestationCo2 ?? 0,
  c.deforestationChange ?? 0,
];

const beforeAndChange = (c: CountryResult, spec: LayerSpec, kind: Measure): [number, number] =>
  kind === 'production'
    ? [groupValue(c.production, spec.group), groupValue(c.productionChange, spec.group)]
    : kind === 'emissions'
      ? [gasValue(c.emissions, spec.gas), gasValue(c.emissionsChange, spec.gas)]
      : kind === 'deforestation'
        ? clearing(c)
        : [farmland(c.land), farmland(c.landChange)];

export const beforeAfter = (c: CountryResult, spec: LayerSpec): BeforeAfter => {
  const kind = measureOf(spec);
  const [before, change] = beforeAndChange(c, spec, kind);
  return { kind, before, after: before + change };
};

/** Relative change, or null when there was nothing before. */
export const relativeChange = ({ before, after }: BeforeAfter): number | null =>
  before > 0 ? (after - before) / before : null;

/** The number the map colours a country by, or null for no data. */
export const layerValue = (c: CountryResult, spec: LayerSpec): number | null => {
  if (spec.layer === 'quality') return c.worstTier;
  const ba = beforeAfter(c, spec);
  if (spec.layer === 'change') return relativeChange(ba);
  return ba.after > 0 ? ba.after : null;
};

export const layerValues = (
  countries: CountryResult[],
  spec: LayerSpec,
): Map<string, number | null> => new Map(countries.map((c) => [c.iso3, layerValue(c, spec)]));

import {
  FARM_GASES,
  GASES,
  type Gas,
  type GasVector,
  type Group,
  type LandUse,
} from '../data/types';
import { GWP100, type CountryResult } from '../model/api';
import { speciesAfter } from '../model/species';

export const LAYERS = [
  'production',
  'emissions',
  'land',
  'deforestation',
  'landCo2',
  'mammals',
  'species',
  'water',
  'waterScarcity',
  'waste',
  'fossilMethane',
  'change',
  'quality',
] as const;
export type Layer = (typeof LAYERS)[number];
export const CHANGE_OF = ['production', 'emissions', 'land'] as const;
export type ChangeOf = (typeof CHANGE_OF)[number];
/**
 * What a layer measures: a quantity the Change layer also offers, the forest area cleared, the
 * share of a country's land that is farmed, its net land-use CO₂, its farmed mammals' live
 * weight per km² of land, the species its farmland commits to extinction, the freshwater its
 * farming withdraws, the scarcity-weighted water use of the crops HESTIA covers, the food lost
 * and wasted, the municipal solid waste, the plastic reaching the ocean or the methane leaked by
 * oil, gas and coal.
 */
export type Measure =
  | ChangeOf
  | 'deforestation'
  | 'landShare'
  | 'landCo2'
  | 'mammals'
  | 'species'
  | 'speciesDensity'
  | 'water'
  | 'waterScarcity'
  | 'foodWaste'
  | 'municipalWaste'
  | 'oceanPlastic'
  | 'fossilMethane';

/** What each layer but Change measures, production where it is not listed. */
const LAYER_MEASURES: Partial<Record<Layer, Measure>> = {
  emissions: 'emissions',
  land: 'landShare',
  deforestation: 'deforestation',
  landCo2: 'landCo2',
  mammals: 'mammals',
  water: 'water',
  waterScarcity: 'waterScarcity',
  fossilMethane: 'fossilMethane',
};
export type GasChoice = Gas | 'co2e';
/** The farm's gases and CO₂e, which also counts the refrigerants after the farm. */
export const GAS_CHOICES: GasChoice[] = ['co2e', ...FARM_GASES];
export type GroupChoice = Group | 'all';

/** The species layer: each country's count, or its count per Mha of farmland. */
export const SPECIES_PER = ['country', 'farmland'] as const;
export type SpeciesPer = (typeof SPECIES_PER)[number];

/** The waste layer: food lost and wasted, municipal solid waste, or plastic reaching the ocean. */
export const WASTE_OF = ['food', 'municipal', 'plastic'] as const;
export type WasteOf = (typeof WASTE_OF)[number];
const WASTE_MEASURES: Record<WasteOf, Measure> = {
  food: 'foodWaste',
  municipal: 'municipalWaste',
  plastic: 'oceanPlastic',
};
/** The measures no lever changes: their value with the levers is today's. */
export const UNCHANGED: readonly Measure[] = ['municipalWaste', 'oceanPlastic'];

export interface LayerSpec {
  layer: Layer;
  changeOf: ChangeOf;
  group: GroupChoice;
  gas: GasChoice;
  speciesPer?: SpeciesPer;
  wasteOf?: WasteOf;
}

/** Each country's measured net land-use CO₂, kg a year. */
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

type MeasureSpec = Pick<LayerSpec, 'layer' | 'changeOf' | 'speciesPer' | 'wasteOf'>;

/** The layers whose measure depends on one of their choices. */
const CHOSEN_MEASURES: Partial<Record<Layer, (spec: MeasureSpec) => Measure>> = {
  change: (spec) => spec.changeOf,
  species: (spec) => (spec.speciesPer === 'farmland' ? 'speciesDensity' : 'species'),
  waste: (spec) => WASTE_MEASURES[spec.wasteOf ?? 'food'],
};

export const measureOf = (spec: MeasureSpec): Measure =>
  CHOSEN_MEASURES[spec.layer]?.(spec) ?? LAYER_MEASURES[spec.layer] ?? 'production';

/** The deforestation module's fields of a country: forest cleared a year, ha, and its change. */
const clearing = (c: CountryResult): [number, number] => [
  c.deforestationHa ?? 0,
  c.deforestationHaChange ?? 0,
];

/** The levers' change in a country's land-use CO₂, kg a year: clearing, drained soils, regrowth. */
export const landCo2Change = (c: CountryResult): number =>
  (c.deforestationChange ?? 0) + (c.drainedChange ?? 0) - (c.regrowthCo2 ?? 0);

/** Farmland as a share of the country's land area, and its change; none without the area. */
const landShare = (c: CountryResult): [number, number] =>
  c.landArea > 0 ? [farmland(c.land) / c.landArea, farmland(c.landChange) / c.landArea] : [0, 0];

const KM2_PER_HA = 0.01;

/**
 * Farmed mammals' live weight per km² of the country's land, tonnes, and its change; none
 * without the area.
 */
export const mammalDensity = (c: CountryResult): [number, number] =>
  c.landArea > 0
    ? [c.mammals / (c.landArea * KM2_PER_HA), c.mammalsChange / (c.landArea * KM2_PER_HA)]
    : [0, 0];

const HA_PER_MHA = 1e6;

const perMha = (species: number, ha: number): number => (ha > 0 ? (species / ha) * HA_PER_MHA : 0);

/** Species committed per Mha of the country's farmland, today and its change with the levers. */
export const speciesDensity = (c: CountryResult): [number, number] => {
  const before = perMha(c.species, farmland(c.land));
  const farmAfter = farmland(c.land) + farmland(c.landChange);
  return [before, perMha(speciesAfter(c), farmAfter) - before];
};

const total = (stages: Readonly<Record<string, number>> | undefined): number =>
  Object.values(stages ?? {}).reduce((a, b) => a + b, 0);

/** Food lost and wasted by every stage together, tonnes a year, and its change with the levers. */
export const foodWasteTotal = (c: CountryResult): [number, number] => [
  total(c.foodWaste),
  total(c.foodWasteChange),
];

/** Whether a country has data for a waste measure. */
const WASTE_DATA: Partial<Record<Measure, (c: CountryResult) => boolean>> = {
  foodWaste: (c) => total(c.foodWaste) > 0,
  municipalWaste: (c) => c.municipalWaste !== undefined,
  oceanPlastic: (c) => c.oceanPlastic !== undefined,
};

/** Methane leaked by the country's oil, gas and coal in CEDS's year, kg. */
export const leakedMethane = (c: CountryResult): number =>
  c.fossilMethane ? c.fossilMethane.oilGas + c.fossilMethane.coal : 0;

export const hasWasteData = (c: CountryResult, kind: Measure): boolean =>
  WASTE_DATA[kind]?.(c) ?? false;

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
  landCo2: (c, _, landUse) => [landUse.get(c.iso3) ?? 0, landCo2Change(c)],
  mammals: mammalDensity,
  species: (c) => [c.species, speciesAfter(c) - c.species],
  speciesDensity,
  water: (c) => [c.water, c.waterChange],
  waterScarcity: (c) => [c.waterScarcity, c.waterScarcityChange],
  foodWaste: foodWasteTotal,
  municipalWaste: (c) => [c.municipalWaste?.tonnes ?? 0, 0],
  oceanPlastic: (c) => [c.oceanPlastic ?? 0, 0],
  fossilMethane: (c) => [leakedMethane(c), c.fossilMethaneChange ?? 0],
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
  landCo2: (c, ba, landUse) => (landUse.has(c.iso3) ? ba.after : null),
  mammals: (c, ba) => (c.mammals > 0 && c.landArea > 0 ? ba.after : null),
  species: (c, ba) => (c.species > 0 ? ba.after : null),
  water: (c, ba) => (c.water > 0 ? ba.after : null),
  waterScarcity: (c, ba) => (c.waterScarcity > 0 ? ba.after : null),
  waste: (c, ba) => (hasWasteData(c, ba.kind) ? ba.after : null),
  fossilMethane: (c, ba) => (c.fossilMethane ? ba.after : null),
};

/** The number the map colours a country by, or null for no data. */
export const layerValue = (
  c: CountryResult,
  spec: LayerSpec,
  landUse: LandUseCo2 = new Map(),
): number | null =>
  (VALUES[spec.layer] ?? positiveAfter)(c, beforeAfter(c, spec, landUse), landUse);

export const layerValues = (
  countries: CountryResult[],
  spec: LayerSpec,
  landUse: LandUseCo2 = new Map(),
): Map<string, number | null> =>
  new Map(countries.map((c) => [c.iso3, layerValue(c, spec, landUse)]));

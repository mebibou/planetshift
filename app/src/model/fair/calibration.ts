// The calibrated, constrained FaIR parameters (fair-calibrate v1.4.1) as the pipeline's
// `fair_ts_export` writes them: FaIR's own species and climate configs after it has read the
// calibration CSVs, so nothing here re-derives what FaIR fills in.

import { discretise, type Discrete } from './ebm';

/** An array with a leading config axis, given once when every config holds the same values. */
export type Compact = { perConfig: boolean; values: unknown };

export type SpecieFile = {
  name: string;
  type: string;
  inputMode: string;
  greenhouse_gas: boolean;
  aerosol_chemistry_from_emissions: boolean;
  aerosol_chemistry_from_concentration: boolean;
};

export type CalibrationFile = {
  species: SpecieFile[];
  configs: number[];
  speciesConfigs: Record<string, Compact>;
  climateConfigs: Record<string, Compact>;
  timebounds: number[];
  naturalForcing: Record<'Volcanic' | 'Solar', (number | null)[]>;
};

/** Per-specie parameters of one member, NaN where FaIR leaves them undefined. */
export type MemberParams = {
  /** forcing_scale × (1 + tropospheric_adjustment), as FaIR scales the forcing it calculates. */
  scale: Float64Array;
  /** forcing_scale alone, as climate_fair scales the forcing it prescribes. */
  prescribedScale: Float64Array;
  efficacy: Float64Array;
  feedback: Float64Array;
  baselineConcentration: Float64Array;
  referenceConcentration: Float64Array;
  baselineEmissions: Float64Array;
  iirf0: Float64Array;
  iirfAirborne: Float64Array;
  iirfUptake: Float64Array;
  iirfTemperature: Float64Array;
  g0: Float64Array;
  g1: Float64Array;
  ghgEfficiency: Float64Array;
  ariEfficiency: Float64Array;
  ozoneEfficiency: Float64Array;
  lapsiEfficiency: Float64Array;
  h2oFactor: Float64Array;
  landUseFactor: Float64Array;
  aciShape: Float64Array;
  fractionalRelease: Float64Array;
  ch4Chemistry: Float64Array;
  /** Gas boxes, specie-major: [specie × 4 + box]. */
  partition: Float64Array;
  lifetime: Float64Array;
  aciScale: number;
  ch4TemperatureSensitivity: number;
  ebm: Discrete;
};

export type SpecieIndex = Record<
  | 'co2'
  | 'co2Ffi'
  | 'co2Afolu'
  | 'ch4'
  | 'n2o'
  | 'cfc11'
  | 'eesc'
  | 'ari'
  | 'aci'
  | 'ozone'
  | 'lapsi'
  | 'h2o'
  | 'landUse'
  | 'solar'
  | 'volcanic',
  number
>;

export type Model = {
  species: SpecieFile[];
  names: string[];
  index: SpecieIndex;
  /** Greenhouse gases run forward from emissions (FaIR's `_ghg_forward_indices`). */
  ghg: number[];
  minorGhg: number[];
  halogens: number[];
  fromEmissions: number[];
  fromConcentration: number[];
  /** Greenhouse gases whose gas cycle is the same in every member and depends on no state, so
   * their concentrations are run once per scenario. */
  fixed: number[];
  /** The minor greenhouse gases grouped by their forcing scale, which is the same in every member
   * within a group, so each group's forcing is summed once per scenario. */
  minorGroups: number[][];
  concentrationPerEmission: Float64Array;
  clAtoms: Float64Array;
  brAtoms: Float64Array;
  timebounds: number[];
  natural: { volcanic: Float64Array; solar: Float64Array };
  members: MemberParams[];
};

export const GASBOXES = 4;

const TYPES: Record<keyof SpecieIndex, string> = {
  co2: 'co2',
  co2Ffi: 'co2 ffi',
  co2Afolu: 'co2 afolu',
  ch4: 'ch4',
  n2o: 'n2o',
  cfc11: 'cfc-11',
  eesc: 'eesc',
  ari: 'ari',
  aci: 'aci',
  ozone: 'ozone',
  lapsi: 'lapsi',
  h2o: 'h2o stratospheric',
  landUse: 'land use',
  solar: 'solar',
  volcanic: 'volcanic',
};

const numbers = (values: unknown): Float64Array =>
  Float64Array.from(values as (number | null)[], (v) => (v === null ? NaN : v));

/** A config-first array's values for member `m`. */
const ofMember = (compact: Compact, m: number): unknown =>
  compact.perConfig ? (compact.values as unknown[])[m] : compact.values;

const vector = (file: CalibrationFile, name: string, m: number): Float64Array =>
  numbers(ofMember(file.speciesConfigs[name] as Compact, m));

const boxes = (file: CalibrationFile, name: string, m: number): Float64Array =>
  numbers((ofMember(file.speciesConfigs[name] as Compact, m) as unknown[][]).flat());

const scalar = (configs: Record<string, Compact>, name: string, m: number): number =>
  ofMember(configs[name] as Compact, m) as number;

const layers = (file: CalibrationFile, name: string, m: number): number[] =>
  ofMember(file.climateConfigs[name] as Compact, m) as number[];

export const memberParams = (file: CalibrationFile, m: number): MemberParams => {
  const v = (name: string) => vector(file, name, m);
  const adjustment = v('tropospheric_adjustment');
  const prescribedScale = v('forcing_scale');
  return {
    scale: prescribedScale.map((s, i) => s * (1 + (adjustment[i] as number))),
    prescribedScale,
    efficacy: v('forcing_efficacy'),
    feedback: v('forcing_temperature_feedback'),
    baselineConcentration: v('baseline_concentration'),
    referenceConcentration: v('forcing_reference_concentration'),
    baselineEmissions: v('baseline_emissions'),
    iirf0: v('iirf_0'),
    iirfAirborne: v('iirf_airborne'),
    iirfUptake: v('iirf_uptake'),
    iirfTemperature: v('iirf_temperature'),
    g0: v('g0'),
    g1: v('g1'),
    ghgEfficiency: v('greenhouse_gas_radiative_efficiency'),
    ariEfficiency: v('erfari_radiative_efficiency'),
    ozoneEfficiency: v('ozone_radiative_efficiency'),
    lapsiEfficiency: v('lapsi_radiative_efficiency'),
    h2oFactor: v('h2o_stratospheric_factor'),
    landUseFactor: v('land_use_cumulative_emissions_to_forcing'),
    aciShape: v('aci_shape'),
    fractionalRelease: v('fractional_release'),
    ch4Chemistry: v('ch4_lifetime_chemical_sensitivity'),
    partition: boxes(file, 'partition_fraction', m),
    lifetime: boxes(file, 'unperturbed_lifetime', m),
    aciScale: scalar(file.speciesConfigs, 'aci_scale', m),
    ch4TemperatureSensitivity: scalar(file.speciesConfigs, 'lifetime_temperature_sensitivity', m),
    ebm: discretise({
      heatCapacity: layers(file, 'ocean_heat_capacity', m),
      heatTransfer: layers(file, 'ocean_heat_transfer', m),
      deepOceanEfficacy: scalar(file.climateConfigs, 'deep_ocean_efficacy', m),
      gamma: scalar(file.climateConfigs, 'gamma_autocorrelation', m),
    }),
  };
};

const indicesWhere = (species: readonly SpecieFile[], keep: (s: SpecieFile) => boolean) =>
  species.flatMap((s, i) => (keep(s) ? [i] : []));

const GAS_CYCLE: (keyof MemberParams)[] = [
  'iirf0',
  'iirfAirborne',
  'iirfUptake',
  'iirfTemperature',
  'g0',
  'g1',
  'baselineConcentration',
  'baselineEmissions',
];

/** A specie's gas cycle is a fixed function of its emissions: no feedback on its lifetime, and
 * every member's parameters the same. */
const isFixed = (members: readonly MemberParams[], s: number): boolean => {
  const first = members[0] as MemberParams;
  const at = (p: MemberParams, key: keyof MemberParams) => (p[key] as Float64Array)[s] as number;
  const noFeedback = (['iirfAirborne', 'iirfUptake', 'iirfTemperature'] as const).every(
    (k) => at(first, k) === 0,
  );
  const same = (p: MemberParams) =>
    GAS_CYCLE.every((k) => Object.is(at(p, k), at(first, k))) &&
    [0, 1, 2, 3].every((b) => p.lifetime[s * GASBOXES + b] === first.lifetime[s * GASBOXES + b]);
  return noFeedback && members.every(same);
};

/** Species whose forcing scale is the same as each other's in every member. */
const byScale = (members: readonly MemberParams[], species: readonly number[]): number[][] => {
  const key = (s: number) => members.map((p) => p.scale[s]).join(',');
  const groups = new Map<string, number[]>();
  species.forEach((s) => groups.set(key(s), [...(groups.get(key(s)) ?? []), s]));
  return [...groups.values()];
};

/** What the prepared scenario takes as fixed must be: a minor gas run per member, or one
 * with a temperature feedback, would be read wrongly. */
const checked = (model: Model): Model => {
  const first = model.members[0] as MemberParams;
  const unfixed = model.minorGhg.filter((s) => !model.fixed.includes(s));
  const minorFeedback = model.minorGhg.filter((s) => first.feedback[s] !== 0);
  if (unfixed.length + minorFeedback.length > 0) {
    throw new Error(
      `FaIR port: unsupported calibration (${[...unfixed, ...minorFeedback].map((s) => model.names[s]).join(', ')})`,
    );
  }
  return model;
};

/** The model for `members` (indices into the calibration's configs; all of them by default). */
export const loadModel = (file: CalibrationFile, members?: readonly number[]): Model => {
  const { species } = file;
  const typed = (type: string) => species.findIndex((s) => s.type === type);
  const index = Object.fromEntries(
    Object.entries(TYPES).map(([k, type]) => [k, typed(type)]),
  ) as SpecieIndex;
  const params = (members ?? file.configs.map((_, m) => m)).map((m) => memberParams(file, m));
  const ghg = indicesWhere(
    species,
    (s) => s.greenhouse_gas && (s.inputMode === 'emissions' || s.inputMode === 'calculated'),
  );
  const majors = [index.co2, index.ch4, index.n2o];
  const fixed = ghg.filter((s) => s !== index.co2 && s !== index.ch4 && isFixed(params, s));
  const minorGhg = ghg.filter((s) => !majors.includes(s));
  return checked({
    species,
    names: species.map((s) => s.name),
    index,
    ghg,
    minorGhg,
    halogens: indicesWhere(species, (s) => s.type === 'cfc-11' || s.type === 'other halogen'),
    fromEmissions: indicesWhere(species, (s) => s.aerosol_chemistry_from_emissions),
    fromConcentration: indicesWhere(species, (s) => s.aerosol_chemistry_from_concentration),
    fixed,
    minorGroups: byScale(params, minorGhg),
    concentrationPerEmission: numbers(file.speciesConfigs.concentration_per_emission?.values),
    clAtoms: numbers(file.speciesConfigs.cl_atoms?.values),
    brAtoms: numbers(file.speciesConfigs.br_atoms?.values),
    timebounds: file.timebounds,
    natural: {
      volcanic: numbers(file.naturalForcing.Volcanic),
      solar: numbers(file.naturalForcing.Solar),
    },
    members: params,
  });
};

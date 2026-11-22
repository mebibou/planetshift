import type { Options, Scenario } from '../../src/model/api';

/** The levers by id, written out so the grid does not depend on the code it checks. */
const PRACTICES = [
  'feedAdditives',
  'breedingAndFeed',
  'manureManagement',
  'riceWater',
  'nitrogenEfficiency',
  'nitrificationInhibitors',
  'farmEnergy',
];
const WASTE = ['foodWaste', 'supplyLosses'];
const REMOVALS = ['coverCrops', 'agroforestry', 'biochar', 'enhancedWeathering'];
const ENERGY = [
  'electricCars',
  'electricTrucks',
  'flyLess',
  'cleanAviationFuel',
  'cleanShipping',
  'renewableElectricity',
  'cleanDataCentres',
];
export const GOLDEN_LEVERS = [...PRACTICES, ...WASTE, 'deforestation', ...REMOVALS, ...ENERGY];
/** Recorded on their own, so the settings above keep their results. */
const INDUSTRY = ['cleanHeating', 'cleanIndustry'];

const BASE: Scenario = {
  shift: 0,
  groupShifts: {},
  basis: 'protein',
  replacement: 'current',
  rampEnd: 2035,
  where: 'world',
  levers: {},
};

export interface Setting {
  id: string;
  scenario: Scenario;
  options: Partial<Options>;
}

const all = (ids: readonly string[], adoption = 1) =>
  Object.fromEntries(ids.map((id) => [id, adoption]));

const setting = (
  id: string,
  scenario: Partial<Scenario>,
  options: Partial<Options> = {},
): Setting => ({ id, scenario: { ...BASE, ...scenario }, options });

/** A scenario where every family acts a little, to show each option's effect. */
const MIXED: Partial<Scenario> = {
  shift: 0.3,
  levers: {
    feedAdditives: 0.5,
    foodWaste: 0.5,
    supplyLosses: 0.5,
    deforestation: 0.5,
    coverCrops: 0.5,
    electricCars: 0.5,
    flyLess: 0.5,
    cleanDataCentres: 0.5,
  },
};

const OPTION_CASES: [string, Partial<Options>][] = [
  ['cradle', { scope: 'cradleToFarmGate' }],
  ['gleam', { feed: 'gleam' }],
  ['ssp2Baseline', { baseline: 'ssp2' }],
  ['domestic', { location: 'domestic' }],
  ['berkeley', { temperature: 'berkeley' }],
  ['ar6', { climate: 'ar6' }],
  ['ssp126', { ssp: 'ssp126' }],
  ['ssp370', { ssp: 'ssp370' }],
  ['regrowth', { regrowth: 'natural' }],
  ['dcSsp', { dataCentres: 'ssp' }],
  ['permafrost', { permafrost: 'on' }],
  ['popLow', { population: 'low' }],
  ['popHigh', { population: 'high' }],
];

const SCENARIO_CASES: [string, Partial<Scenario>][] = [
  ['kcal', { basis: 'kcal' }],
  ['legumes', { replacement: 'legumes' }],
  ['plantMilk', { replacement: 'plantMilk' }],
  ['highIncome', { where: 'highIncome' }],
  ['ramp2030', { rampEnd: 2030 }],
  ['ramp2050', { rampEnd: 2050 }],
];

/** Every setting the goldens record. */
export const GRID: Setting[] = [
  setting('none', {}),
  ...GOLDEN_LEVERS.flatMap((id) =>
    [0.5, 1].map((a) => setting(`${id}@${a * 100}`, { levers: { [id]: a } })),
  ),
  setting('allPractices', { levers: all(PRACTICES) }),
  setting('allEnergy', { levers: all(ENERGY) }),
  setting('allRemovals', { levers: all(REMOVALS) }),
  setting('everything', { shift: 0.5, replacement: 'legumes', levers: all(GOLDEN_LEVERS) }),
  setting(
    'everythingAllOptions',
    { shift: 0.5, levers: all(GOLDEN_LEVERS, 0.7) },
    { regrowth: 'natural', permafrost: 'on', scope: 'cradleToFarmGate' },
  ),
  ...[0, 0.1, 0.5, 1].map((s) => setting(`shift${s * 100}`, { shift: s })),
  setting('groupOverrides', { shift: 0.5, groupShifts: { ruminantMeat: 1, dairy: 0, eggs: 0.2 } }),
  setting('lessFish', { groupShifts: { seafood: 0.5 }, replacement: 'legumes' }),
  setting('dairyToPlantMilk', { groupShifts: { dairy: 1 }, replacement: 'plantMilk' }),
  setting('noAnimalFarming', {
    shift: 1,
    groupShifts: all(['ruminantMeat', 'pigMeat', 'poultryMeat', 'dairy', 'eggs', 'seafood']),
  }),
  setting('mixed', MIXED),
  ...OPTION_CASES.map(([id, options]) => setting(`mixed+${id}`, MIXED, options)),
  ...SCENARIO_CASES.map(([id, s]) => setting(`mixed+${id}`, { ...MIXED, ...s })),
  ...OPTION_CASES.map(([id, options]) => setting(`shift50+${id}`, { shift: 0.5 }, options)),
  setting('permafrostAlone', {}, { permafrost: 'on' }),
  setting('dcSspAlone', {}, { dataCentres: 'ssp' }),
  setting('regrowthAlone', { shift: 0.4 }, { regrowth: 'natural' }),
  setting('popLowAlone', {}, { population: 'low' }),
  setting('popHighSsp126', { shift: 0.5 }, { population: 'high', ssp: 'ssp126' }),
  ...INDUSTRY.flatMap((id) =>
    [0.5, 1].map((a) => setting(`${id}@${a * 100}`, { levers: { [id]: a } })),
  ),
  setting('allIndustry', { levers: all(INDUSTRY) }),
  setting('allIndustry+renewables', { levers: all([...INDUSTRY, 'renewableElectricity']) }),
  ...['ssp126', 'ssp370'].map((ssp) =>
    setting(
      `allIndustry+renewables+${ssp}`,
      { levers: all([...INDUSTRY, 'renewableElectricity']) },
      {
        ssp: ssp as Options['ssp'],
      },
    ),
  ),
];

/** Query strings decoded as they are, invalid values included. */
export const QUERIES = [
  '',
  'shift=150&rum=abc&basis=fat&ramp=2101&scope=x&ssp=ssp585',
  'fa=50&bf=-1&mm=101&rw=abc&ne=0&ni=100&fe=12.5',
  'fw=50&sl=x&df=100&cc=1e1&af=&bc=33.3&ew=100',
  'ev=50&et=100&fl=x&saf=0.1&cs=200&re=100&cdc=50',
  'ch=50&ci=x&re=100',
  'dc=ssp&pf=on&regrow=natural',
  'dc=x&pf=maybe&regrow=forest',
  '?shift=50&dai=100&with=plantMilk&where=highIncome&ramp=2042&basis=kcal',
  'target=eatLancet&swap=eggs',
  'pop=low',
  'pop=high&base=ssp2',
  'pop=x',
];

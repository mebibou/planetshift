import { ANIMAL_GROUPS } from '../../src/data/types';
import { ENERGY_LEVERS } from '../../src/levers/energy/model';
import { PRACTICES } from '../../src/levers/practices/data';
import type { Levers, Options, Scenario } from '../../src/model/api';
import { BASE_SCENARIO } from '../../src/model/scenarios';

const ALL_PRACTICES: Levers = Object.fromEntries(PRACTICES.map((p) => [p, 1]));
const ALL_ENERGY: Levers = Object.fromEntries(ENERGY_LEVERS.map((id) => [id, 1]));

export interface Sample {
  id: string;
  scenario: Scenario;
  options?: Partial<Options>;
}

const sample = (id: string, changes: Partial<Scenario>, options?: Partial<Options>): Sample => ({
  id,
  scenario: { ...BASE_SCENARIO, ...changes },
  ...(options ? { options } : {}),
});

/** Settings of the controls that cover the model's paths, for the tests that run many. */
export const SAMPLES: Sample[] = [
  sample('none', {}),
  sample('shift10', { shift: 0.1 }),
  sample('shift50', { shift: 0.5 }),
  sample('halveRuminant', { groupShifts: { ruminantMeat: 0.5 } }),
  sample('dairyToPlantMilk', { groupShifts: { dairy: 1 }, replacement: 'plantMilk' }),
  sample('lessFish', { groupShifts: { seafood: 0.5 }, replacement: 'legumes' }),
  sample('plantFoodSwaps', { levers: { rice: 1, palmOil: 1 } }),
  sample('highIncomeShift', { shift: 0.5, where: 'highIncome' }),
  sample('noAnimalFarming', {
    shift: 1,
    groupShifts: Object.fromEntries(ANIMAL_GROUPS.map((g) => [g, 1])),
  }),
  sample('practicesFull', { levers: ALL_PRACTICES }),
  sample('halveWaste', { levers: { foodWaste: 0.5, supplyLosses: 0.5 } }),
  sample('zeroDeforestation', { levers: { deforestation: 1 } }),
  sample('cleanEnergy', { levers: ALL_ENERGY }),
  sample(
    'everything',
    {
      shift: 0.5,
      replacement: 'legumes',
      levers: {
        ...ALL_PRACTICES,
        rice: 0.5,
        palmOil: 0.5,
        foodWaste: 0.5,
        supplyLosses: 0.5,
        deforestation: 1,
        coverCrops: 0.5,
        agroforestry: 0.3,
        biochar: 0.2,
        enhancedWeathering: 0.2,
        ...ALL_ENERGY,
      },
    },
    { regrowth: 'natural' },
  ),
];

export const sampleById = (id: string): Sample => SAMPLES.find((s) => s.id === id) as Sample;

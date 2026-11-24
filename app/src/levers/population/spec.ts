import { option } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_PEOPLE, EMPTY_POPULATION, VARIANTS, type PopulationVariant } from './data';
import { hasPopulation, type WorldPopulation } from './model';

const ID = 'population';

declare module '../../model/api' {
  interface Options {
    population: PopulationVariant;
    /**
     * People on Earth by `peopleYear`, billions: a thought experiment in place of the UN
     * projection. Every human emission follows it.
     */
    people?: number;
    /** The year `people` is reached: the scenario's "All levers fully in place by". */
    peopleYear?: number;
  }
  interface ScenarioResult {
    /** World population for the chart, with the variant chosen; null without the data. */
    population?: WorldPopulation | null;
  }
}

/**
 * The world's population to 2100, one of the UN's projections: a method option, not a lever. It
 * changes the baseline and the scenario alike (through the population baseline's scale), so the
 * warming avoided moves only because the farm emissions the levers act on are larger or smaller.
 */
export const populationSpec: LeverSpec = {
  id: ID,
  levers: [],
  options: [option(ID, 'population', 'pop', VARIANTS)],
  files: [
    { name: 'population', empty: EMPTY_POPULATION },
    { name: 'people', empty: EMPTY_PEOPLE },
  ],
  available: (data) => hasPopulation(data.population),
  ui: {},
  methodology: { coveredBy: 'options' },
};
